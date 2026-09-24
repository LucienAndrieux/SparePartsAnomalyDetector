import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const configured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * Client de LECTURE : toujours anonyme (rôle `anon`, lecture seule via les GRANT),
 * même quand un utilisateur est connecté. Les lectures ne dépendent donc pas des
 * droits du rôle `authenticated`.
 * Vaut `null` si les variables d'environnement sont absentes, afin que
 * l'UI puisse afficher une erreur explicite plutôt qu'un écran blanc.
 */
export const supabase = configured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'sb-read-only', // distinct du client d'authentification
      },
    })
  : null

/**
 * Client d'AUTHENTIFICATION (Supabase Auth, email + mot de passe) : gère la session,
 * dont le jeton est envoyé à l'API du serveur pour autoriser les écritures.
 * Il n'est jamais utilisé pour lire ou écrire des données.
 */
export const supabaseAuth = configured ? createClient(supabaseUrl, supabaseAnonKey) : null
