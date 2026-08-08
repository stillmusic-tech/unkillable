// Attack 1, Scene 2 — the cracker.
// Pure brains: how fast each tier of hardware can try keys, and how long that
// leaves the attacker waiting. No visuals. Every rate is a deliberately
// GENEROUS order-of-magnitude estimate — rounding up only makes the failure
// starker. Labelled as estimates on the page (story 33).

/** A hireable attacker tier. `keysPerSecond` is a generous upper estimate. */
export interface CrackerTier {
  id: string
  name: string
  keysPerSecond: number
  /** Plain-English basis for the estimate, shown on the page. */
  basis: string
}

// Ordered from "yours" to "sci-fi". Rates climb by ~1000x per rung; even the
// top rung is dwarfed by the search space. Anchor points: a modern laptop does
// ~1e6 key checks/sec; the entire Bitcoin mining network does ~1e21 hashes/sec,
// so "every computer on Earth" aimed at this is charitably ~1e18 key checks/sec.
export const TIERS: readonly CrackerTier[] = [
  {
    id: 'laptop',
    name: 'Your laptop',
    keysPerSecond: 1e6,
    basis: 'a modern laptop CPU, ~1 million key checks per second',
  },
  {
    id: 'rig',
    name: 'A serious gaming rig',
    keysPerSecond: 1e9,
    basis: 'a high-end GPU, ~1 billion key checks per second',
  },
  {
    id: 'datacentre',
    name: 'A warehouse data centre',
    keysPerSecond: 1e12,
    basis: 'thousands of GPUs, ~1 trillion key checks per second',
  },
  {
    id: 'bigtech',
    name: 'Every computer Google, Amazon and Microsoft own — combined',
    keysPerSecond: 1e15,
    basis: 'the world’s largest clouds pooled, ~1 quadrillion key checks per second',
  },
  {
    id: 'earth',
    name: 'Every computer on Earth',
    keysPerSecond: 1e18,
    basis: 'all computing on the planet aimed at nothing else (generous estimate)',
  },
  {
    id: 'planet',
    name: 'A computer the size of a planet',
    keysPerSecond: 1e24,
    basis: 'science fiction — a machine a trillion times faster than all of Earth',
  },
]

/** Total number of possible private keys: 2^256. */
export const KEY_SPACE = 2 ** 256

/** Age of the universe, in years — the yardstick for "absurd". */
export const AGE_OF_UNIVERSE_YEARS = 1.38e10

const SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60

/**
 * Expected seconds to actually find one specific key: on average you search
 * half the space before hitting it.
 */
export function secondsToFindKey(keysPerSecond: number): number {
  return KEY_SPACE / 2 / keysPerSecond
}

/** Those seconds expressed in years. */
export function yearsToFindKey(keysPerSecond: number): number {
  return secondsToFindKey(keysPerSecond) / SECONDS_PER_YEAR
}

/** How many complete lifetimes of the universe that wait would take. */
export function universeLifetimes(keysPerSecond: number): number {
  return yearsToFindKey(keysPerSecond) / AGE_OF_UNIVERSE_YEARS
}

/**
 * The progress bar's actual fill after trying `keysTried` keys: a fraction of
 * the whole space so tiny the bar can never move. Always effectively zero.
 */
export function fractionSearched(keysTried: number): number {
  return keysTried / KEY_SPACE
}

/** Render a huge number as "1.8e51" — readable without pretending precision. */
export function formatScientific(n: number): string {
  if (n === 0) return '0'
  if (!isFinite(n)) return '∞' // ∞
  const exp = Math.floor(Math.log10(n))
  const mantissa = n / 10 ** exp
  return `${mantissa.toFixed(1)}×10^${exp}`
}

/**
 * The felt-unit line for a tier: turns the raw wait into "the universe will die
 * and cool to nothing before this attack finishes". One honest sentence.
 */
export function describeWait(keysPerSecond: number): string {
  const lifetimes = universeLifetimes(keysPerSecond)
  return (
    `On average this tier needs about ${formatScientific(yearsToFindKey(keysPerSecond))} years ` +
    `— roughly ${formatScientific(lifetimes)} times the entire age of the universe. ` +
    `The universe will die, cool to nothing, and this attack will have barely started.`
  )
}
