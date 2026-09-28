import { describe, expect, it, vi } from 'vitest'
import { createResolutionVerifier } from '../verifyResolution.js'

const REQUEST = { anomalyId: 12, rowNumber: 7, anomalyType: 'champ_manquant', fieldName: 'Qty' }

/** Faux fetch : renvoie `status` et `body` (chaîne brute ou objet sérialisé). */
function fakeFetch(status, body) {
  return vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }))
}

describe('createResolutionVerifier', () => {
  it('posts the anomaly to the webhook with the shared secret', async () => {
    const fetch = fakeFetch(200, { confirmed: true })
    const verify = createResolutionVerifier({ url: 'https://n8n.test/webhook/verify-anomaly', secret: 's3cret', fetch })

    expect(await verify(REQUEST)).toEqual({ confirmed: true, message: null })

    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://n8n.test/webhook/verify-anomaly')
    expect(init.method).toBe('POST')
    expect(init.headers['X-Verify-Secret']).toBe('s3cret')
    expect(JSON.parse(init.body)).toEqual({ anomaly_id: 12, row_number: 7, anomaly_type: 'champ_manquant', field_name: 'Qty' })
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('returns the n8n message when the correction is not confirmed', async () => {
    const verify = createResolutionVerifier({ url: 'u', secret: 's', fetch: fakeFetch(200, { confirmed: false, message: 'Pas corrigée.' }) })
    expect(await verify(REQUEST)).toEqual({ confirmed: false, message: 'Pas corrigée.' })
  })

  it.each([
    ['an HTTP error', 500, { confirmed: true }],
    ['a rejected secret', 403, 'Authorization data is wrong!'],
    ['a non-JSON body', 200, '<html>'],
    ['a body without a boolean confirmed', 200, { confirmed: 'yes' }],
  ])('throws on %s', async (_label, status, body) => {
    const verify = createResolutionVerifier({ url: 'u', secret: 's', fetch: fakeFetch(status, body) })
    await expect(verify(REQUEST)).rejects.toThrow()
  })

  it('throws when the webhook does not answer in time', async () => {
    const fetch = vi.fn(
      (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason))),
    )
    const verify = createResolutionVerifier({ url: 'u', secret: 's', timeoutMs: 10, fetch })
    await expect(verify(REQUEST)).rejects.toThrow()
  })
})
