import { describe, expect, it } from 'vitest'
import { getUserAcronym } from '../userAcronym.js'

const withName = (display_name, email = 'someone@example.com') => ({ email, user_metadata: { display_name } })

describe('getUserAcronym', () => {
  it.each([
    ['Lucien Andrieux', 'LAN'],
    ['lucien andrieux', 'LAN'],
    ['Jean-Claude Roux', 'JCR'],
    ['Marie Anne de la Fontaine', 'MAF'],
    ['Élodie Ördög', 'EOR'],
    ['Lucien', 'LUC'],
    ['Lucien A', 'LAU'],
    ['  Lucien   Andrieux  ', 'LAN'],
  ])('builds the acronym of "%s"', (name, expected) => {
    expect(getUserAcronym(withName(name))).toBe(expected)
  })

  it('falls back to full_name, then name', () => {
    expect(getUserAcronym({ user_metadata: { full_name: 'Karl Weber' } })).toBe('KWE')
    expect(getUserAcronym({ user_metadata: { display_name: ' ', name: 'Karl Weber' } })).toBe('KWE')
  })

  it('falls back to the local part of the email without a display name', () => {
    expect(getUserAcronym({ email: 'test-dashboard@anomalies.com', user_metadata: {} })).toBe('TDA')
  })

  it('returns null when nothing usable is available', () => {
    expect(getUserAcronym({ email: '123@example.com', user_metadata: {} })).toBeNull()
    expect(getUserAcronym(null)).toBeNull()
  })
})
