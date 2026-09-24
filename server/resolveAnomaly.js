import { ANOMALY_COLUMNS } from '../src/lib/anomalyColumns.js'
import { createFailureLimiter, passwordsMatch } from './auth.js'

export const PASSWORD_HEADER = 'x-admin-password'

/**
 * POST /api/resolve-anomaly  —  body: { id }
 * En-tête requis : X-Admin-Password (encodé avec encodeURIComponent côté client,
 * les en-têtes HTTP n'acceptant pas tous les caractères).
 *
 * Marque une anomalie comme résolue avec la clé service_role, qui ne quitte jamais le serveur.
 */
export function createResolveAnomalyHandler({ supabase, adminPassword, limiter = createFailureLimiter() }) {
  return async function resolveAnomaly(req, res) {
    // Fail closed : sans mot de passe configuré, aucune écriture n'est possible.
    if (!adminPassword) {
      console.error('resolve-anomaly: ADMIN_PASSWORD manquant')
      return res.status(500).json({ error: 'Configuration serveur incomplète' })
    }

    const retryAfter = limiter.retryAfter(req.ip)
    if (retryAfter > 0) {
      res.set('Retry-After', String(retryAfter))
      return res.status(429).json({ error: 'Trop de tentatives, réessayez plus tard.' })
    }

    let givenPassword
    try {
      givenPassword = decodeURIComponent(req.get(PASSWORD_HEADER) ?? '')
    } catch {
      givenPassword = null // encodage invalide
    }

    if (!passwordsMatch(givenPassword, adminPassword)) {
      limiter.recordFailure(req.ip)
      return res.status(401).json({ error: 'Mot de passe incorrect' })
    }
    limiter.reset(req.ip)

    const id = req.body?.id
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Le champ "id" doit être un entier positif' })
    }

    if (!supabase) {
      console.error('resolve-anomaly: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant')
      return res.status(500).json({ error: 'Configuration serveur incomplète' })
    }

    const { data, error } = await supabase
      .from('anomalies')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id)
      .eq('resolved', false)
      .select(ANOMALY_COLUMNS)
      .maybeSingle()

    if (error) {
      console.error('resolve-anomaly: échec de la mise à jour', error)
      return res.status(500).json({ error: 'Échec de la mise à jour en base' })
    }

    if (!data) {
      // Aucune ligne non résolue avec cet id : inexistante ou déjà résolue.
      const { data: existing } = await supabase.from('anomalies').select(ANOMALY_COLUMNS).eq('id', id).maybeSingle()
      return existing
        ? res.json({ anomaly: existing })
        : res.status(404).json({ error: `Anomalie ${id} introuvable` })
    }

    console.info(`resolve-anomaly: anomalie ${id} résolue (${req.ip})`)
    return res.json({ anomaly: data })
  }
}
