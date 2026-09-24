import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../app.js'
import { createFailureLimiter, passwordsMatch } from '../auth.js'

const PASSWORD = 'correct horse – battery staple'

/** Faux client Supabase : enregistre l'update et renvoie `result`. */
function fakeSupabase(result) {
  const calls = []
  const builder = {
    update(values) {
      calls.push({ update: values })
      return builder
    },
    select() {
      return builder
    },
    eq(column, value) {
      calls.push({ eq: [column, value] })
      return builder
    },
    maybeSingle: async () => result,
  }
  return { client: { from: () => builder }, calls }
}

let distDir
let server
let baseUrl
let supabase
let limiter

async function start(options) {
  if (server) await new Promise((resolve) => server.close(resolve))
  const app = createApp({ distDir, adminPassword: PASSWORD, supabase: supabase.client, limiter, ...options })
  server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
}

function resolveRequest(body, password = PASSWORD) {
  const headers = { 'Content-Type': 'application/json' }
  if (password !== null) headers['X-Admin-Password'] = encodeURIComponent(password)
  return fetch(`${baseUrl}/api/resolve-anomaly`, { method: 'POST', headers, body })
}

beforeAll(() => {
  distDir = mkdtempSync(join(tmpdir(), 'dashboard-dist-'))
  mkdirSync(join(distDir, 'assets'))
  writeFileSync(join(distDir, 'index.html'), '<!doctype html><title>Dashboard</title>')
  writeFileSync(join(distDir, 'assets', 'app-abc123.js'), 'console.log(1)')
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

beforeEach(async () => {
  supabase = fakeSupabase({ data: { id: 1, resolved: true }, error: null })
  limiter = createFailureLimiter()
  await start()
})

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
  rmSync(distDir, { recursive: true, force: true })
})

describe('passwordsMatch', () => {
  it('accepts the exact password only', () => {
    expect(passwordsMatch('secret', 'secret')).toBe(true)
    expect(passwordsMatch('Secret', 'secret')).toBe(false)
    expect(passwordsMatch('secret ', 'secret')).toBe(false)
    expect(passwordsMatch('', 'secret')).toBe(false)
    expect(passwordsMatch(null, 'secret')).toBe(false)
  })

  it('never matches when no password is configured', () => {
    expect(passwordsMatch('', '')).toBe(false)
    expect(passwordsMatch('x', undefined)).toBe(false)
  })
})

describe('POST /api/resolve-anomaly', () => {
  it('resolves the anomaly with the right password', async () => {
    const response = await resolveRequest('{"id":1}')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ anomaly: { id: 1, resolved: true } })
    expect(supabase.calls[0].update.resolved).toBe(true)
    expect(supabase.calls).toContainEqual({ eq: ['id', 1] })
  })

  it('supports non-ASCII passwords', async () => {
    await start({ adminPassword: 'pièce-détachée€' })
    expect((await resolveRequest('{"id":1}', 'pièce-détachée€')).status).toBe(200)
  })

  it.each([
    ['missing', null],
    ['wrong', 'nope'],
  ])('rejects a %s password with 401 without touching the database', async (_label, password) => {
    const response = await resolveRequest('{"id":1}', password)
    expect(response.status).toBe(401)
    expect(supabase.calls).toEqual([])
  })

  it('blocks an IP after repeated failures', async () => {
    for (let i = 0; i < 5; i += 1) await resolveRequest('{"id":1}', 'nope')
    const response = await resolveRequest('{"id":1}')
    expect(response.status).toBe(429)
    expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0)
  })

  it('fails closed when ADMIN_PASSWORD is not configured', async () => {
    await start({ adminPassword: undefined })
    const response = await resolveRequest('{"id":1}', '')
    expect(response.status).toBe(500)
    expect(supabase.calls).toEqual([])
  })

  it.each([
    ['malformed JSON', '{id:'],
    ['missing id', '{}'],
    ['string id', '{"id":"12"}'],
    ['negative id', '{"id":-3}'],
    ['decimal id', '{"id":1.5}'],
  ])('rejects %s with 400', async (_label, body) => {
    const response = await resolveRequest(body)
    expect(response.status).toBe(400)
    expect(await response.json()).toHaveProperty('error')
  })

  it('returns 404 for an unknown anomaly', async () => {
    supabase = fakeSupabase({ data: null, error: null })
    await start()
    expect((await resolveRequest('{"id":999}')).status).toBe(404)
  })

  it('returns 500 without leaking database errors', async () => {
    supabase = fakeSupabase({ data: null, error: { message: 'secret internals' } })
    await start()
    const response = await resolveRequest('{"id":1}')
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('secret internals')
  })

  it('only accepts POST', async () => {
    const response = await fetch(`${baseUrl}/api/resolve-anomaly`)
    expect(response.status).toBe(404)
  })
})

describe('static frontend', () => {
  it('serves index.html at the root and as SPA fallback', async () => {
    for (const path of ['/', '/some/deep/link']) {
      const response = await fetch(`${baseUrl}${path}`)
      expect(response.status).toBe(200)
      expect(await response.text()).toContain('<title>Dashboard</title>')
      expect(response.headers.get('cache-control')).toBe('no-cache')
    }
  })

  it('serves hashed assets with a long cache', async () => {
    const response = await fetch(`${baseUrl}/assets/app-abc123.js`)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('immutable')
  })

  it('does not expose the server stack', async () => {
    const response = await fetch(`${baseUrl}/`)
    expect(response.headers.get('x-powered-by')).toBeNull()
  })

  it('returns JSON 404 for unknown API routes', async () => {
    const response = await fetch(`${baseUrl}/api/unknown`)
    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toContain('application/json')
  })
})
