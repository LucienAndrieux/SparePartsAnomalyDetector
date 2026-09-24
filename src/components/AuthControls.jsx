export default function AuthControls({ user, ready, onLoginClick, onSignOut }) {
  if (!ready) return null

  if (!user) {
    return (
      <button type="button" className="button-secondary" onClick={onLoginClick}>
        Se connecter
      </button>
    )
  }

  return (
    <div className="auth-controls">
      <span className="auth-email" title={user.email}>
        {user.email}
      </span>
      <button type="button" className="button-secondary" onClick={onSignOut}>
        Se déconnecter
      </button>
    </div>
  )
}
