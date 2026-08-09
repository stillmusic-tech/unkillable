// Attack 7 engine tests — the honesty is testable: mining/modern/today are safe
// now, exactly the old exposed wallets are the real threat, the qubit gap is
// enormous, and the verdict is pending — never 'failed'.

import { describe, expect, it } from 'vitest'
import {
  QUBITS_NEEDED,
  QUBITS_TODAY,
  TARGETS,
  exposedTargets,
  qubitGap,
  targetById,
  verdict,
} from './engine'

describe('quantum targeting', () => {
  it('offers exactly four targets', () => {
    expect(TARGETS).toHaveLength(4)
  })

  it('mining, a modern wallet, and firing today are all safe now', () => {
    expect(targetById('mining')?.vulnerable).toBe(false)
    expect(targetById('modern')?.vulnerable).toBe(false)
    expect(targetById('today')?.vulnerable).toBe(false)
  })

  it('only the old exposed wallets are genuinely vulnerable', () => {
    const exposed = exposedTargets()
    expect(exposed).toHaveLength(1)
    expect(exposed[0].id).toBe('old')
  })

  it('every target has a reaction that explains itself', () => {
    for (const t of TARGETS) expect(t.reaction.length).toBeGreaterThan(20)
  })
})

describe('the gap and the verdict', () => {
  it('needs vastly more qubits than exist today', () => {
    const gap = qubitGap()
    expect(gap.today).toBe(QUBITS_TODAY)
    expect(gap.needed).toBe(QUBITS_NEEDED)
    expect(gap.factor).toBeGreaterThan(100) // orders of magnitude
  })

  it('holds the verdict as pending — never declares it failed', () => {
    expect(verdict()).toBe('pending')
  })
})
