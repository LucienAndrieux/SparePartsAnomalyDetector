import { useMemo, useState } from 'react'
import AnomalyTable from './components/AnomalyTable'
import AuthControls from './components/AuthControls'
import FilterBar from './components/FilterBar'
import KpiBar from './components/KpiBar'
import LoginForm from './components/LoginForm'
import { useAnomalies } from './hooks/useAnomalies'
import { useAuth } from './hooks/useAuth'
import { filterAndSortAnomalies } from './lib/anomalies'
import './App.css'

function App() {
  const { anomalies, loading, error, refetch, resolveAnomaly } = useAnomalies()
  const { user, ready: authReady, signIn, signOut } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [sortDirection, setSortDirection] = useState('desc')

  const visibleAnomalies = useMemo(
    () => filterAndSortAnomalies(anomalies, { status, type, sortDirection }),
    [anomalies, status, type, sortDirection],
  )

  const toggleSort = () => setSortDirection((dir) => (dir === 'desc' ? 'asc' : 'desc'))

  async function handleSignIn(email, password) {
    await signIn(email, password)
    setShowLogin(false)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Anomalies pièces détachées</h1>
          <p className="subtitle">Contrôles automatiques des commandes, issus du pipeline n8n</p>
        </div>
        <div className="header-actions">
          <button type="button" className="button-secondary" onClick={refetch} disabled={loading}>
            {loading ? 'Chargement…' : 'Actualiser'}
          </button>
          <AuthControls
            user={user}
            ready={authReady}
            onLoginClick={() => setShowLogin(true)}
            onSignOut={signOut}
          />
        </div>
      </header>

      {showLogin && !user && (
        <LoginForm onSignIn={handleSignIn} onCancel={() => setShowLogin(false)} />
      )}

      <main>
        {error ? (
          <div className="state-message state-error" role="alert">
            <p>
              <strong>Impossible de charger les anomalies.</strong> {error}
            </p>
            <button type="button" className="button-secondary" onClick={refetch}>
              Réessayer
            </button>
          </div>
        ) : loading && anomalies.length === 0 ? (
          <p className="state-message" aria-busy="true">
            Chargement des anomalies…
          </p>
        ) : (
          <>
            <KpiBar anomalies={anomalies} />

            <section className="panel" aria-label="Liste des anomalies">
              <FilterBar
                status={status}
                type={type}
                onStatusChange={setStatus}
                onTypeChange={setType}
                resultCount={visibleAnomalies.length}
              />
              {authReady && !user && (
                <p className="panel-notice">
                  Consultation en lecture seule. Connectez-vous pour marquer des anomalies comme résolues.
                </p>
              )}
              <AnomalyTable
                anomalies={visibleAnomalies}
                sortDirection={sortDirection}
                onToggleSort={toggleSort}
                onResolve={resolveAnomaly}
                canResolve={Boolean(user)}
              />
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default App
