// Globe logic tests — the rendering is human-judged, but the node
// bookkeeping that Attack 2 stands on (kill a region, count survivors, revive)
// is pure and must hold. We test through a fake canvas so createGlobe runs
// headless.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createGlobe, type GlobeNode } from './globe'

// Minimal 2D-context + canvas stubs — enough for createGlobe to construct and
// for one draw frame not to throw. We never assert on pixels.
function fakeCanvas(): HTMLCanvasElement {
  const ctx = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === 'createRadialGradient')
          return () => ({ addColorStop: () => {} })
        if (prop === 'canvas') return canvas
        return () => {}
      },
    },
  )
  const listeners: Record<string, unknown> = {}
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: 600, height: 400, left: 0, top: 0 }),
    addEventListener: (k: string, fn: unknown) => (listeners[k] = fn),
    removeEventListener: () => {},
  } as unknown as HTMLCanvasElement
  return canvas
}

beforeEach(() => {
  // Headless globals createGlobe touches.
  vi.stubGlobal('requestAnimationFrame', () => 0)
  vi.stubGlobal('window', {
    devicePixelRatio: 1,
    addEventListener: () => {},
    removeEventListener: () => {},
  })
})

const nodes: GlobeNode[] = [
  { lat: 51, lon: 0 }, // London
  { lat: 40, lon: -74 }, // New York
  { lat: 35, lon: 139 }, // Tokyo
  { lat: -33, lon: 151 }, // Sydney
  { lat: 22, lon: 114 }, // Hong Kong
]

describe('globe node bookkeeping (Attack 2 substrate)', () => {
  it('starts with every node alive', () => {
    const g = createGlobe(fakeCanvas(), nodes)
    expect(g.aliveCount()).toBe(nodes.length)
    g.destroy()
  })

  it('killWhere darkens only matching nodes and returns the count', () => {
    const g = createGlobe(fakeCanvas(), nodes)
    const killed = g.killWhere((n) => n.lon > 100) // Tokyo, Sydney, Hong Kong
    expect(killed).toBe(3)
    expect(g.aliveCount()).toBe(2)
    g.destroy()
  })

  it('killing every node still leaves the structure intact and revivable', () => {
    const g = createGlobe(fakeCanvas(), nodes)
    g.killWhere(() => true)
    expect(g.aliveCount()).toBe(0)
    g.reviveAll()
    expect(g.aliveCount()).toBe(nodes.length)
    g.destroy()
  })

  it('setNodes replaces the set and marks all alive', () => {
    const g = createGlobe(fakeCanvas(), nodes)
    g.killWhere(() => true)
    g.setNodes([{ lat: 0, lon: 0 }, { lat: 10, lon: 10 }])
    expect(g.aliveCount()).toBe(2)
    g.destroy()
  })

  it('killIndices kills only the named nodes and reports the count', () => {
    const g = createGlobe(fakeCanvas(), nodes)
    expect(g.killIndices([0, 2, 2])).toBe(2) // duplicate counted once
    expect(g.aliveCount()).toBe(nodes.length - 2)
    g.destroy()
  })

  it('getNodes returns a detached copy that cannot mutate internal state', () => {
    const g = createGlobe(fakeCanvas(), nodes)
    const copy = g.getNodes()
    copy[0].alive = false
    expect(g.aliveCount()).toBe(nodes.length) // untouched
    g.destroy()
  })

  it('darkEarth kills everything, and reviveAll brings it all back', () => {
    const g = createGlobe(fakeCanvas(), nodes)
    g.darkEarth()
    expect(g.aliveCount()).toBe(0)
    g.reviveAll()
    expect(g.aliveCount()).toBe(nodes.length)
    g.destroy()
  })
})
