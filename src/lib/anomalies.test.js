import { describe, expect, it } from 'vitest'
import {
  UNASSIGNED,
  computeKpis,
  countLabel,
  filterAndSortAnomalies,
  formatDateTime,
  getAnomalyContext,
  getResponsibleKey,
  groupAnomaliesByJob,
  groupAnomaliesByResponsible,
  listFilterOptions,
  listResponsibles,
  pluralize,
} from './anomalies'

const HOUR = 60 * 60 * 1000

function makeAnomaly(overrides = {}) {
  return {
    id: 1,
    job_id: '7617',
    anomaly_type: 'champ_manquant',
    field_name: 'Supplier',
    description: 'Valeur vide',
    detected_at: '2026-09-22T10:00:00Z',
    resolved: false,
    resolved_at: null,
    ...overrides,
  }
}

function resolvedAfter(hours, overrides = {}) {
  const detected = new Date('2026-09-22T10:00:00Z')
  return makeAnomaly({
    detected_at: detected.toISOString(),
    resolved: true,
    resolved_at: new Date(detected.getTime() + hours * HOUR).toISOString(),
    ...overrides,
  })
}

describe('computeKpis', () => {
  it('returns zeros and a null rate for an empty list', () => {
    expect(computeKpis([])).toEqual({
      total: 0,
      unresolved: 0,
      slaRate: null,
      resolvedCount: 0,
      byType: { champ_manquant: 0, date_incoherente: 0 },
    })
  })

  it('counts totals, unresolved and split by type', () => {
    const kpis = computeKpis([
      makeAnomaly({ id: 1 }),
      makeAnomaly({ id: 2, anomaly_type: 'date_incoherente' }),
      resolvedAfter(1, { id: 3 }),
    ])

    expect(kpis.total).toBe(3)
    expect(kpis.unresolved).toBe(2)
    expect(kpis.byType).toEqual({ champ_manquant: 2, date_incoherente: 1 })
  })

  it('computes the 48h rate over resolved anomalies only', () => {
    const kpis = computeKpis([
      resolvedAfter(2, { id: 1 }),
      resolvedAfter(48, { id: 2 }), // limite incluse
      resolvedAfter(49, { id: 3 }),
      resolvedAfter(100, { id: 4 }),
      makeAnomaly({ id: 5 }), // non résolue : hors dénominateur
    ])

    expect(kpis.resolvedCount).toBe(4)
    expect(kpis.slaRate).toBe(0.5)
  })

  it('does not count a resolved anomaly without resolved_at as within 48h', () => {
    const kpis = computeKpis([makeAnomaly({ resolved: true, resolved_at: null })])
    expect(kpis.slaRate).toBe(0)
  })

  it('keeps unknown anomaly types instead of dropping them', () => {
    const kpis = computeKpis([makeAnomaly({ anomaly_type: 'doublon' })])
    expect(kpis.byType.doublon).toBe(1)
  })
})

describe('filterAndSortAnomalies', () => {
  const anomalies = [
    makeAnomaly({ id: 1, detected_at: '2026-09-20T08:00:00Z' }),
    makeAnomaly({ id: 2, detected_at: '2026-09-22T08:00:00Z', anomaly_type: 'date_incoherente' }),
    resolvedAfter(1, { id: 3, detected_at: '2026-09-21T08:00:00Z' }),
  ]
  const ids = (list) => list.map((a) => a.id)

  it('sorts by detected_at descending by default', () => {
    const result = filterAndSortAnomalies(anomalies, { status: 'all', type: 'all', sortDirection: 'desc' })
    expect(ids(result)).toEqual([2, 3, 1])
  })

  it('sorts ascending when requested', () => {
    const result = filterAndSortAnomalies(anomalies, { status: 'all', type: 'all', sortDirection: 'asc' })
    expect(ids(result)).toEqual([1, 3, 2])
  })

  it('filters by status', () => {
    const opts = { type: 'all', sortDirection: 'desc' }
    expect(ids(filterAndSortAnomalies(anomalies, { ...opts, status: 'resolved' }))).toEqual([3])
    expect(ids(filterAndSortAnomalies(anomalies, { ...opts, status: 'unresolved' }))).toEqual([2, 1])
  })

  it('filters by type', () => {
    const result = filterAndSortAnomalies(anomalies, {
      status: 'all',
      type: 'date_incoherente',
      sortDirection: 'desc',
    })
    expect(ids(result)).toEqual([2])
  })

  it('does not mutate the input array', () => {
    const copy = [...anomalies]
    filterAndSortAnomalies(anomalies, { status: 'all', type: 'all', sortDirection: 'asc' })
    expect(anomalies).toEqual(copy)
  })
})

describe('formatDateTime', () => {
  it('formats as "22 sept. 2026, 20h49" in local time', () => {
    // Construit en heure locale pour que le test soit indépendant du fuseau.
    const local = new Date(2026, 8, 22, 20, 49)
    expect(formatDateTime(local.toISOString())).toBe('22 sept. 2026, 20h49')
  })

  it('pads single-digit hours and minutes', () => {
    const local = new Date(2026, 0, 5, 7, 3)
    expect(formatDateTime(local.toISOString())).toBe('5 janv. 2026, 07h03')
  })

  it('returns a dash for missing or invalid values', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime('not a date')).toBe('—')
  })
})

describe('pluralize / countLabel', () => {
  it('uses the singular for 0 and 1, the plural above', () => {
    expect(pluralize(0, 'job')).toBe('job')
    expect(pluralize(1, 'job')).toBe('job')
    expect(pluralize(2, 'job')).toBe('jobs')
    expect(countLabel(3, 'anomalie')).toBe('3 anomalies')
  })
})

describe('listFilterOptions', () => {
  it('lists only the statuses, types and responsibles present', () => {
    const options = listFilterOptions([
      makeAnomaly({ id: 1, anomaly_type: 'date_incoherente', responsible: 'KWE' }),
      makeAnomaly({ id: 2, anomaly_type: 'doublon', responsible: null }),
      makeAnomaly({ id: 3, anomaly_type: 'champ_manquant', responsible: 'KWE' }),
    ])
    expect(options).toEqual({
      statuses: ['unresolved'],
      types: ['champ_manquant', 'date_incoherente', 'doublon'],
      responsibles: ['KWE', UNASSIGNED],
    })
  })

  it('returns empty lists for no anomalies', () => {
    expect(listFilterOptions([])).toEqual({ statuses: [], types: [], responsibles: [] })
  })
})

describe('getAnomalyContext', () => {
  it('keeps only the filled-in client, item and supplier', () => {
    expect(getAnomalyContext(makeAnomaly({ client: 'Dubosc', item: '', supplier: 'SKF' }))).toEqual(['Dubosc', 'SKF'])
  })
})

describe('groupAnomaliesByJob', () => {
  it('returns an empty list for no anomalies', () => {
    expect(groupAnomaliesByJob([])).toEqual([])
  })

  it('groups by job and counts total and unresolved', () => {
    const [group] = groupAnomaliesByJob([
      makeAnomaly({ id: 1 }),
      makeAnomaly({ id: 2 }),
      resolvedAfter(1, { id: 3 }),
    ])

    expect(group.jobId).toBe('7617')
    expect(group.total).toBe(3)
    expect(group.unresolved).toBe(2)
    expect(group.anomalies.map((a) => a.id)).toEqual([1, 2, 3])
  })

  it('puts jobs with the most unresolved anomalies first, then the most recent', () => {
    const groups = groupAnomaliesByJob([
      makeAnomaly({ id: 1, job_id: 'A', detected_at: '2026-09-22T08:00:00Z' }),
      makeAnomaly({ id: 2, job_id: 'B', detected_at: '2026-09-20T08:00:00Z' }),
      makeAnomaly({ id: 3, job_id: 'B', detected_at: '2026-09-20T09:00:00Z' }),
      makeAnomaly({ id: 4, job_id: 'C', detected_at: '2026-09-23T08:00:00Z' }),
      resolvedAfter(1, { id: 5, job_id: 'D', detected_at: '2026-09-24T08:00:00Z' }),
    ])

    expect(groups.map((g) => g.jobId)).toEqual(['B', 'C', 'A', 'D'])
  })

  it('tracks the latest detection date and context of the job', () => {
    const [group] = groupAnomaliesByJob([
      makeAnomaly({ id: 1, detected_at: '2026-09-20T08:00:00Z', client: 'Dubosc' }),
      makeAnomaly({ id: 2, detected_at: '2026-09-22T08:00:00Z' }),
    ])

    expect(group.latestDetectedAt).toBe('2026-09-22T08:00:00Z')
    expect(group.context).toEqual(['Dubosc'])
  })
})

describe('responsibles', () => {
  it('maps missing or blank responsibles to UNASSIGNED', () => {
    expect(getResponsibleKey(makeAnomaly({ responsible: 'KWE' }))).toBe('KWE')
    expect(getResponsibleKey(makeAnomaly({ responsible: null }))).toBe(UNASSIGNED)
    expect(getResponsibleKey(makeAnomaly({ responsible: '  ' }))).toBe(UNASSIGNED)
    expect(getResponsibleKey(makeAnomaly({ responsible: ' FLM ' }))).toBe('FLM')
  })

  it('lists responsibles alphabetically with unassigned last', () => {
    const list = listResponsibles([
      makeAnomaly({ responsible: 'SVA' }),
      makeAnomaly({ responsible: null }),
      makeAnomaly({ responsible: 'BSN' }),
      makeAnomaly({ responsible: 'SVA' }),
    ])
    expect(list).toEqual(['BSN', 'SVA', UNASSIGNED])
  })

  it('filters by responsible, including unassigned', () => {
    const anomalies = [
      makeAnomaly({ id: 1, responsible: 'KWE' }),
      makeAnomaly({ id: 2, responsible: null }),
      makeAnomaly({ id: 3, responsible: 'FLM' }),
    ]
    const opts = { status: 'all', type: 'all', sortDirection: 'desc' }
    expect(filterAndSortAnomalies(anomalies, { ...opts, responsible: 'KWE' }).map((a) => a.id)).toEqual([1])
    expect(filterAndSortAnomalies(anomalies, { ...opts, responsible: UNASSIGNED }).map((a) => a.id)).toEqual([2])
  })

  it('groups by responsible and counts distinct jobs', () => {
    const groups = groupAnomaliesByResponsible([
      makeAnomaly({ id: 1, responsible: 'KWE', job_id: 'A' }),
      makeAnomaly({ id: 2, responsible: 'KWE', job_id: 'A' }),
      makeAnomaly({ id: 3, responsible: 'KWE', job_id: 'B' }),
      resolvedAfter(1, { id: 4, responsible: null, job_id: 'C' }),
    ])

    expect(groups.map((g) => [g.responsible, g.total, g.unresolved, g.jobCount])).toEqual([
      ['KWE', 3, 3, 2],
      [UNASSIGNED, 1, 0, 1],
    ])
  })

  it('lists the responsibles of each job', () => {
    const [group] = groupAnomaliesByJob([
      makeAnomaly({ id: 1, responsible: 'KWE' }),
      makeAnomaly({ id: 2, responsible: 'FLM' }),
    ])
    expect(group.responsibles).toEqual(['FLM', 'KWE'])
  })
})
