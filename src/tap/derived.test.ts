// Derived-maths tests: supply, halving distance and estimated power are pure
// functions of numbers the tap already provides — check them against known
// chain facts.

import { describe, expect, it } from 'vitest'
import {
  MAX_SUPPLY,
  blocksToHalving,
  daysToHalving,
  estimatedGigawatts,
  supplyAtHeight,
} from './derived'

describe('supplyAtHeight', () => {
  it('counts the first era at 50 coins a block, genesis included', () => {
    expect(supplyAtHeight(0)).toBe(50)
    expect(supplyAtHeight(209_999)).toBe(210_000 * 50)
  })

  it('halves the subsidy at block 210,000', () => {
    expect(supplyAtHeight(210_000)).toBe(210_000 * 50 + 25)
  })

  it('sits between 19.8M and the 21M cap at 2026 heights', () => {
    const supply = supplyAtHeight(910_000)
    expect(supply).toBeGreaterThan(19_800_000)
    expect(supply).toBeLessThan(MAX_SUPPLY)
  })

  it('never exceeds the cap, even absurdly far out', () => {
    expect(supplyAtHeight(100_000_000)).toBeLessThanOrEqual(MAX_SUPPLY)
  })
})

describe('blocksToHalving', () => {
  it('counts down within an era and resets after the boundary', () => {
    expect(blocksToHalving(840_000)).toBe(210_000) // fresh era
    expect(blocksToHalving(1_049_999)).toBe(1) // one block short
  })

  it('converts to rough days at ten minutes a block', () => {
    expect(daysToHalving(1_049_856)).toBeCloseTo(1, 5) // 144 blocks = 1 day
  })
})

describe('estimatedGigawatts', () => {
  it('turns ~900 EH/s into a double-digit gigawatt estimate', () => {
    const gw = estimatedGigawatts(900)
    expect(gw).toBeGreaterThan(10)
    expect(gw).toBeLessThan(30)
  })
})
