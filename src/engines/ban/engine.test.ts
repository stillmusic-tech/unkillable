// Attack 4 engine tests — the invariant: no set of country bans reduces the
// surviving network to zero, and the network stays OPERATIONAL for every set.

import { describe, expect, it } from 'vitest'
import {
  COUNTRIES,
  OFFGRID_RESIDUAL,
  TOTAL_COUNTRIES_WORLD,
  banStats,
  biggestLegalHost,
  historicallyBanned,
  networkOperational,
  survivingMiningShare,
} from './engine'

const allCodes = () => new Set([...COUNTRIES.map((c) => c.code), '__rest__'])

describe('banning mining, country by country', () => {
  it('arrives with real historical bans already in place', () => {
    const banned = historicallyBanned()
    expect(banned.length).toBeGreaterThan(3)
    expect(banned.map((c) => c.code)).toContain('CN') // China 2021
  })

  it('surviving mining is 100% while any jurisdiction stays legal', () => {
    expect(survivingMiningShare(new Set())).toBe(100)
    // Ban China — its share migrates; the world still hosts 100%.
    expect(survivingMiningShare(new Set(['CN']))).toBe(100)
    // Ban everyone except one small country — still 100% (it all moves there).
    const allButOne = new Set([...COUNTRIES.map((c) => c.code), '__rest__'])
    allButOne.delete('NO')
    expect(survivingMiningShare(allButOne)).toBe(100)
  })

  it('a total world ban still never reaches zero — mining goes stateless', () => {
    expect(survivingMiningShare(allCodes())).toBe(OFFGRID_RESIDUAL)
    expect(OFFGRID_RESIDUAL).toBeGreaterThan(0)
  })

  it('the network is OPERATIONAL for every possible ban-set (exhaustive)', () => {
    // Brute-force all subsets of the first 12 countries + rest — the network
    // never goes down.
    const codes = COUNTRIES.slice(0, 12).map((c) => c.code)
    codes.push('__rest__')
    for (let mask = 0; mask < 1 << codes.length; mask++) {
      const set = new Set<string>()
      codes.forEach((code, i) => {
        if (mask & (1 << i)) set.add(code)
      })
      expect(networkOperational(set)).toBe(true)
      expect(survivingMiningShare(set)).toBeGreaterThan(0)
    }
  })

  it('counts bans against the real world total and reports OPERATIONAL', () => {
    const s = banStats(new Set(['CN', 'IR', 'DZ']))
    expect(s.bansSigned).toBe(3)
    expect(s.totalCountries).toBe(TOTAL_COUNTRIES_WORLD)
    expect(s.operational).toBe(true)
  })

  it('migration destination is the largest still-legal host', () => {
    // With nothing banned, the US (largest share) is the host.
    expect(biggestLegalHost(new Set())?.code).toBe('US')
    // Ban the US and Kazakhstan — Canada or whoever is next largest legal.
    const host = biggestLegalHost(new Set(['US', 'KZ']))
    expect(host).not.toBeNull()
    expect(['CA', 'CN', 'RU']).toContain(host!.code)
  })
})
