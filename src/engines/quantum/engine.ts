// Attack 7 "Quantum" — the brains layer (no visuals). The one attack the site
// refuses to declare defeated, because it hasn't been run yet. This layer holds
// the sourced facts and the targeting logic: what quantum actually threatens
// (specific exposed locks) versus what it doesn't (mining, the cap, the rules,
// modern wallets). Tested so the honesty is inspectable.

import facts from '../../data/quantum-facts.json'

export interface QuantumTarget {
  id: string
  icon: string
  label: string
  vulnerable: boolean
  reaction: string
}

export const TARGETS = facts.targets as QuantumTarget[]
export const QUBITS_TODAY = facts.qubitsToday
export const QUBITS_NEEDED = facts.qubitsNeeded
export const SHIELD_STANDARDISED_YEAR = facts.shieldStandardisedYear
export const VERDICT_LINES = facts.verdict as string[]
export const RACE = facts.race as {
  weapon: { year: number; qubits: number }[]
  shield: { year: number; progress: number }[]
  weaponLabel: string
  shieldLabel: string
}

export function targetById(id: string): QuantumTarget | undefined {
  return TARGETS.find((t) => t.id === id)
}

export interface QubitGap {
  today: number
  needed: number
  /** How many times more qubits are needed than exist — the visible gap. */
  factor: number
}

export function qubitGap(): QubitGap {
  return {
    today: QUBITS_TODAY,
    needed: QUBITS_NEEDED,
    factor: QUBITS_NEEDED / QUBITS_TODAY,
  }
}

/** The one target that's genuinely exposed today (old wallets with public
 * lock blueprints). Everything else is safe now. */
export function exposedTargets(): QuantumTarget[] {
  return TARGETS.filter((t) => t.vulnerable)
}

/** The verdict the site holds for this attack: never 'failed', never 'broken'
 * — pending, honestly. */
export type QuantumVerdict = 'pending'
export function verdict(): QuantumVerdict {
  return 'pending'
}
