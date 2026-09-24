import { useCallback, useEffect, useState } from 'react'
import { parseHash } from '../lib/routes'

/** Route courante déduite du hash de l'URL ; `navigate` alimente l'historique (bouton retour). */
export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigate = useCallback((hash) => {
    if (hash) {
      window.location.hash = hash
    } else {
      // Retire le hash sans laisser de « # » orphelin dans l'URL.
      window.history.pushState(null, '', window.location.pathname + window.location.search)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    }
  }, [])

  return { route, navigate }
}
