import { describe, expect, it } from 'vitest'
import { computeKpis, filterAndSortAnomalies, formatDateTime } from './anomalies'

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
