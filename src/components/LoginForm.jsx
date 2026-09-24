import { useEffect, useState } from 'react'

export default function LoginForm({ onSignIn, onCancel }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  async function handleSubmit(event) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await onSignIn(email.trim(), password)
    } catch (err) {
      setError(err.message)
      setPending(false)
    }
  }

  return (
    <form className="popover login-form" onSubmit={handleSubmit} aria-labelledby="login-title">
      <div className="popover-header">
        <h2 id="login-title">Connexion</h2>
        <button type="button" className="icon-button" onClick={onCancel} aria-label="Fermer">
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="m3 3 6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <p className="popover-hint">Réservée aux personnes habilitées à traiter les anomalies.</p>

      <label className="field">
        <span>Email</span>
        <input
          type="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className="field">
        <span>Mot de passe</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="button button-primary login-submit" disabled={pending}>
        {pending ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  )
}
