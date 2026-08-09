// Attack 2 engine tests — the invariant the whole attack teaches: no kill-set
// silences the network. Plus the geo helpers the visual layer leans on.

import { describe, expect, it } from 'vitest'
import {
  angularDistanceDeg,
  isChinaRegion,
  killStats,
  MODE_RADIUS_DEG,
  nearestNode,
  networkOperational,
  nodesWithin,
  type GeoNode,
} from './engine'

const world: GeoNode[] = [
  { lat: 51.5, lon: -0.1 }, // London
  { lat: 51.4, lon: -0.2 }, // London-ish (same city)
  { lat: 40.7, lon: -74 }, // New York
  { lat: 35.7, lon: 139.7 }, // Tokyo
  { lat: 39.9, lon: 116.4 }, // Beijing
  { lat: 31.2, lon: 121.5 }, // Shanghai
  { lat: -33.9, lon: 151.2 }, // Sydney
]

describe('geo helpers', () => {
  it('angular distance is ~0 for a point to itself and ~180 for antipodes', () => {
    expect(angularDistanceDeg({ lat: 0, lon: 0 }, { lat: 0, lon: 0 })).toBeCloseTo(0, 5)
    expect(angularDistanceDeg({ lat: 0, lon: 0 }, { lat: 0, lon: 180 })).toBeCloseTo(180, 3)
  })

  it('nearestNode finds the closest node to a click', () => {
    const i = nearestNode(world, { lat: 51, lon: 0 })
    expect([0, 1]).toContain(i) // one of the two London nodes
  })

  it('city radius catches a metro cluster but not another continent', () => {
    const near = nodesWithin(world, { lat: 51.5, lon: -0.1 }, MODE_RADIUS_DEG.city)
    expect(near.sort()).toEqual([0, 1]) // both Londons, nothing else
  })

  it('country radius sweeps up a whole nation, not the planet', () => {
    const cn = nodesWithin(world, { lat: 35, lon: 103 }, MODE_RADIUS_DEG.country)
    // Beijing + Shanghai fall in; Sydney and New York do not.
    expect(cn).toContain(4)
    expect(cn).toContain(5)
    expect(cn).not.toContain(2)
    expect(cn).not.toContain(6)
  })

  it('flags the China region for the historical footnote', () => {
    expect(isChinaRegion({ lat: 35, lon: 103 })).toBe(true)
    expect(isChinaRegion({ lat: 40.7, lon: -74 })).toBe(false)
  })
})

describe('the survival invariant — no kill-set silences the network', () => {
  it('is operational with every node alive', () => {
    expect(networkOperational(world)).toBe(true)
    expect(killStats(world).operational).toBe(true)
  })

  it('is still operational after killing every single node', () => {
    const dark = world.map((n) => ({ ...n, alive: false }))
    expect(networkOperational(dark)).toBe(true)
    const stats = killStats(dark)
    expect(stats.killed).toBe(world.length)
    expect(stats.running).toBe(0)
    expect(stats.operational).toBe(true)
  })

  it('is operational for every partial kill-set (exhaustive over subsets)', () => {
    // Brute-force all 2^7 kill combinations; the network never goes down.
    const n = world.length
    for (let mask = 0; mask < 1 << n; mask++) {
      const nodes = world.map((node, i) => ({ ...node, alive: (mask & (1 << i)) === 0 }))
      expect(networkOperational(nodes)).toBe(true)
    }
  })

  it('killStats counts killed and running correctly on a partial set', () => {
    const nodes = world.map((n, i) => ({ ...n, alive: i >= 3 }))
    const s = killStats(nodes)
    expect(s.total).toBe(7)
    expect(s.killed).toBe(3)
    expect(s.running).toBe(4)
  })
})
