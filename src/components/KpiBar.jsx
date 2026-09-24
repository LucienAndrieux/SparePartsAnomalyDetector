import { useMemo } from 'react'
import { ANOMALY_TYPES, computeKpis } from '../lib/anomalies'

const percentFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'percent',
  maximumFractionDigits: 0,
})

function KpiCard({ label, value, hint, children }) {
  return (
    <div className="kpi-card">
      <span className="kpi-label">{label}</span>
      {value !== undefined && <span className="kpi-value">{value}</span>}
      {hint && <span className="kpi-hint">{hint}</span>}
      {children}
    </div>
  )
}

function TypeBreakdown({ byType, total }) {
  return (
    <>
      <div className="type-bar" aria-hidden="true">
        {Object.entries(ANOMALY_TYPES).map(([type, { tone }]) => (
          <span
            key={type}
            className={`type-bar-segment tone-${tone}`}
            style={{ flexGrow: byType[type] ?? 0 }}
          />
        ))}
      </div>
      <ul className="type-legend">
        {Object.entries(ANOMALY_TYPES).map(([type, { label, tone }]) => {
          const count = byType[type] ?? 0
          return (
            <li key={type}>
              <span className={`legend-dot tone-${tone}`} />
              {label}
              <strong>{count}</strong>
              {total > 0 && (
                <span className="legend-share">{percentFormatter.format(count / total)}</span>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

export default function KpiBar({ anomalies }) {
  const kpis = useMemo(() => computeKpis(anomalies), [anomalies])

  return (
    <section className="kpi-bar" aria-label="Indicateurs clés">
      <KpiCard label="Anomalies détectées" value={kpis.total} />
      <KpiCard
        label="Non résolues"
        value={kpis.unresolved}
        hint={kpis.total > 0 ? `${percentFormatter.format(kpis.unresolved / kpis.total)} du total` : null}
      />
      <KpiCard
        label="Résolues sous 48h"
        value={kpis.slaRate === null ? '—' : percentFormatter.format(kpis.slaRate)}
        hint={`sur ${kpis.resolvedCount} anomalie${kpis.resolvedCount > 1 ? 's' : ''} résolue${kpis.resolvedCount > 1 ? 's' : ''}`}
      />
      <KpiCard label="Répartition par type">
        <TypeBreakdown byType={kpis.byType} total={kpis.total} />
      </KpiCard>
    </section>
  )
}
