import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Client Supabase en lecture seule (clé anon + RLS).
 * Toute écriture passe par l'API du serveur Express (/api/resolve-anomaly).
 * Aucune session utilisateur : les requêtes partent toujours avec le rôle `anon`,
 * même si une ancienne session Supabase traîne dans le navigateur.
 * Vaut `null` si les variables d'environnement sont absentes, afin que
 * l'UI puisse afficher une erreur explicite plutôt qu'un écran blanc.
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    : null
