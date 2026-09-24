import { useMemo, useState } from 'react'
import AnomalyTable from './components/AnomalyTable'
import FilterBar from './components/FilterBar'
import KpiBar from './components/KpiBar'
import { useAnomalies } from './hooks/useAnomalies'
import { filterAndSortAnomalies } from './lib/anomalies'
import './App.css'

function App() {
  const { anomalies, loading, error, refetch, resolveAnomaly } = useAnomalies()
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [sortDirection, setSortDirection] = useState('desc')

  const visibleAnomalies = useMemo(
    () => filterAndSortAnomalies(anomalies, { status, type, sortDirection }),
    [anomalies, status, type, sortDirection],
  )

  const toggleSort = () => setSortDirection((dir) => (dir === 'desc' ? 'asc' : 'desc'))

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Anomalies pièces détachées</h1>
          <p className="subtitle">Contrôles automatiques des commandes, issus du pipeline n8n</p>
        </div>
        <button type="button" className="button-secondary" onClick={refetch} disabled={loading}>
          {loading ? 'Chargement…' : 'Actualiser'}
        </button>
      </header>

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
              <AnomalyTable
                anomalies={visibleAnomalies}
                sortDirection={sortDirection}
                onToggleSort={toggleSort}
                onResolve={resolveAnomaly}
              />
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default App
