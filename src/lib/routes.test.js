import { describe, expect, it } from 'vitest'
import { jobHref, parseHash, responsibleHref } from './routes'

describe('parseHash', () => {
  it.each([
    ['', { name: 'list' }],
    ['#', { name: 'list' }],
    ['#jobs', { name: 'jobs' }],
    ['#jobs/', { name: 'jobs' }],
    ['#/jobs', { name: 'jobs' }],
    ['#jobs/7617', { name: 'job', id: '7617' }],
    ['#jobs/7617/extra', { name: 'list' }],
    ['#responsibles', { name: 'responsibles' }],
    ['#responsibles/KWE', { name: 'responsible', id: 'KWE' }],
    ['#unknown', { name: 'list' }],
    ['#constructor', { name: 'list' }], // pas de fuite via le prototype
    ['#jobs/%E0%A4%A', { name: 'jobs' }], // encodage invalide
  ])('parses %j', (hash, expected) => {
    expect(parseHash(hash)).toEqual(expected)
  })

  it('round-trips ids with special characters', () => {
    expect(parseHash(jobHref('JOB 12/B'))).toEqual({ name: 'job', id: 'JOB 12/B' })
    expect(parseHash(responsibleHref('J. Doe'))).toEqual({ name: 'responsible', id: 'J. Doe' })
  })
})
