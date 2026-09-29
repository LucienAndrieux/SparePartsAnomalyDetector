import { useMemo, useState } from 'react'
import { useScrolledPast } from '../hooks/useScrolledPast'
import { filterAndSortAnomalies, formatDateTime } from '../lib/anomalies'
import AnomalyTable from './AnomalyTable'
import FilterBar from './FilterBar'
import ResolutionMeter from './ResolutionMeter'
import Stat from './Stat'

const TOPBAR_HEIGHT = 56 // doit rester égal à --topbar-height (App.css)

function BackLink({ href, label, onNavigate }) {
  return (
    <a
      className="back-link"
      href={href}
      onClick={(event) => {
        event.preventDefault()
        onNavigate(href)
      }}
    >
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <path d="M7.5 3 4.5 6l3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </a>
  )
}

/**
 * Page de détail d'un groupe d'anomalies (un job, un responsable…).
 * Les indicateurs portent sur tout le groupe ; les filtres ne s'appliquent qu'au tableau.
 * Dès que le titre passe sous la barre du haut, un bandeau fixe le rappelle.
 */
export default function GroupDetail({
  group,
  back,
  title,
  subtitle,
  notFoundText,
  extraStat,
  filters,
  filterBarProps,
  tableProps,
  notice,
  onNavigate,
}) {
  const [titleElement, setTitleElement] = useState(null)
  const titleHidden = useScrolledPast(titleElement, TOPBAR_HEIGHT)
  const visibleAnomalies = useMemo(
    () => (group ? filterAndSortAnomalies(group.anomalies, filters) : []),
    [group, filters],
  )

  if (!group) {
    return (
      <div className="page-header">
        <BackLink {...back} onNavigate={onNavigate} />
        <h1>Introuvable</h1>
        <p className="page-subtitle">{notFoundText}</p>
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <BackLink {...back} onNavigate={onNavigate} />
        <h1 ref={setTitleElement}>{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>

      {/* Doublon visuel du titre : masqué aux lecteurs d'écran */}
      <div className={`sticky-title${titleHidden ? ' is-visible' : ''}`} aria-hidden="true">
        <div className="sticky-title-inner">
          <span className="sticky-title-text">{title}</span>
          <span className="sticky-title-meta">
            {group.unresolved} non résolue{group.unresolved > 1 ? 's' : ''} sur {group.total}
          </span>
        </div>
      </div>

      <section className="stats stats-group" aria-label="Indicateurs">
        <Stat label="Anomalies" value={group.total} />
        <Stat label="Non résolues" value={group.unresolved} />
        <Stat label="Progression">
          <div className="stat-meter">
            <ResolutionMeter resolved={group.total - group.unresolved} total={group.total} />
          </div>
        </Stat>
        {extraStat}
        <Stat label="Dernière détection" value={formatDateTime(group.latestDetectedAt)} size="sm" />
      </section>

      <section className="section" aria-labelledby="group-anomalies-title">
        <h2 id="group-anomalies-title" className="section-title">
          Anomalies
        </h2>

        <FilterBar {...filterBarProps} resultCount={visibleAnomalies.length} resultLabel={(count) => `${count} sur ${group.total}`} />

        {notice}

        <AnomalyTable anomalies={visibleAnomalies} sortDirection={filters.sortDirection} {...tableProps} />
      </section>
    </>
  )
}
