import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { createApp } from './app.js'

// Chemins résolus depuis ce fichier, pas depuis le répertoire courant :
// un service Windows (NSSM) peut démarrer dans un autre dossier.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: resolve(projectRoot, '.env'), quiet: true })

const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD } = process.env
const port = Number(process.env.PORT) || 3000
const host = '127.0.0.1' // seul Caddy, sur la même machine, doit joindre le serveur

if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant : la résolution des anomalies échouera.')
}
if (!ADMIN_PASSWORD) {
  console.warn('ADMIN_PASSWORD manquant : la résolution des anomalies est désactivée.')
}

const supabase =
  VITE_SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null

const app = createApp({
  supabase,
  adminPassword: ADMIN_PASSWORD,
  distDir: resolve(projectRoot, 'dist'),
})

const server = app.listen(port, host, () => {
  console.info(`Dashboard disponible sur http://${host}:${port}`)
})

server.on('error', (error) => {
  console.error(`Impossible d'écouter sur ${host}:${port} :`, error.message)
  process.exit(1)
})

// NSSM arrête le service par Ctrl+C (SIGINT) : on ferme proprement les connexions.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.info(`${signal} reçu, arrêt du serveur…`)
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 5000).unref()
  })
}
