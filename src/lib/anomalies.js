export const ANOMALY_TYPES = {
  champ_manquant: { label: 'Champ manquant', tone: 'amber' },
  date_incoherente: { label: 'Date incohérente', tone: 'violet' },
}

export const STATUS_FILTERS = [
  { value: 'all', label: 'Toutes' },
  { value: 'unresolved', label: 'Non résolues' },
  { value: 'resolved', label: 'Résolues' },
]

const RESOLUTION_SLA_MS = 48 * 60 * 60 * 1000

export function getAnomalyTypeLabel(type) {
  return ANOMALY_TYPES[type]?.label ?? type
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** Formate une date ISO en "22 sept. 2026, 20h49". */
export function formatDateTime(isoString) {
  if (!isoString) return '—'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '—'
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${dateFormatter.format(date)}, ${hours}h${minutes}`
}

function isResolvedWithinSla(anomaly) {
  if (!anomaly.resolved || !anomaly.resolved_at) return false
  const delay = new Date(anomaly.resolved_at) - new Date(anomaly.detected_at)
  return delay >= 0 && delay <= RESOLUTION_SLA_MS
}

export function computeKpis(anomalies) {
  const resolved = anomalies.filter((a) => a.resolved)
  const resolvedWithinSla = resolved.filter(isResolvedWithinSla)

  const byType = Object.fromEntries(Object.keys(ANOMALY_TYPES).map((type) => [type, 0]))
  for (const anomaly of anomalies) {
    byType[anomaly.anomaly_type] = (byType[anomaly.anomaly_type] ?? 0) + 1
  }

  return {
    total: anomalies.length,
    unresolved: anomalies.length - resolved.length,
    // null quand aucune anomalie n'est résolue : le taux n'a pas de sens.
    slaRate: resolved.length > 0 ? resolvedWithinSla.length / resolved.length : null,
    resolvedCount: resolved.length,
    byType,
  }
}

export function filterAndSortAnomalies(anomalies, { status, type, sortDirection }) {
  const filtered = anomalies.filter((anomaly) => {
    if (status === 'resolved' && !anomaly.resolved) return false
    if (status === 'unresolved' && anomaly.resolved) return false
    if (type !== 'all' && anomaly.anomaly_type !== type) return false
    return true
  })

  const direction = sortDirection === 'asc' ? 1 : -1
  return filtered.sort(
    (a, b) => direction * (new Date(a.detected_at) - new Date(b.detected_at)),
  )
}
