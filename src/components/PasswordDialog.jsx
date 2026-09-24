import { useEffect, useRef, useState } from 'react'

/** Boîte modale native (<dialog>) : focus piégé, Échap pour annuler. */
export default function PasswordDialog({ error, onSubmit, onCancel }) {
  const dialogRef = useRef(null)
  const [password, setPassword] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  function handleSubmit(event) {
    event.preventDefault()
    if (password) onSubmit(password)
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="password-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
    >
      <form onSubmit={handleSubmit}>
        <div className="dialog-header">
          <h2 id="password-dialog-title">Mot de passe administrateur</h2>
          <button type="button" className="icon-button" onClick={onCancel} aria-label="Fermer">
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="m3 3 6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="dialog-hint">
          Requis pour marquer des anomalies comme résolues. Il est conservé jusqu’à la fermeture ou au rechargement de
          la page.
        </p>

        <label className="field">
          <span>Mot de passe</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'password-dialog-error' : undefined}
          />
        </label>

        {error && (
          <p id="password-dialog-error" className="inline-error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions">
          <button type="button" className="button" onClick={onCancel}>
            Annuler
          </button>
          <button type="submit" className="button button-primary">
            Valider
          </button>
        </div>
      </form>
    </dialog>
  )
}
