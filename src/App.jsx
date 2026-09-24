import { useCallback, useMemo, useState } from 'react'
import AnomalyTable from './components/AnomalyTable'
import { ResponsibleTag } from './components/Badges'
import FilterBar from './components/FilterBar'
import GroupTable from './components/GroupTable'
import KpiBar from './components/KpiBar'
import PasswordDialog from './components/PasswordDialog'
import ViewSwitcher from './components/ViewSwitcher'
import { useAnomalies } from './hooks/useAnomalies'
import { useAdminSession } from './hooks/useAdminSession'
import { useHashRoute } from './hooks/useHashRoute'
import {
  filterAndSortAnomalies,
  getResponsibleLabel,
  groupAnomaliesByJob,
  groupAnomaliesByResponsible,
  listResponsibles,
} from './lib/anomalies'
import { jobHref, responsibleHref } from './lib/routes'
import JobPage from './pages/JobPage'
import ResponsiblePage from './pages/ResponsiblePage'
import './App.css'

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`

const DEFAULT_FILTERS = { status: 'all', type: 'all', responsible: 'all', sortDirection: 'desc' }

function App() {
  const { anomalies, loading, error, refetch, resolveAnomaly } = useAnomalies()
  const admin = useAdminSession()
  const { route, navigate } = useHashRoute()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const responsibleOptions = useMemo(() => listResponsibles(anomalies), [anomalies])
  const visibleAnomalies = useMemo(() => filterAndSortAnomalies(anomalies, filters), [anomalies, filters])

  const updateFilters = useCallback((changes) => setFilters((current) => ({ ...current, ...changes })), [])
  const toggleSort = useCallback(
    () =>
      setFilters((current) => ({
        ...current,
        sortDirection: current.sortDirection === 'desc' ? 'asc' : 'desc',
      })),
    [],
  )
  const { withPassword } = admin
  const resolveWithPassword = useCallback(
    (id) => withPassword((password) => resolveAnomaly(id, password)),
    [withPassword, resolveAnomaly],
  )

  const tableProps = { onToggleSort: toggleSort, onResolve: resolveWithPassword }
  function renderOverview() {
    const view = route.name

    let content
    let resultLabel = (count) => plural(count, 'anomalie')

    if (view === 'jobs') {
      const groups = groupAnomaliesByJob(visibleAnomalies)
      resultLabel = (count) => `${plural(groups.length, 'job')} · ${plural(count, 'anomalie')}`
      content = (
        <GroupTable
          groups={groups}
          titleHeader="Job"
          renderTitle={(group) => (
            <span className="group-title">
              Job <span className="mono">{group.jobId}</span>
            </span>
          )}
          hrefFor={(group) => jobHref(group.jobId)}
          extraColumns={[
            {
              header: 'Responsable',
              render: (group) => (
                <div className="stat-tags">
                  {group.responsibles.map((key) => (
                    <ResponsibleTag key={key} responsible={key} />
                  ))}
                </div>
              ),
            },
          ]}
          emptyMessage="Aucun job ne correspond aux filtres sélectionnés."
        />
      )
    } else if (view === 'responsibles') {
      const groups = groupAnomaliesByResponsible(visibleAnomalies)
      resultLabel = (count) => `${plural(groups.length, 'responsable')} · ${plural(count, 'anomalie')}`
      content = (
        <GroupTable
          groups={groups}
          titleHeader="Responsable"
          renderTitle={(group) => <span className="group-title">{getResponsibleLabel(group.responsible)}</span>}
          hrefFor={(group) => responsibleHref(group.responsible)}
          extraColumns={[{ header: 'Jobs concernés', render: (group) => group.jobCount }]}
          emptyMessage="Aucun responsable ne correspond aux filtres sélectionnés."
        />
      )
    } else {
      content = (
        <AnomalyTable anomalies={visibleAnomalies} sortDirection={filters.sortDirection} {...tableProps} />
      )
    }

    return (
      <>
        <KpiBar anomalies={anomalies} />

        <section className="section" aria-labelledby="details-title">
          <h2 id="details-title" className="section-title">
            Détail
          </h2>

          <ViewSwitcher current={view} onNavigate={navigate} />

          <FilterBar
            filters={filters}
            onChange={updateFilters}
            responsibleOptions={responsibleOptions}
            resultCount={visibleAnomalies.length}
            resultLabel={resultLabel}
          />

          {content}
        </section>
      </>
    )
  }

  function renderContent() {
    if (error) {
      return (
        <div className="callout" role="alert">
          <svg className="callout-icon" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 4.8v3.6M8 10.9v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <div>
            <p className="callout-title">Impossible de charger les anomalies</p>
            <p className="callout-body">{error}</p>
          </div>
          <button type="button" className="button" onClick={refetch}>
            Réessayer
          </button>
        </div>
      )
    }

    if (loading && anomalies.length === 0) {
      return (
        <p className="state-message" aria-busy="true">
          Chargement des anomalies…
        </p>
      )
    }

    const pageProps = { anomalies, filters, onFiltersChange: updateFilters, tableProps, onNavigate: navigate }

    if (route.name === 'job') {
      return <JobPage jobId={route.id} responsibleOptions={responsibleOptions} {...pageProps} />
    }
    if (route.name === 'responsible') {
      return <ResponsiblePage responsibleKey={route.id} {...pageProps} />
    }
    return renderOverview()
  }

  const isDetailPage = route.name === 'job' || route.name === 'responsible'

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <a
            className="brand"
            href="#"
            onClick={(event) => {
              event.preventDefault()
              navigate('')
            }}
          >
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-name">Spare Parts Anomaly Detector</span>
          </a>

          <div className="topbar-actions">
            <button type="button" className="button" onClick={refetch} disabled={loading}>
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
              {loading ? 'Chargement…' : 'Actualiser'}
            </button>
            {admin.unlocked && (
              <button
                type="button"
                className="button"
                onClick={admin.forget}
                title="Oublier le mot de passe administrateur"
              >
                <svg className="button-icon" viewBox="0 0 16 16" aria-hidden="true">
                  <rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                Verrouiller
              </button>
            )}
          </div>
        </div>
      </header>

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

      {admin.dialog && <PasswordDialog {...admin.dialog} />}
    </>
  )
}

export default App
