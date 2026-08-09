// The sourcing sweep (Phase 16), as an enforced test: every bundled dataset the
// site ships must carry a named source and a printed last-updated date. If a
// future dataset is added without them, this fails — the honesty pledge can't
// silently rot.

import { describe, expect, it } from 'vitest'
import blocks from './blocks-snapshot.json'
import nodes from './nodes-snapshot.json'
import hashrate from './hashrate-snapshot.json'
import rich from './rich-snapshot.json'
import weak from './weak-passphrases.json'
import shop from './mining-shop.json'
import countries from './mining-by-country.json'
import china from './china-2021.json'
import timeline from './timeline-events.json'
import quantum from './quantum-facts.json'

const datasets: Record<string, { source?: string; retrieved?: string }> = {
  'blocks-snapshot': blocks,
  'nodes-snapshot': nodes,
  'hashrate-snapshot': hashrate,
  'rich-snapshot': rich,
  'weak-passphrases': weak,
  'mining-shop': shop,
  'mining-by-country': countries,
  'china-2021': china,
  'timeline-events': timeline,
  'quantum-facts': quantum,
}

describe('sourcing sweep — every bundled dataset is sourced and dated', () => {
  for (const [name, data] of Object.entries(datasets)) {
    it(`${name} has a named source`, () => {
      expect(typeof data.source).toBe('string')
      expect((data.source ?? '').length).toBeGreaterThan(10)
    })
    it(`${name} prints a last-updated date`, () => {
      // Either an ISO date or at least a 4-digit year.
      expect(data.retrieved).toBeDefined()
      expect(String(data.retrieved)).toMatch(/\d{4}/)
    })
  }
})
