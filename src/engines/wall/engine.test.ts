// Attack 6 engine tests — the feasibility proof: no matter how big the chain
// or how far zoomed out, the window of blocks we actually draw stays bounded by
// the viewport. Plus the height↔x↔date maths.

import { describe, expect, it } from 'vitest'
import {
  EVENTS,
  MAX_BLOCKS_PER_PX,
  approxDateForHeight,
  blockToX,
  clampZoom,
  drawnColumnsAtFullZoom,
  eventsInWindow,
  visibleWindow,
  xToBlock,
} from './engine'

const TIP = 961_690 // a realistic chain tip

describe('virtualization — the feasibility proof', () => {
  it('never draws more than a viewport-bounded number of blocks, even fully zoomed out', () => {
    const viewport = 1200
    const cols = drawnColumnsAtFullZoom(viewport, TIP)
    // Bounded by the pixels available (+ overscan), NOT the ~1M-block chain.
    expect(cols).toBeLessThan(viewport + 200)
  })

  it('deep zoom near the middle still returns a bounded window', () => {
    const win = visibleWindow(500_000, 0.05, 1200, TIP)
    expect(win.count).toBeLessThan(200_000) // way under the chain length
    expect(win.firstBlock).toBeGreaterThanOrEqual(0)
    expect(win.lastBlock).toBeLessThanOrEqual(TIP)
  })

  it('clamps the window to the chain ends', () => {
    const left = visibleWindow(-9999, 10, 1200, TIP)
    expect(left.firstBlock).toBe(0)
    const right = visibleWindow(TIP + 5000, 10, 1200, TIP)
    expect(right.lastBlock).toBe(TIP)
  })

  it('clamps zoom to sane bounds', () => {
    expect(clampZoom(0)).toBeGreaterThan(0)
    expect(clampZoom(1e9)).toBe(MAX_BLOCKS_PER_PX)
  })

  it('scales linearly, not with chain length — 10× tip ≈ same drawn columns', () => {
    const a = drawnColumnsAtFullZoom(1200, TIP)
    const b = drawnColumnsAtFullZoom(1200, TIP * 10)
    expect(Math.abs(a - b)).toBeLessThan(50)
  })
})

describe('coordinate maths', () => {
  it('blockToX and xToBlock round-trip', () => {
    const left = 800_000
    const z = 2.5
    const x = blockToX(800_500, left, z)
    expect(xToBlock(x, left, z)).toBeCloseTo(800_500, -1)
  })

  it('the leftmost block sits at x=0', () => {
    expect(blockToX(123_456, 123_456, 5)).toBe(0)
  })
})

describe('dates and events', () => {
  it('genesis maps to early 2009 and the tip to ~2026', () => {
    expect(approxDateForHeight(0)).toMatch(/^2009-01/)
    expect(approxDateForHeight(TIP).slice(0, 4)).toMatch(/202[567]/)
  })

  it('only returns events inside the visible window', () => {
    const win = visibleWindow(200_000, 5, 1200, TIP)
    const evs = eventsInWindow(win)
    for (const e of evs) {
      expect(e.height).toBeGreaterThanOrEqual(win.firstBlock)
      expect(e.height).toBeLessThanOrEqual(win.lastBlock)
    }
  })

  it('the dataset carries the genesis block and the halvings', () => {
    expect(EVENTS.find((e) => e.height === 0)?.kind).toBe('genesis')
    expect(EVENTS.filter((e) => e.kind === 'halving').length).toBeGreaterThanOrEqual(4)
  })
})
