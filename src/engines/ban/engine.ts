// Attack 4 "Ban it" — the brains layer (no visuals). Models banning mining
// country by country and the invariant the attack teaches: no set of bans
// silences the network, because mining migrates and ownership is a number in
// someone's head, not an object a border can find. This layer is the tested
// surface.

import data from '../../data/mining-by-country.json'

export interface Country {
  code: string
  name: string
  share: number
  lat: number
  lon: number
  banned: boolean // historically banned/restricted on arrival
  note?: string
}

export const COUNTRIES = data.countries as Country[]
export const REST_OF_WORLD_SHARE = data.restOfWorldShare
export const TOTAL_COUNTRIES_WORLD = data.totalCountriesWorld

/** Countries pre-tinted because they really have banned or heavily restricted
 * mining/crypto — the quiet shock that the attack is already underway. */
export function historicallyBanned(): Country[] {
  return COUNTRIES.filter((c) => c.banned)
}

/** The share of global mining that migrates to still-legal ground. Banning a
 * country doesn't delete its miners — they move (as China's did in 2021). So
 * as long as one country stays legal, 100% of mining finds a home there. */
export function survivingMiningShare(bannedCodes: Set<string>): number {
  const anyLegalNamed = COUNTRIES.some((c) => !bannedCodes.has(c.code))
  const restStillLegal = !bannedCodes.has('__rest__')
  if (anyLegalNamed || restStillLegal) return 100
  // Every jurisdiction on Earth has banned it. Mining doesn't hit zero — it
  // goes stateless: off-grid, behind VPNs, over satellite. No border finds it.
  return OFFGRID_RESIDUAL
}

/** Even a total, perfectly-coordinated world ban leaves this: mining no state
 * controls. Small, but never zero — the honest floor. */
export const OFFGRID_RESIDUAL = 1

/** The network is OPERATIONAL regardless of how many countries ban it — a law
 * is an instruction to people, and there is no one to arrest who can stop it. */
export function networkOperational(_bannedCodes: Set<string>): true {
  return true
}

export interface BanStats {
  bansSigned: number
  totalCountries: number
  survivingShare: number
  operational: true
}

/** bansSigned counts every banned country (historical + player), capped at the
 * real world total; the finale can set it to all 195. */
export function banStats(bannedCodes: Set<string>): BanStats {
  return {
    bansSigned: Math.min(bannedCodes.size, TOTAL_COUNTRIES_WORLD),
    totalCountries: TOTAL_COUNTRIES_WORLD,
    survivingShare: survivingMiningShare(bannedCodes),
    operational: networkOperational(bannedCodes),
  }
}

/** Where the largest still-legal share sits — the migration destination. */
export function biggestLegalHost(bannedCodes: Set<string>): Country | null {
  let best: Country | null = null
  for (const c of COUNTRIES) {
    if (bannedCodes.has(c.code)) continue
    if (best === null || c.share > best.share) best = c
  }
  return best
}
