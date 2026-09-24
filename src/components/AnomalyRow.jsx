import { useState } from 'react'
import { ANOMALY_TYPES, formatDateTime, getAnomalyTypeLabel } from '../lib/anomalies'

export default function AnomalyRow({ anomaly, onResolve, canResolve }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  const tone = ANOMALY_TYPES[anomaly.anomaly_type]?.tone ?? 'neutral'
  const context = [anomaly.client, anomaly.item, anomaly.supplier].filter(Boolean)

  async function handleResolve() {
    setPending(true)
    setError(null)
    try {
      await onResolve(anomaly.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <tr>
      <td data-label="Job">
        <span className="mono">{anomaly.job_id}</span>
        {context.length > 0 && <span className="cell-sub">{context.join(' · ')}</span>}
      </td>
      <td data-label="Type">
        <span className={`badge tone-${tone}`}>{getAnomalyTypeLabel(anomaly.anomaly_type)}</span>
      </td>
      <td data-label="Champ">
        <span className="mono">{anomaly.field_name}</span>
      </td>
      <td data-label="Description" className="cell-description">
        {anomaly.description}
      </td>
      <td data-label="Détectée le" className="nowrap">
        <time dateTime={anomaly.detected_at}>{formatDateTime(anomaly.detected_at)}</time>
      </td>
      <td data-label="Statut">
        {anomaly.resolved ? (
          <span className="badge tone-green" title={`Résolue le ${formatDateTime(anomaly.resolved_at)}`}>
            Résolue
          </span>
        ) : (
          <span className="badge tone-red">Non résolue</span>
        )}
      </td>
      {canResolve && (
        <td data-label="Action" className="cell-action">
          {!anomaly.resolved && (
            <button type="button" className="button-secondary" onClick={handleResolve} disabled={pending}>
              {pending ? 'En cours…' : 'Marquer comme résolu'}
            </button>
          )}
          {error && (
            <span className="cell-error" role="alert">
              {error}
            </span>
          )}
        </td>
      )}
    </tr>
  )
}
