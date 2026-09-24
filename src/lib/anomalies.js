// L'ordre fixe la couleur de série (1 = vert marque, 2 = vert foncé) : elle suit le type, jamais son rang.
export const ANOMALY_TYPES = {
  champ_manquant: { label: 'Champ manquant', series: 1 },
  date_incoherente: { label: 'Date incohérente', series: 2 },
}

export const STATUS_LABELS = {
  unresolved: 'Non résolues',
  resolved: 'Résolues',
}

const RESOLUTION_SLA_MS = 48 * 60 * 60 * 1000

/** Accorde `word` au pluriel selon `count` : pluralize(2, 'job') → 'jobs'. */
export function pluralize(count, word) {
  return count > 1 ? `${word}s` : word
}

/** Nombre suivi du mot accordé : countLabel(2, 'job') → '2 jobs'. */
export function countLabel(count, word) {
  return `${count} ${pluralize(count, word)}`
}

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

/** Clé de responsable ; les anomalies sans responsable sont regroupées sous UNASSIGNED. */
export const UNASSIGNED = 'non-attribue'

/** Client, article et fournisseur renseignés de l'anomalie. */
export function getAnomalyContext(anomaly) {
  return [anomaly.client, anomaly.item, anomaly.supplier].filter(Boolean)
}

export function getResponsibleKey(anomaly) {
  return anomaly.responsible?.trim() || UNASSIGNED
}

export function getResponsibleLabel(key) {
  return key === UNASSIGNED ? 'Non attribué' : key
}

/** Responsables présents, triés alphabétiquement, « Non attribué » en dernier. */
export function listResponsibles(anomalies) {
  const keys = new Set(anomalies.map(getResponsibleKey))
  return [...keys].sort((a, b) => (a === UNASSIGNED) - (b === UNASSIGNED) || a.localeCompare(b))
}

/**
 * Valeurs de filtre présentes dans `anomalies` : statuts, types (ordre de ANOMALY_TYPES,
 * types inconnus en dernier) et responsables. Sert à ne proposer que des choix utiles.
 */
export function listFilterOptions(anomalies) {
  const typeOrder = Object.keys(ANOMALY_TYPES)
  const rank = (type) => (typeOrder.includes(type) ? typeOrder.indexOf(type) : typeOrder.length)

  return {
    statuses: Object.keys(STATUS_LABELS).filter((status) =>
      anomalies.some((anomaly) => Boolean(anomaly.resolved) === (status === 'resolved')),
    ),
    types: [...new Set(anomalies.map((anomaly) => anomaly.anomaly_type))].sort((a, b) => rank(a) - rank(b)),
    responsibles: listResponsibles(anomalies),
  }
}

export function filterAndSortAnomalies(anomalies, { status, type, responsible = 'all', sortDirection }) {
  const filtered = anomalies.filter((anomaly) => {
    if (status === 'resolved' && !anomaly.resolved) return false
    if (status === 'unresolved' && anomaly.resolved) return false
    if (type !== 'all' && anomaly.anomaly_type !== type) return false
    if (responsible !== 'all' && getResponsibleKey(anomaly) !== responsible) return false
    return true
  })

  const direction = sortDirection === 'asc' ? 1 : -1
  return filtered.sort(
    (a, b) => direction * (new Date(a.detected_at) - new Date(b.detected_at)),
  )
}

/**
 * Regroupe les anomalies selon `getKey`. Les groupes les plus urgents d'abord :
 * plus d'anomalies non résolues, puis détection la plus récente.
 * L'ordre des anomalies à l'intérieur d'un groupe est conservé.
 */
function groupAnomalies(anomalies, getKey) {
  const groups = new Map()

  for (const anomaly of anomalies) {
    const key = getKey(anomaly)
    let group = groups.get(key)
    if (!group) {
      group = { key, anomalies: [], unresolved: 0, latestDetectedAt: anomaly.detected_at }
      groups.set(key, group)
    }
    group.anomalies.push(anomaly)
    if (!anomaly.resolved) group.unresolved += 1
    if (new Date(anomaly.detected_at) > new Date(group.latestDetectedAt)) {
      group.latestDetectedAt = anomaly.detected_at
    }
  }

  return [...groups.values()]
    .map((group) => ({ ...group, total: group.anomalies.length }))
    .sort(
      (a, b) =>
        b.unresolved - a.unresolved ||
        new Date(b.latestDetectedAt) - new Date(a.latestDetectedAt) ||
        String(a.key).localeCompare(String(b.key)),
    )
}

export function groupAnomaliesByJob(anomalies) {
  return groupAnomalies(anomalies, (anomaly) => anomaly.job_id).map((group) => {
    const [first] = group.anomalies
    return {
      ...group,
      jobId: group.key,
      context: getAnomalyContext(first),
      responsibles: listResponsibles(group.anomalies),
    }
  })
}

export function groupAnomaliesByResponsible(anomalies) {
  return groupAnomalies(anomalies, getResponsibleKey).map((group) => ({
    ...group,
    responsible: group.key,
    jobCount: new Set(group.anomalies.map((anomaly) => anomaly.job_id)).size,
  }))
}
