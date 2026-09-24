import { useCallback, useEffect, useState } from 'react'
import { ANOMALY_COLUMNS } from '../lib/anomalyColumns'
import { supabase } from '../lib/supabaseClient'

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

/** Erreur d'API portant le code HTTP (401 = mot de passe refusé). */
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function postResolveAnomaly(id, password) {
  const response = await fetch(RESOLVE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Encodé : un en-tête HTTP n'accepte pas tous les caractères (accents, €…).
      'X-Admin-Password': encodeURIComponent(password),
    },
    body: JSON.stringify({ id }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(payload?.error ?? `Erreur serveur (${response.status})`, response.status)
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
   * Marque une anomalie comme résolue via l'API du serveur.
   * Mise à jour optimiste, annulée si l'appel échoue (l'erreur est relancée
   * pour que l'appelant puisse l'afficher).
   */
  const resolveAnomaly = useCallback(async (id, password) => {
    const optimisticResolvedAt = new Date().toISOString()
    const patch = (changes) =>
      setAnomalies((current) => current.map((a) => (a.id === id ? { ...a, ...changes } : a)))

    patch({ resolved: true, resolved_at: optimisticResolvedAt })

    try {
      const updated = await postResolveAnomaly(id, password)
      if (updated) patch(updated)
    } catch (err) {
      patch({ resolved: false, resolved_at: null })
      throw err
    }
  }, [])

  return { anomalies, loading, error, refetch, resolveAnomaly }
}
