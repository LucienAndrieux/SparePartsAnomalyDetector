import { useMemo } from 'react'
import { ANOMALY_TYPES, computeKpis, countLabel, pluralize } from '../lib/anomalies'
import Stat from './Stat'

const percentFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'percent',
  maximumFractionDigits: 0,
})

function TypeBreakdown({ byType, total }) {
  const types = Object.entries(ANOMALY_TYPES)

  return (
    <>
      <div className="split-bar" aria-hidden="true">
        {types.map(([type, { label, series }]) =>
          byType[type] > 0 ? (
            <span
              key={type}
              className={`split-bar-segment series-${series}`}
              style={{ flexGrow: byType[type] }}
              title={`${label} : ${byType[type]}`}
            />
          ) : null,
        )}
      </div>
      <ul className="legend">
        {types.map(([type, { label, series }]) => {
          const count = byType[type] ?? 0
          return (
            <li key={type}>
              <span className={`legend-swatch series-${series}`} aria-hidden="true" />
              <span className="legend-label">{label}</span>
              <span className="legend-value">{count}</span>
              <span className="legend-share">{total > 0 ? percentFormatter.format(count / total) : '—'}</span>
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
    <section className="stats" aria-label="Indicateurs clés">
      <Stat label="Anomalies détectées" value={kpis.total} />
      <Stat
        label="Non résolues"
        value={kpis.unresolved}
        hint={kpis.total > 0 ? `${percentFormatter.format(kpis.unresolved / kpis.total)} du total` : null}
      />
      <Stat
        label="Résolues sous 48h"
        value={kpis.slaRate === null ? '—' : percentFormatter.format(kpis.slaRate)}
        hint={`sur ${countLabel(kpis.resolvedCount, 'anomalie')} ${pluralize(kpis.resolvedCount, 'résolue')}`}
      />
      <Stat label="Répartition par type">
        <TypeBreakdown byType={kpis.byType} total={kpis.total} />
      </Stat>
    </section>
  )
}
