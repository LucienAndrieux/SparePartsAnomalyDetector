import { formatDateTime } from '../lib/anomalies'
import { jobHref } from '../lib/routes'
import { ResponsibleTag, StatusBadge, TypeBadge } from './Badges'
import ResolveAction from './ResolveAction'

export default function AnomalyRow({ anomaly, onResolve, showJob = true, showResponsible = true }) {
  const context = [anomaly.client, anomaly.item, anomaly.supplier].filter(Boolean)

  return (
    <tr>
      {showJob && (
        <td data-label="Job">
          <a className="mono job-link" href={jobHref(anomaly.job_id)}>
            {anomaly.job_id}
          </a>
          {context.length > 0 && <span className="cell-sub">{context.join(' · ')}</span>}
        </td>
      )}
      <td data-label="Type">
        <TypeBadge type={anomaly.anomaly_type} />
      </td>
      <td data-label="Champ">
        <span className="field-name">{anomaly.field_name}</span>
      </td>
      <td data-label="Description" className="cell-description">
        {anomaly.description}
      </td>
      <td data-label="Détectée le" className="nowrap cell-muted">
        <time dateTime={anomaly.detected_at}>{formatDateTime(anomaly.detected_at)}</time>
      </td>
      {showResponsible && (
        <td data-label="Responsable">
          <ResponsibleTag responsible={anomaly.responsible} />
        </td>
      )}
      <td data-label="Statut">
        <StatusBadge anomaly={anomaly} />
      </td>
      <td data-label="Action" className="cell-action">
        {!anomaly.resolved && <ResolveAction anomalyId={anomaly.id} onResolve={onResolve} />}
      </td>
    </tr>
  )
}
