import { ANOMALY_TYPES, UNASSIGNED, formatDateTime, getAnomalyTypeLabel, getResponsibleLabel } from '../lib/anomalies'
import { responsibleHref } from '../lib/routes'

/** Type d'anomalie, précédé de sa couleur de série (aucune pour un type inconnu). */
export function TypeBadge({ type }) {
  const series = ANOMALY_TYPES[type]?.series
  return (
    <span className="badge">
      {series && <span className={`badge-dot series-${series}`} aria-hidden="true" />}
      {getAnomalyTypeLabel(type)}
    </span>
  )
}

/** Statut porté par une icône + un libellé, jamais par la couleur seule. */
export function StatusBadge({ anomaly }) {
  if (anomaly.resolved) {
    return (
      <span className="badge badge-success" title={getResolvedTitle(anomaly)}>
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

function getResolvedTitle(anomaly) {
  const by = anomaly.resolved_by ? ` par ${anomaly.resolved_by}` : ''
  const verified = anomaly.verification_status === 'confirmed' ? ', correction vérifiée dans le Google Sheets' : ''
  return `Résolue le ${formatDateTime(anomaly.resolved_at)}${by}${verified}`
}

const VERIFICATION_NOTES = {
  not_corrected: {
    label: 'Vérif. : non corrigée',
    title: "Lors de la dernière demande de résolution, l'anomalie était toujours présente dans le Google Sheets.",
  },
  verification_failed: {
    label: 'Vérif. : échouée',
    title: "La dernière vérification n'a pas pu aboutir (LLM indisponible ou réponse invalide).",
  },
}

/** Résultat de la dernière vérification refusée ou échouée, sous le statut d'une anomalie non résolue. */
export function VerificationNote({ anomaly }) {
  const note = !anomaly.resolved && VERIFICATION_NOTES[anomaly.verification_status]
  if (!note) return null
  return (
    <span className="cell-sub" title={note.title}>
      {note.label}
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
