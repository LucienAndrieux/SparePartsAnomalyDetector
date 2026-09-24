import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Client Supabase en lecture seule (clé anon + RLS).
 * Toute écriture passe par les fonctions serverless Netlify.
 * Vaut `null` si les variables d'environnement sont absentes, afin que
 * l'UI puisse afficher une erreur explicite plutôt qu'un écran blanc.
 */
export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null
