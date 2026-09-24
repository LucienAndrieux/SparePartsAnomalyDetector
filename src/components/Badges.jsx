import { UNASSIGNED, formatDateTime, getAnomalyTypeLabel, getResponsibleLabel } from '../lib/anomalies'
import { responsibleHref } from '../lib/routes'

export function TypeBadge({ type }) {
  return <span className="badge">{getAnomalyTypeLabel(type)}</span>
}

/** Statut porté par une icône + un libellé, jamais par la couleur seule. */
export function StatusBadge({ anomaly }) {
  if (anomaly.resolved) {
    return (
      <span className="badge badge-success" title={`Résolue le ${formatDateTime(anomaly.resolved_at)}`}>
        <svg className="badge-icon" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Résolue
      </span>
    )
  }

  return (
    <span className="badge badge-pending">
      <svg className="badge-icon" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      Non résolue
    </span>
  )
}

/**
 * Responsable cliquable (vers sa page) ; « Non attribué » en retrait.
 * `responsibleKey` : clé issue de getResponsibleKey / listResponsibles.
 */
export function ResponsibleTag({ responsibleKey }) {
  if (responsibleKey === UNASSIGNED) {
    return <span className="responsible-tag is-unassigned">{getResponsibleLabel(responsibleKey)}</span>
  }

  return (
    <a className="responsible-tag" href={responsibleHref(responsibleKey)} title={`Voir les anomalies de ${responsibleKey}`}>
      {responsibleKey}
    </a>
  )
}
