import { useState } from 'react'

export default function LoginForm({ onSignIn, onCancel }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

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
    <form className="login-form panel" onSubmit={handleSubmit}>
      <h2>Connexion</h2>
      <p className="login-hint">Réservée aux personnes habilitées à traiter les anomalies.</p>

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
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        <button type="button" className="button-secondary" onClick={onCancel} disabled={pending}>
          Annuler
        </button>
        <button type="submit" className="button-primary" disabled={pending}>
          {pending ? 'Connexion…' : 'Se connecter'}
        </button>
      </div>
    </form>
  )
}
