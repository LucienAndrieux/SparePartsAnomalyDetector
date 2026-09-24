import { useCallback, useMemo, useState } from 'react'
import TopBar from './components/TopBar'
import { useAnomalies } from './hooks/useAnomalies'
import { useAuth } from './hooks/useAuth'
import { useHashRoute } from './hooks/useHashRoute'
import { listResponsibles } from './lib/anomalies'
import JobPage from './pages/JobPage'
import OverviewPage from './pages/OverviewPage'
import ResponsiblePage from './pages/ResponsiblePage'
import './App.css'

const DEFAULT_FILTERS = { status: 'all', type: 'all', responsible: 'all', sortDirection: 'desc' }

function LoadError({ message, onRetry }) {
  return (
    <div className="callout" role="alert">
      <svg className="callout-icon" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 4.8v3.6M8 10.9v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <div>
        <p className="callout-title">Impossible de charger les anomalies</p>
        <p className="callout-body">{message}</p>
      </div>
      <button type="button" className="button" onClick={onRetry}>
        Réessayer
      </button>
    </div>
  )
}

function App() {
  const { anomalies, loading, error, refetch, resolveAnomaly } = useAnomalies()
  const auth = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const { route, navigate } = useHashRoute()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const responsibleOptions = useMemo(() => listResponsibles(anomalies), [anomalies])

  const updateFilters = useCallback((changes) => setFilters((current) => ({ ...current, ...changes })), [])
  const toggleSort = useCallback(
    () =>
      setFilters((current) => ({
        ...current,
        sortDirection: current.sortDirection === 'desc' ? 'asc' : 'desc',
      })),
    [],
  )
  const closeLogin = useCallback(() => setShowLogin(false), [])

  async function handleSignIn(email, password) {
    await auth.signIn(email, password)
    setShowLogin(false)
  }

  const readOnlyNotice =
    auth.ready && !auth.user ? (
      <p className="notice">
        Consultation en lecture seule.{' '}
        <button type="button" className="link-button" onClick={() => setShowLogin(true)}>
          Connectez-vous
        </button>{' '}
        pour marquer des anomalies comme résolues.
      </p>
    ) : null

  const isDetailPage = route.name === 'job' || route.name === 'responsible'

  function renderContent() {
    if (error) return <LoadError message={error} onRetry={refetch} />

    if (loading && anomalies.length === 0) {
      return (
        <p className="state-message" aria-busy="true">
          Chargement des anomalies…
        </p>
      )
    }

    const pageProps = {
      anomalies,
      filters,
      onFiltersChange: updateFilters,
      tableProps: { onToggleSort: toggleSort, onResolve: resolveAnomaly, canResolve: Boolean(auth.user) },
      notice: readOnlyNotice,
      onNavigate: navigate,
    }

    if (route.name === 'job') {
      return <JobPage key={route.id} jobId={route.id} {...pageProps} />
    }
    if (route.name === 'responsible') {
      return <ResponsiblePage responsibleKey={route.id} {...pageProps} />
    }
    return <OverviewPage view={route.name} responsibleOptions={responsibleOptions} {...pageProps} />
  }

  return (
    <>
      <TopBar
        loading={loading}
        onRefresh={refetch}
        auth={auth}
        showLogin={showLogin}
        onToggleLogin={() => setShowLogin((open) => !open)}
        onCloseLogin={closeLogin}
        onSignIn={handleSignIn}
        onNavigate={navigate}
      />

      <div className="page">
        {!isDetailPage && (
          <div className="page-header">
            <h1>Anomalies</h1>
            <p className="page-subtitle">
              Contrôles automatiques des commandes de pièces détachées, issus du pipeline n8n.
            </p>
          </div>
        )}

        <main>{renderContent()}</main>
      </div>
    </>
  )
}

export default App
