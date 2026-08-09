// Attack 3 "The 51% attack" — the brains layer (no visuals). Models the
// takeover shop: buying mining power, the running bill, the electricity draw,
// your share of the network, and the win condition. The tested invariant: the
// bill always equals the shop's cost table — you can't cheat your way past the
// price. This layer is the tested surface.

import shop from '../../data/mining-shop.json'

export interface ShopItem {
  id: string
  label: string
  icon: string
  machines: number
}

export const SHOP_ITEMS = shop.items as ShopItem[]
export const MACHINE_TH = shop.machineTH // hashes/sec per machine, in TH/s
export const MACHINE_WATTS = shop.machineWatts
export const MACHINE_COST_USD = shop.machineCostUSD

export interface CountryPower {
  name: string
  gw: number
}
export const COUNTRIES = shop.countries as CountryPower[]

/** A basket: how many of each shop item the visitor has bought. */
export type Basket = Record<string, number>

function machinesFor(item: ShopItem, count: number): number {
  return item.machines * count
}

/** Total machines across the whole basket. */
export function totalMachines(basket: Basket): number {
  let m = 0
  for (const item of SHOP_ITEMS) m += machinesFor(item, basket[item.id] ?? 0)
  return m
}

/** The running bill — always exactly machines × the per-machine price. This is
 * the invariant the attack's honesty rests on: no discount, no shortcut. */
export function totalSpentUSD(basket: Basket): number {
  return totalMachines(basket) * MACHINE_COST_USD
}

/** Your mining power in EH/s. 1 EH/s = 1e6 TH/s. */
export function yourHashEH(basket: Basket): number {
  return (totalMachines(basket) * MACHINE_TH) / 1e6
}

/** Your continuous electricity draw in gigawatts. */
export function yourPowerGW(basket: Basket): number {
  return (totalMachines(basket) * MACHINE_WATTS) / 1e9
}

/** Your share of the network as a percentage (0–100), against a world total. */
export function sharePercent(yourEH: number, worldEH: number): number {
  const total = yourEH + worldEH
  if (total <= 0) return 0
  return (yourEH / total) * 100
}

export const WIN_THRESHOLD_PERCENT = 51

export function hasWon(sharePct: number): boolean {
  return sharePct >= WIN_THRESHOLD_PERCENT
}

/** The world is a moving target: it keeps growing while you shop. Models a
 * steady ~1%/minute drift up from the live base so the needle fights back.
 * elapsedSec since the page opened; pure (no clock read). */
export function worldHashAfter(baseEH: number, elapsedSec: number): number {
  const growthPerSec = baseEH * (0.01 / 60)
  return baseEH + growthPerSec * Math.max(0, elapsedSec)
}

/** The largest country whose average power you now exceed, or null if you're
 * still below the smallest entry. Drives "you now use more power than X". */
export function biggestCountryExceeded(powerGW: number): CountryPower | null {
  let best: CountryPower | null = null
  for (const c of COUNTRIES) {
    if (powerGW >= c.gw && (best === null || c.gw > best.gw)) best = c
  }
  return best
}

/** Machines needed to just cross the win line against a fixed world total. */
export function machinesToWin(worldEH: number): number {
  // your/(your+world) >= 0.51  →  your >= world * 0.51/0.49
  const neededEH = worldEH * (WIN_THRESHOLD_PERCENT / (100 - WIN_THRESHOLD_PERCENT))
  return Math.ceil((neededEH * 1e6) / MACHINE_TH)
}
