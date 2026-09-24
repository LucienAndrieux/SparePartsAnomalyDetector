import { createClient } from '@supabase/supabase-js'
import { ANOMALY_COLUMNS } from '../../src/lib/anomalyColumns.js'

/**
 * POST /.netlify/functions/resolve-anomaly  —  body: { id }
 * Header requis : Authorization: Bearer <access token Supabase Auth>
 *
 * Marque une anomalie comme résolue. S'exécute côté serveur uniquement :
 * la clé SUPABASE_SERVICE_ROLE_KEY n'est jamais exposée au bundle client.
 * Seuls les utilisateurs connectés via Supabase Auth sont autorisés.
 */

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null

function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

function getBearerToken(request) {
  const match = request.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)
  return match?.[1] ?? null
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json(405, { error: 'Méthode non autorisée' }, { Allow: 'POST' })
  }

  const token = getBearerToken(request)
  if (!token) {
    return json(401, { error: 'Authentification requise' })
  }

  let id
  try {
    ;({ id } = await request.json())
  } catch {
    return json(400, { error: 'Corps de requête JSON invalide' })
  }

  if (!Number.isInteger(id) || id <= 0) {
    return json(400, { error: 'Le champ "id" doit être un entier positif' })
  }

  if (!supabase) {
    console.error('resolve-anomaly: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant')
    return json(500, { error: 'Configuration serveur incomplète' })
  }

  // Vérifie le JWT auprès de Supabase Auth (signature, expiration, utilisateur existant).
  const { data: auth, error: authError } = await supabase.auth.getUser(token)
  if (authError || !auth?.user) {
    return json(401, { error: 'Session invalide ou expirée, reconnectez-vous' })
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
    return json(500, { error: 'Échec de la mise à jour en base' })
  }

  if (!data) {
    // Aucune ligne non résolue avec cet id : inexistante ou déjà résolue.
    const { data: existing } = await supabase
      .from('anomalies')
      .select(ANOMALY_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    return existing
      ? json(200, { anomaly: existing })
      : json(404, { error: `Anomalie ${id} introuvable` })
  }

  console.info(`resolve-anomaly: anomalie ${id} résolue par ${auth.user.email ?? auth.user.id}`)
  return json(200, { anomaly: data })
}
