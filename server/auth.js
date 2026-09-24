/** Extrait le jeton de l'en-tête « Authorization: Bearer <jeton> ». */
export function getBearerToken(req) {
  const match = req.get('authorization')?.match(/^Bearer\s+(\S+)$/i)
  return match?.[1] ?? null
}

/**
 * Limite les échecs d'authentification par IP (fenêtre glissante simple, en mémoire).
 * Évite qu'un client envoie des jetons en boucle (chaque essai interroge Supabase Auth).
 * Suffisant pour une instance unique derrière Caddy ; remis à zéro au redémarrage.
 */
export function createFailureLimiter({ maxFailures = 5, windowMs = 15 * 60 * 1000, now = Date.now } = {}) {
  const failures = new Map() // ip → { count, resetAt }

  function entry(ip) {
    const current = failures.get(ip)
    if (current && current.resetAt <= now()) {
      failures.delete(ip)
      return null
    }
    return current ?? null
  }

  return {
    /** Secondes à attendre avant de réessayer, ou 0 si l'IP n'est pas bloquée. */
    retryAfter(ip) {
      const current = entry(ip)
      if (!current || current.count < maxFailures) return 0
      return Math.ceil((current.resetAt - now()) / 1000)
    },
    recordFailure(ip) {
      const current = entry(ip) ?? { count: 0, resetAt: now() + windowMs }
      current.count += 1
      failures.set(ip, current)
    },
    reset(ip) {
      failures.delete(ip)
    },
  }
}
