// Attack 5 engine tests — the invariant: every cheat is rejected with the
// correct reason, and only the honest block is accepted.

import { describe, expect, it } from 'vitest'
import {
  BLOCK_SUBSIDY_BTC,
  CHEATS,
  MAX_SUPPLY_BTC,
  blockForCheat,
  evaluateCheat,
  validateBlock,
  type CheatId,
} from './engine'

describe('the rulebook', () => {
  it('accepts an honest block (subsidy + fees, no funny business)', () => {
    const v = evaluateCheat('straight')
    expect(v.accepted).toBe(true)
    expect(v.rule).toBe('')
  })

  it('rejects tripling your pay, citing the subsidy rule', () => {
    const v = evaluateCheat('triple')
    expect(v.accepted).toBe(false)
    expect(v.rule).toBe('subsidy')
    expect(v.reason).toMatch(/subsidy|allow/i)
  })

  it('rejects minting past the cap, citing the supply cap', () => {
    const v = evaluateCheat('overcap')
    expect(v.accepted).toBe(false)
    expect(v.rule).toBe('supply-cap')
    expect(v.reason).toContain('21,000,000')
  })

  it("rejects spending a stranger's coins, citing the missing signature", () => {
    const v = evaluateCheat('steal')
    expect(v.accepted).toBe(false)
    expect(v.rule).toBe('signature')
    expect(v.reason).toMatch(/signature|key/i)
  })

  it('every cheat except the honest one is rejected (exhaustive over the menu)', () => {
    for (const cheat of CHEATS) {
      const v = evaluateCheat(cheat.id)
      if (cheat.id === 'straight') expect(v.accepted).toBe(true)
      else expect(v.accepted).toBe(false)
    }
  })

  it('exactly the honest reward passes; one satoshi more fails', () => {
    const honest = blockForCheat('straight')
    expect(validateBlock(honest).accepted).toBe(true)
    const greedy = { ...honest, rewardBtc: honest.rewardBtc + 0.00000001 }
    expect(validateBlock(greedy).accepted).toBe(false)
    expect(validateBlock(greedy).rule).toBe('subsidy')
  })

  it('the cap and subsidy are the real fixed numbers', () => {
    expect(MAX_SUPPLY_BTC).toBe(21_000_000)
    expect(BLOCK_SUBSIDY_BTC).toBe(3.125) // post-2024 halving
  })

  it('checks signature before cap before subsidy (first broken rule wins)', () => {
    // A block that breaks all three reports the signature failure first.
    const v = validateBlock({
      rewardBtc: 999,
      feesBtc: 0,
      mintsPastCap: true,
      spendsForeign: true,
    })
    expect(v.rule).toBe('signature')
  })
})
