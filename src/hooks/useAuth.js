import { useCallback, useEffect, useState } from 'react'
import { supabaseAuth } from '../lib/supabaseClient'

const AUTH_ERROR_MESSAGES = {
  invalid_credentials: 'Email ou mot de passe incorrect.',
  email_not_confirmed: 'Adresse email non confirmée.',
  over_request_rate_limit: 'Trop de tentatives, réessayez dans quelques minutes.',
}

/** Session Supabase Auth (email + mot de passe), conservée et synchronisée entre onglets. */
export function useAuth() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!supabaseAuth)

  useEffect(() => {
    if (!supabaseAuth) return

    supabaseAuth.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })

    const { data } = supabaseAuth.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email, password) => {
    if (!supabaseAuth) throw new Error('Configuration Supabase manquante.')
    const { error } = await supabaseAuth.auth.signInWithPassword({ email, password })
    if (error) throw new Error(AUTH_ERROR_MESSAGES[error.code] ?? error.message)
  }, [])

  const signOut = useCallback(async () => {
    await supabaseAuth?.auth.signOut()
  }, [])

  return { user: session?.user ?? null, ready, signIn, signOut }
}
