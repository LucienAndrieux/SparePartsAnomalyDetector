import { existsSync } from 'node:fs'
import { join } from 'node:path'
import express from 'express'
import { createResolveAnomalyHandler } from './resolveAnomaly.js'

/**
 * Application Express : API + build Vite statique.
 * Construite par une fonction (dépendances injectées) pour pouvoir être testée.
 */
export function createApp({ supabase, distDir, limiter }) {
  const app = express()
  app.disable('x-powered-by')
  // Caddy tourne sur la même machine : on fait confiance à X-Forwarded-For venant de la boucle locale.
  app.set('trust proxy', 'loopback')

  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
    })
    next()
  })

  // ---------- API ----------
  const api = express.Router()
  api.use(express.json({ limit: '1kb' }))
  api.post('/resolve-anomaly', createResolveAnomalyHandler({ supabase, limiter }))
  api.use((_req, res) => res.status(404).json({ error: 'Route inconnue' }))
  // eslint-disable-next-line no-unused-vars -- Express reconnaît un gestionnaire d'erreurs à ses 4 paramètres
  api.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
      return res.status(400).json({ error: 'Corps de requête JSON invalide' })
    }
    console.error('api: erreur inattendue', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  })
  app.use('/api', api)

  // ---------- Frontend ----------
  const indexHtml = join(distDir, 'index.html')
  if (!existsSync(indexHtml)) {
    console.warn(`Build introuvable dans ${distDir} : lancez « npm run build ».`)
  }

  app.use(
    express.static(distDir, {
      index: false,
      setHeaders(res, filePath) {
        // Les fichiers de /assets ont un hash dans leur nom : cache long possible.
        const isHashedAsset = filePath.includes(`${join(distDir, 'assets')}`)
        res.set('Cache-Control', isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache')
      },
    }),
  )

  // Fallback SPA : toute autre requête GET renvoie index.html.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (!existsSync(indexHtml)) {
      return res.status(503).type('text').send('Build introuvable : lancez « npm run build ».')
    }
    res.set('Cache-Control', 'no-cache')
    return res.sendFile(indexHtml)
  })

  return app
}
