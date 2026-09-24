import { createClient } from '@supabase/supabase-js'

/**
 * POST /.netlify/functions/resolve-anomaly  —  body: { id }
 *
 * Marque une anomalie comme résolue. S'exécute côté serveur uniquement :
 * la clé SUPABASE_SERVICE_ROLE_KEY n'est jamais exposée au bundle client.
 */

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    : null

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', Allow: 'POST' },
    })
  }

  if (!supabase) {
    console.error('resolve-anomaly: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant')
    return json(500, { error: 'Configuration serveur incomplète' })
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

  const { data, error } = await supabase
    .from('anomalies')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', id)
    .eq('resolved', false)
    .select()
    .maybeSingle()

  if (error) {
    console.error('resolve-anomaly: échec de la mise à jour', error)
    return json(500, { error: 'Échec de la mise à jour en base' })
  }

  if (!data) {
    // Aucune ligne non résolue avec cet id : inexistante ou déjà résolue.
    const { data: existing } = await supabase
      .from('anomalies')
      .select()
      .eq('id', id)
      .maybeSingle()

    return existing
      ? json(200, { anomaly: existing })
      : json(404, { error: `Anomalie ${id} introuvable` })
  }

  return json(200, { anomaly: data })
}
