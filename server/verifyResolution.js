/**
 * Client du webhook n8n « Verify Anomaly Resolution ».
 *
 * n8n relit la ligne dans le Google Sheets, la fait ré-analyser par le LLM, puis écrit
 * lui-même le résultat dans Supabase (resolved, verification_status…) avant de répondre.
 * Renvoie { confirmed, message } ; lève une erreur si la vérification n'a pas abouti
 * (réseau, timeout, réponse inattendue).
 */
export function createResolutionVerifier({ url, secret, timeoutMs = 60_000, fetch = globalThis.fetch }) {
  return async function verifyResolution({ anomalyId, rowNumber, anomalyType, fieldName }) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Verify-Secret': secret },
      body: JSON.stringify({
        anomaly_id: anomalyId,
        row_number: rowNumber,
        anomaly_type: anomalyType,
        field_name: fieldName,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok || typeof payload?.confirmed !== 'boolean') {
      throw new Error(`Réponse inattendue du webhook de vérification (HTTP ${response.status})`)
    }

    return { confirmed: payload.confirmed, message: payload.message ?? null }
  }
}
