import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../app.js'
import { createFailureLimiter } from '../auth.js'

const VALID_TOKEN = 'valid.jwt.token'

/**
 * Faux client Supabase : n'accepte que VALID_TOKEN, enregistre les appels et renvoie
 * `results` dans l'ordre des lectures (le dernier est répété).
 */
function fakeSupabase(...results) {
  const calls = []
  let reads = 0
  const builder = {
    update(values) {
      calls.push({ update: values })
      return builder
    },
    select(columns) {
      calls.push({ select: columns })
      return builder
    },
    eq(column, value) {
      calls.push({ eq: [column, value] })
      return builder
    },
    maybeSingle: async () => results[Math.min(reads++, results.length - 1)],
  }
  const auth = {
    getUser: async (token) =>
      token === VALID_TOKEN
        ? { data: { user: { id: 'u1', email: 'admin@example.com' } }, error: null }
        : { data: { user: null }, error: { message: 'invalid JWT' } },
  }
  return { client: { from: () => builder, auth }, calls }
}

const PENDING = { data: { id: 1, anomaly_type: 'champ_manquant', field_name: 'Qty', resolved: false, _row_number: 7 }, error: null }
const RESOLVED = { data: { id: 1, resolved: true, verification_status: 'confirmed' }, error: null }
const NOT_CORRECTED = { data: { id: 1, resolved: false, verification_status: 'not_corrected' }, error: null }

/** Faux webhook n8n : renvoie `verdict` (ou lève `verdict` si c'est une Error) et garde les appels. */
function fakeVerifier(verdict) {
  return vi.fn(async () => {
    if (verdict instanceof Error) throw verdict
    return verdict
  })
}

let distDir
let server
let baseUrl
let supabase
let verifyResolution
let limiter

async function start(options) {
  if (server) await new Promise((resolve) => server.close(resolve))
  const app = createApp({ distDir, supabase: supabase.client, verifyResolution, limiter, ...options })
  server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
}

function resolveRequest(body, authorization = `Bearer ${VALID_TOKEN}`) {
  const headers = { 'Content-Type': 'application/json' }
  if (authorization !== null) headers.Authorization = authorization
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
  supabase = fakeSupabase(PENDING, RESOLVED)
  verifyResolution = fakeVerifier({ confirmed: true, message: null })
  limiter = createFailureLimiter()
  await start()
})

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
  rmSync(distDir, { recursive: true, force: true })
})

describe('POST /api/resolve-anomaly', () => {
  it('resolves the anomaly once n8n confirms the correction', async () => {
    const response = await resolveRequest('{"id":1}')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ anomaly: RESOLVED.data })
    expect(verifyResolution).toHaveBeenCalledWith({
      anomalyId: 1,
      rowNumber: 7,
      anomalyType: 'champ_manquant',
      fieldName: 'Qty',
    })
    expect(supabase.calls).toContainEqual({ eq: ['id', 1] })
  })

  it('never writes to the database itself (n8n does)', async () => {
    await resolveRequest('{"id":1}')
    expect(supabase.calls.some((call) => call.update)).toBe(false)
  })

  it('does not return the technical _row_number column', async () => {
    supabase = fakeSupabase({ data: { ...PENDING.data, resolved: true } })
    await start()
    const body = await (await resolveRequest('{"id":1}')).json()
    expect(body.anomaly).not.toHaveProperty('_row_number')
  })

  it('returns 409 with the n8n message and the updated anomaly when not corrected', async () => {
    supabase = fakeSupabase(PENDING, NOT_CORRECTED)
    verifyResolution = fakeVerifier({ confirmed: false, message: 'Pas encore corrigée.' })
    await start()
    const response = await resolveRequest('{"id":1}')
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'Pas encore corrigée.', anomaly: NOT_CORRECTED.data })
  })

  it('returns 502 without leaking details when the verification fails', async () => {
    verifyResolution = fakeVerifier(new Error('connect ECONNREFUSED secret-host'))
    await start()
    const response = await resolveRequest('{"id":1}')
    expect(response.status).toBe(502)
    const text = await response.text()
    expect(text).toContain('vérification')
    expect(text).not.toContain('secret-host')
  })

  it('returns an already resolved anomaly without calling n8n', async () => {
    supabase = fakeSupabase(RESOLVED)
    await start()
    const response = await resolveRequest('{"id":1}')
    expect(response.status).toBe(200)
    expect(verifyResolution).not.toHaveBeenCalled()
  })

  it('returns 422 when the anomaly has no sheet row number', async () => {
    supabase = fakeSupabase({ data: { ...PENDING.data, _row_number: null }, error: null })
    await start()
    expect((await resolveRequest('{"id":1}')).status).toBe(422)
    expect(verifyResolution).not.toHaveBeenCalled()
  })

  it.each([
    ['missing header', null],
    ['non-bearer scheme', 'Basic dXNlcjpwYXNz'],
    ['empty bearer', 'Bearer '],
    ['invalid token', 'Bearer forged.jwt.token'],
  ])('rejects a %s with 401 without touching the database', async (_label, authorization) => {
    const response = await resolveRequest('{"id":1}', authorization)
    expect(response.status).toBe(401)
    expect(supabase.calls).toEqual([])
  })

  it('blocks an IP after repeated invalid tokens', async () => {
    for (let i = 0; i < 5; i += 1) await resolveRequest('{"id":1}', 'Bearer forged')
    const response = await resolveRequest('{"id":1}')
    expect(response.status).toBe(429)
    expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0)
  })

  it.each([
    ['Supabase', { supabase: null }],
    ['n8n webhook', { verifyResolution: null }],
  ])('returns 500 when the server has no %s configuration', async (_label, options) => {
    await start(options)
    expect((await resolveRequest('{"id":1}')).status).toBe(500)
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
    expect(verifyResolution).not.toHaveBeenCalled()
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
