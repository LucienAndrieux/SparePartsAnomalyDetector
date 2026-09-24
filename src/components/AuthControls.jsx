export default function AuthControls({ user, ready, onLoginClick, onSignOut }) {
  if (!ready) return null

  if (!user) {
    return (
      <button type="button" className="button button-primary" onClick={onLoginClick}>
        Se connecter
      </button>
    )
  }

  return (
    <div className="auth-controls">
      <span className="avatar" aria-hidden="true">
        {user.email?.[0]?.toUpperCase() ?? '?'}
      </span>
      <span className="auth-email" title={user.email}>
        {user.email}
      </span>
      <button type="button" className="button" onClick={onSignOut}>
        Se déconnecter
      </button>
    </div>
  )
}
