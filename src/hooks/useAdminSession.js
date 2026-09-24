import { useCallback, useRef, useState } from 'react'

/** Rejet d'une demande de mot de passe annulée par l'utilisateur (pas une erreur à afficher). */
export class PasswordPromptCancelled extends Error {
  constructor() {
    super('Saisie du mot de passe annulée')
    this.name = 'PasswordPromptCancelled'
  }
}

/**
 * Mot de passe administrateur, gardé en mémoire uniquement (jamais dans le
 * stockage du navigateur) : il est perdu au rechargement de la page.
 *
 * `withPassword(action)` exécute `action(password)` en demandant le mot de passe
 * si besoin ; si le serveur le refuse (401), il est oublié et redemandé.
 */
export function useAdminSession() {
  const passwordRef = useRef(null)
  const [unlocked, setUnlocked] = useState(false)
  const [prompt, setPrompt] = useState(null) // { error, resolve, reject } quand la boîte est ouverte
  const pendingPromptRef = useRef(null)

  const askPassword = useCallback((error = null) => {
    // Une seule boîte de dialogue à la fois, même si plusieurs boutons sont cliqués.
    if (pendingPromptRef.current) return pendingPromptRef.current

    const promise = new Promise((resolve, reject) => {
      setPrompt({ error, resolve, reject })
    }).finally(() => {
      pendingPromptRef.current = null
      setPrompt(null)
    })
    pendingPromptRef.current = promise
    return promise
  }, [])

  const forget = useCallback(() => {
    passwordRef.current = null
    setUnlocked(false)
  }, [])

  const withPassword = useCallback(
    async (action) => {
      let error = null
      for (;;) {
        const password = passwordRef.current ?? (await askPassword(error))
        try {
          const result = await action(password)
          passwordRef.current = password
          setUnlocked(true)
          return result
        } catch (err) {
          if (err.status !== 401) throw err
          forget()
          error = 'Mot de passe incorrect.'
        }
      }
    },
    [askPassword, forget],
  )

  const dialog = prompt && {
    error: prompt.error,
    onSubmit: (password) => prompt.resolve(password),
    onCancel: () => prompt.reject(new PasswordPromptCancelled()),
  }

  return { unlocked, withPassword, forget, dialog }
}
