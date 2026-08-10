// Pure maths derived from live numbers the tap already provides. Nothing here
// fetches — everything is computed from block height or hashrate, so the info
// panel stays honest without extra data sources.

/** Blocks per subsidy era — the reward halves every 210,000 blocks. */
export const HALVING_INTERVAL = 210_000

/** The hard cap, in whole coins. */
export const MAX_SUPPLY = 21_000_000

/**
 * Fleet-average miner efficiency in joules per terahash. Nobody meters the
 * network's power draw directly; estimates (Cambridge-style) multiply hashrate
 * by an assumed efficiency. ~20 J/TH is a reasonable 2026 fleet average.
 */
export const FLEET_EFFICIENCY_J_PER_TH = 20

/** Total coins issued by the time the chain reaches `height` blocks. */
export function supplyAtHeight(height: number): number {
  let supply = 0
  let subsidy = 50
  let remaining = height + 1 // block 0 pays a subsidy too
  while (remaining > 0 && subsidy > 1e-8) {
    const blocks = Math.min(remaining, HALVING_INTERVAL)
    supply += blocks * subsidy
    remaining -= blocks
    subsidy /= 2
  }
  return supply
}

/** Blocks still to mine before the next subsidy halving. */
export function blocksToHalving(height: number): number {
  return HALVING_INTERVAL - (height % HALVING_INTERVAL)
}

/** Rough calendar distance to the next halving, at one block per 10 minutes. */
export function daysToHalving(height: number): number {
  return (blocksToHalving(height) * 600) / 86_400
}

/** Estimated network power draw in gigawatts, from hashrate in EH/s. */
export function estimatedGigawatts(hashrateEH: number): number {
  // EH/s → TH/s is ×1e6; × J/TH gives watts; ÷1e9 gives GW.
  return (hashrateEH * 1e6 * FLEET_EFFICIENCY_J_PER_TH) / 1e9
}
