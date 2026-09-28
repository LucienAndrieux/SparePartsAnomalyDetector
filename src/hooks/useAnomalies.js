import { useCallback, useEffect, useState } from 'react'
import { ANOMALY_COLUMNS } from '../lib/anomalyColumns'
import { supabase, supabaseAuth } from '../lib/supabaseClient'

const RESOLVE_ENDPOINT = '/api/resolve-anomaly'

async function fetchAnomalies() {
  if (!supabase) {
    throw new Error(
      'Configuration Supabase manquante : définissez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.',
    )
  }

  const { data, error } = await supabase
    .from('anomalies')
    .select(ANOMALY_COLUMNS)
    .order('detected_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

async function postResolveAnomaly(id) {
  const { data } = (await supabaseAuth?.auth.getSession()) ?? {}
  const accessToken = data?.session?.access_token
  if (!accessToken) throw new Error('Connectez-vous pour résoudre une anomalie.')

  const response = await fetch(RESOLVE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ id }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(payload?.error ?? `Erreur serveur (${response.status})`)
    // Vérification refusée ou échouée : le serveur renvoie l'état à jour (verification_status).
    error.anomaly = payload?.anomaly
    throw error
  }
  return payload.anomaly
}

export function useAnomalies() {
  const [anomalies, setAnomalies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    fetchAnomalies()
      .then((data) => {
        if (cancelled) return
        setAnomalies(data)
        setError(null)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const refetch = useCallback(() => {
    setLoading(true)
    setReloadKey((key) => key + 1)
  }, [])

  /**
   * Demande la résolution d'une anomalie via l'API du serveur, qui fait d'abord vérifier
   * la correction dans le Google Sheets (plusieurs secondes). Pas de mise à jour optimiste :
   * la vérification peut refuser. En cas de refus, l'erreur est relancée pour que
   * l'appelant affiche le message, après avoir appliqué l'état renvoyé par le serveur.
   */
  const resolveAnomaly = useCallback(async (id) => {
    const patch = (changes) =>
      setAnomalies((current) => current.map((a) => (a.id === id ? { ...a, ...changes } : a)))

    try {
      const updated = await postResolveAnomaly(id)
      if (updated) patch(updated)
    } catch (err) {
      if (err.anomaly) patch(err.anomaly)
      throw err
    }
  }, [])

  return { anomalies, loading, error, refetch, resolveAnomaly }
}
