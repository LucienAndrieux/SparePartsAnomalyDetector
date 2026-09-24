import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AUTH_ERROR_MESSAGES = {
  invalid_credentials: 'Email ou mot de passe incorrect.',
  email_not_confirmed: 'Adresse email non confirmée.',
  over_request_rate_limit: 'Trop de tentatives, réessayez dans quelques minutes.',
}

/** Session Supabase Auth (email + mot de passe), synchronisée entre onglets. */
export function useAuth() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email, password) => {
    if (!supabase) throw new Error('Configuration Supabase manquante.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(AUTH_ERROR_MESSAGES[error.code] ?? error.message)
  }, [])

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
  }, [])

  return { user: session?.user ?? null, ready, signIn, signOut }
}
