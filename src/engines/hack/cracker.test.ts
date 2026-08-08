import { describe, expect, it } from 'vitest'
import {
  AGE_OF_UNIVERSE_YEARS,
  TIERS,
  fractionSearched,
  secondsToFindKey,
  universeLifetimes,
  yearsToFindKey,
} from './cracker'

describe('cracker tiers', () => {
  it('escalate strictly in speed, laptop to planet', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].keysPerSecond).toBeGreaterThan(TIERS[i - 1].keysPerSecond)
    }
  })

  it('every tier carries a plain-English basis for its estimate', () => {
    for (const tier of TIERS) {
      expect(tier.basis.length).toBeGreaterThan(0)
    }
  })
})

describe('honest timescales', () => {
  it('faster hardware always means a shorter wait', () => {
    expect(secondsToFindKey(1e9)).toBeLessThan(secondsToFindKey(1e6))
  })

  it('even a planet-sized computer waits many lifetimes of the universe', () => {
    const planet = TIERS[TIERS.length - 1]
    expect(universeLifetimes(planet.keysPerSecond)).toBeGreaterThan(1e6)
  })

  it('"every computer on Earth" still needs far longer than the universe has existed', () => {
    const earth = TIERS.find((t) => t.id === 'earth')!
    expect(yearsToFindKey(earth.keysPerSecond)).toBeGreaterThan(AGE_OF_UNIVERSE_YEARS)
  })
})

describe('the progress bar that never moves', () => {
  it('a lifetime of guessing is still an effectively-zero fraction of the space', () => {
    // A trillion keys/sec for a hundred years.
    const tried = 1e12 * 60 * 60 * 24 * 365 * 100
    expect(fractionSearched(tried)).toBeLessThan(1e-50)
  })
})
