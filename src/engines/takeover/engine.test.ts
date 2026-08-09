// Attack 3 engine tests — the invariant that keeps the attack honest: the bill
// equals the shop's cost table for any basket, plus the share/power maths and
// the moving-target world growth.

import { describe, expect, it } from 'vitest'
import {
  MACHINE_COST_USD,
  MACHINE_TH,
  SHOP_ITEMS,
  WIN_THRESHOLD_PERCENT,
  biggestCountryExceeded,
  hasWon,
  machinesToWin,
  sharePercent,
  totalMachines,
  totalSpentUSD,
  worldHashAfter,
  yourHashEH,
  yourPowerGW,
  type Basket,
} from './engine'

describe('the bill equals the shop cost table', () => {
  it('is zero for an empty basket', () => {
    expect(totalSpentUSD({})).toBe(0)
  })

  it('equals machines × unit price for any basket (exhaustive over items)', () => {
    // Buy a different quantity of each item and confirm the bill matches the
    // hand-summed cost table — no discount, no shortcut.
    const basket: Basket = {}
    let expectedMachines = 0
    SHOP_ITEMS.forEach((item, i) => {
      const qty = i + 1
      basket[item.id] = qty
      expectedMachines += item.machines * qty
    })
    expect(totalMachines(basket)).toBe(expectedMachines)
    expect(totalSpentUSD(basket)).toBe(expectedMachines * MACHINE_COST_USD)
  })

  it('ignores unknown item ids in a basket', () => {
    expect(totalSpentUSD({ bogus: 999 })).toBe(0)
  })
})

describe('share and power maths', () => {
  it('share is 0 with nothing bought and rises as you buy', () => {
    expect(sharePercent(0, 900)).toBe(0)
    expect(sharePercent(900, 900)).toBeCloseTo(50, 5)
    expect(sharePercent(300, 100)).toBeCloseTo(75, 5)
  })

  it('a year of global production does NOT reach 51% of the live world', () => {
    // The headline honesty beat: even every factory on Earth for a year falls
    // short against ~900 EH/s — the world is too big.
    const yearItem = SHOP_ITEMS.find((i) => i.id === 'year')!
    const eh = yourHashEH({ [yearItem.id]: 1 })
    expect(sharePercent(eh, 903.9)).toBeLessThan(WIN_THRESHOLD_PERCENT)
  })

  it('machinesToWin actually crosses the line and one fewer does not', () => {
    const world = 903.9
    const need = machinesToWin(world)
    const eh = (need * MACHINE_TH) / 1e6
    expect(hasWon(sharePercent(eh, world))).toBe(true)
    const ehShort = ((need - 1) * MACHINE_TH) / 1e6
    expect(hasWon(sharePercent(ehShort, world))).toBe(false)
  })

  it('power scales with machines and translates to a country', () => {
    const oneMachineGW = yourPowerGW({ machine: 1 })
    expect(oneMachineGW).toBeGreaterThan(0)
    // A warehouse of 10k rigs draws tens of MW — more than a small town.
    const townOrMore = biggestCountryExceeded(yourPowerGW({ warehouse: 1 }))
    expect(townOrMore).not.toBeNull()
    // Winning draws enough to out-consume a mid-size country.
    const big = biggestCountryExceeded(yourPowerGW({ year: 2 }))
    expect(big!.gw).toBeGreaterThan(5)
  })
})

describe('the world is a moving target', () => {
  it('grows monotonically with elapsed time', () => {
    const base = 900
    expect(worldHashAfter(base, 0)).toBeCloseTo(base, 5)
    expect(worldHashAfter(base, 60)).toBeGreaterThan(base)
    expect(worldHashAfter(base, 120)).toBeGreaterThan(worldHashAfter(base, 60))
  })

  it('never shrinks for negative or zero elapsed', () => {
    expect(worldHashAfter(900, -10)).toBe(900)
  })
})
