// Attack 5 "Print more of it" — the brains layer (no visuals). Models writing
// the next block yourself and having every node check it against the rulebook.
// The tested invariant: every cheat block is rejected with the correct reason,
// and an honest block is accepted. This layer is the tested surface.

/** The cap that every copy of the software checks, everywhere, forever. */
export const MAX_SUPPLY_BTC = 21_000_000

/** Current block subsidy (post-April-2024 halving). New coins per block. */
export const BLOCK_SUBSIDY_BTC = 3.125

/** A block the visitor has written. Fees are what senders attached; a legal
 * coinbase pays the subsidy plus those fees, nothing more. */
export interface DraftBlock {
  /** BTC the miner pays themselves in the coinbase. */
  rewardBtc: number
  /** Fees legitimately attached by the transactions included. */
  feesBtc: number
  /** Tries to create coins beyond the 21,000,000 cap. */
  mintsPastCap: boolean
  /** Tries to move coins from a wallet whose key the miner doesn't hold. */
  spendsForeign: boolean
}

export interface Verdict {
  accepted: boolean
  /** Short rule name that failed (empty when accepted). */
  rule: string
  /** One-line reason a node gives. */
  reason: string
}

function allowedReward(block: DraftBlock): number {
  return BLOCK_SUBSIDY_BTC + Math.max(0, block.feesBtc)
}

/** Run the block past the rulebook, in the order a node checks. The first rule
 * it breaks is the one reported — every independent node reaches the same
 * verdict alone, with no committee and no vote. */
export function validateBlock(block: DraftBlock): Verdict {
  if (block.spendsForeign) {
    return {
      accepted: false,
      rule: 'signature',
      reason:
        'That payment spends coins locked by a key you don’t hold — there’s no valid signature. Rejected.',
    }
  }
  if (block.mintsPastCap) {
    return {
      accepted: false,
      rule: 'supply-cap',
      reason: `That would create coins beyond the ${MAX_SUPPLY_BTC.toLocaleString('en-GB')} cap. Rejected.`,
    }
  }
  // Round to satoshis to avoid float noise before comparing.
  const reward = Math.round(block.rewardBtc * 1e8)
  const allowed = Math.round(allowedReward(block) * 1e8)
  if (reward > allowed) {
    return {
      accepted: false,
      rule: 'subsidy',
      reason: `Your coinbase pays ${block.rewardBtc} BTC but the rules allow only ${allowedReward(block)} BTC (subsidy + fees). Rejected.`,
    }
  }
  return {
    accepted: true,
    rule: '',
    reason: 'Accepted. This is the only version of you the network will ever pay.',
  }
}

/** The escalating cheat menu; each preset builds a concrete DraftBlock. */
export type CheatId = 'straight' | 'triple' | 'overcap' | 'steal'

export interface Cheat {
  id: CheatId
  icon: string
  label: string
}

export const CHEATS: Cheat[] = [
  { id: 'straight', icon: '😇', label: 'Play it straight' },
  { id: 'triple', icon: '💰', label: 'Triple your pay' },
  { id: 'overcap', icon: '🪙', label: 'Mine coin 21,000,001' },
  { id: 'steal', icon: '✍️', label: "Spend someone else's coins" },
]

const STANDARD_FEES = 0.15

export function blockForCheat(id: CheatId): DraftBlock {
  const base: DraftBlock = {
    rewardBtc: BLOCK_SUBSIDY_BTC + STANDARD_FEES,
    feesBtc: STANDARD_FEES,
    mintsPastCap: false,
    spendsForeign: false,
  }
  switch (id) {
    case 'straight':
      return base
    case 'triple':
      return { ...base, rewardBtc: BLOCK_SUBSIDY_BTC * 3 }
    case 'overcap':
      return { ...base, mintsPastCap: true }
    case 'steal':
      return { ...base, spendsForeign: true }
  }
}

export function evaluateCheat(id: CheatId): Verdict {
  return validateBlock(blockForCheat(id))
}
