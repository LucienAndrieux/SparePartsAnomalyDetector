import { describe, expect, it, vi } from 'vitest'

// Les tests ne touchent jamais la base : les variables d'env sont vidées
// avant l'import, la fonction s'arrête donc avant tout appel Supabase.
vi.stubEnv('SUPABASE_URL', '')
vi.stubEnv('VITE_SUPABASE_URL', '')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')

const { default: handler } = await import('../functions/resolve-anomaly.js')

function post(body, { authorization = 'Bearer fake.jwt.token' } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (authorization) headers.Authorization = authorization
  return handler(
    new Request('http://localhost/.netlify/functions/resolve-anomaly', {
      method: 'POST',
      headers,
      body,
    }),
  )
}

describe('resolve-anomaly', () => {
  it('rejects non-POST methods with 405', async () => {
    const response = await handler(new Request('http://localhost/', { method: 'GET' }))
    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('POST')
  })

  it.each([
    ['missing header', null],
    ['non-bearer scheme', 'Basic dXNlcjpwYXNz'],
    ['empty bearer', 'Bearer '],
  ])('rejects %s with 401 before reading the body', async (_label, authorization) => {
    const response = await post('{"id":1}', { authorization })
    expect(response.status).toBe(401)
  })

  it.each([
    ['malformed JSON', '{id:'],
    ['null body', 'null'],
    ['missing id', '{}'],
    ['string id', '{"id":"12"}'],
    ['negative id', '{"id":-3}'],
    ['decimal id', '{"id":1.5}'],
  ])('rejects %s with 400', async (_label, body) => {
    const response = await post(body)
    expect(response.status).toBe(400)
    expect(await response.json()).toHaveProperty('error')
  })

  it('returns 500 without leaking details when server config is missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await post('{"id":1}')
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Configuration serveur incomplète' })
  })
})
