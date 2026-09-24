import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const RESOLVE_ENDPOINT = '/.netlify/functions/resolve-anomaly'

async function fetchAnomalies() {
  if (!supabase) {
    throw new Error(
      'Configuration Supabase manquante : définissez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.',
    )
  }

  const { data, error } = await supabase
    .from('anomalies')
    .select('*')
    .order('detected_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

async function postResolveAnomaly(id) {
  const response = await fetch(RESOLVE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error ?? `Erreur serveur (${response.status})`)
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
   * Marque une anomalie comme résolue via la fonction serverless.
   * Mise à jour optimiste, annulée si l'appel échoue (l'erreur est relancée
   * pour que l'appelant puisse l'afficher).
   */
  const resolveAnomaly = useCallback(async (id) => {
    const optimisticResolvedAt = new Date().toISOString()
    const patch = (changes) =>
      setAnomalies((current) => current.map((a) => (a.id === id ? { ...a, ...changes } : a)))

    patch({ resolved: true, resolved_at: optimisticResolvedAt })

    try {
      const updated = await postResolveAnomaly(id)
      if (updated) patch(updated)
    } catch (err) {
      patch({ resolved: false, resolved_at: null })
      throw err
    }
  }, [])

  return { anomalies, loading, error, refetch, resolveAnomaly }
}
