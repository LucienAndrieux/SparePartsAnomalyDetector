import AuthControls from './AuthControls'
import LoginForm from './LoginForm'

const GOOGLE_SHEET_URL = import.meta.env.VITE_GOOGLE_SHEET_URL

function ExternalLinkIcon() {
  return (
    <svg className="button-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg className="button-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Barre du haut : logo (retour à l'accueil), lien Google Sheets, actualisation et connexion. */
export default function TopBar({ loading, onRefresh, auth, showLogin, onToggleLogin, onCloseLogin, onSignIn, onNavigate }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault()
            onNavigate('')
          }}
        >
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Spare Parts Anomaly Detector</span>
        </a>

        <div className="topbar-actions">
          {GOOGLE_SHEET_URL && (
            <a className="button" href={GOOGLE_SHEET_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon />
              Google Sheets
            </a>
          )}
          <button type="button" className="button" onClick={onRefresh} disabled={loading}>
            <RefreshIcon />
            {loading ? 'Chargement…' : 'Actualiser'}
          </button>
          <AuthControls user={auth.user} ready={auth.ready} onLoginClick={onToggleLogin} onSignOut={auth.signOut} />
          {showLogin && !auth.user && <LoginForm onSignIn={onSignIn} onCancel={onCloseLogin} />}
        </div>
      </div>
    </header>
  )
}
