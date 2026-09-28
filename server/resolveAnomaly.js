import { ANOMALY_COLUMNS } from '../src/lib/anomalyColumns.js'
import { createFailureLimiter, getBearerToken } from './auth.js'

const VERIFICATION_FAILED_MESSAGE = "La vérification n'a pas pu aboutir. Réessayez dans quelques instants."

/**
 * POST /api/resolve-anomaly  —  body: { id }
 * En-tête requis : Authorization: Bearer <access token Supabase Auth>
 *
 * Réservé aux utilisateurs connectés (comptes créés dans Supabase Auth).
 * Ne marque pas l'anomalie résolue directement : le webhook n8n vérifie d'abord que la
 * ligne a été corrigée dans le Google Sheets, et écrit lui-même le résultat en base.
 * Réponses : 200 { anomaly } si confirmé, 409 { error, anomaly } si la ligne n'est pas
 * corrigée, 502 { error, anomaly? } si la vérification n'a pas abouti.
 */
export function createResolveAnomalyHandler({ supabase, verifyResolution, limiter = createFailureLimiter() }) {
  async function fetchAnomaly(id, columns = ANOMALY_COLUMNS) {
    return supabase.from('anomalies').select(columns).eq('id', id).maybeSingle()
  }

  return async function resolveAnomaly(req, res) {
    const token = getBearerToken(req)
    if (!token) {
      return res.status(401).json({ error: 'Authentification requise' })
    }

    const retryAfter = limiter.retryAfter(req.ip)
    if (retryAfter > 0) {
      res.set('Retry-After', String(retryAfter))
      return res.status(429).json({ error: 'Trop de tentatives, réessayez plus tard.' })
    }

    if (!supabase || !verifyResolution) {
      console.error('resolve-anomaly: configuration Supabase ou webhook n8n manquante')
      return res.status(500).json({ error: 'Configuration serveur incomplète' })
    }

    // Vérifie le jeton auprès de Supabase Auth (signature, expiration, utilisateur existant).
    const { data: auth, error: authError } = await supabase.auth.getUser(token)
    if (authError || !auth?.user) {
      limiter.recordFailure(req.ip)
      return res.status(401).json({ error: 'Session invalide ou expirée, reconnectez-vous' })
    }
    limiter.reset(req.ip)

    const id = req.body?.id
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Le champ "id" doit être un entier positif' })
    }

    // _row_number n'est lisible qu'avec la clé service_role : il ne sort jamais du serveur.
    const { data: current, error } = await fetchAnomaly(id, `${ANOMALY_COLUMNS},_row_number`)
    if (error) {
      console.error('resolve-anomaly: échec de la lecture', error)
      return res.status(500).json({ error: 'Échec de la lecture en base' })
    }
    if (!current) {
      return res.status(404).json({ error: `Anomalie ${id} introuvable` })
    }

    const { _row_number: rowNumber, ...anomaly } = current
    if (anomaly.resolved) {
      return res.json({ anomaly })
    }
    if (!Number.isInteger(rowNumber)) {
      return res.status(422).json({ error: 'Ligne du Google Sheets inconnue pour cette anomalie' })
    }

    let verdict
    try {
      verdict = await verifyResolution({
        anomalyId: id,
        rowNumber,
        anomalyType: anomaly.anomaly_type,
        fieldName: anomaly.field_name,
      })
    } catch (verifyError) {
      console.error(`resolve-anomaly: vérification de l'anomalie ${id} impossible`, verifyError)
      // n8n a pu enregistrer verification_failed avant l'échec : on renvoie l'état à jour si possible.
      const { data: latest } = await fetchAnomaly(id)
      return res.status(502).json({ error: VERIFICATION_FAILED_MESSAGE, anomaly: latest ?? undefined })
    }

    const { data: updated } = await fetchAnomaly(id)
    const user = auth.user.email ?? auth.user.id

    if (!verdict.confirmed) {
      console.info(`resolve-anomaly: anomalie ${id} non confirmée pour ${user}`)
      return res.status(409).json({
        error: verdict.message ?? "La ligne n'a pas encore été corrigée dans le Google Sheets.",
        anomaly: updated ?? undefined,
      })
    }

    console.info(`resolve-anomaly: anomalie ${id} résolue (vérifiée) par ${user}`)
    return res.json({ anomaly: updated ?? { ...anomaly, resolved: true } })
  }
}
