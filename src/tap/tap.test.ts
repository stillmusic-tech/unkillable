// Data-tap tests — PRD Testing Decisions, seam 2: simulate the live source
// being down and assert the page still receives numbers, flagged as
// snapshot-mode with the snapshot's date. Live-mode responses pass through
// unaltered.

import { describe, expect, it } from 'vitest'
import snapshot from '../data/blocks-snapshot.json'
import { createDataTap, type FetchLike } from './tap'

const liveBlocks = [
  {
    id: 'abc',
    height: 970001,
    timestamp: 1790000600,
    tx_count: 3210,
    size: 1_420_000,
  },
  {
    id: 'def',
    height: 970000,
    timestamp: 1790000000,
    tx_count: 2500,
    size: 1_680_000,
  },
]

const okFetch: FetchLike = async () => ({
  ok: true,
  json: async () => liveBlocks,
})
const downFetch: FetchLike = async () => {
  throw new Error('network unreachable')
}
const errorFetch: FetchLike = async () => ({
  ok: false,
  json: async () => ({}),
})
const hangingFetch: FetchLike = () => new Promise(() => {}) // never resolves

describe('data tap — live mode', () => {
  it('passes live blocks through unaltered, flagged live, dated by newest block', async () => {
    const tap = createDataTap(okFetch)
    const result = await tap.recentBlocks()
    expect(result.mode).toBe('live')
    expect(result.data).toEqual([
      {
        id: 'abc',
        height: 970001,
        timestamp: 1790000600,
        txCount: 3210,
        sizeBytes: 1_420_000,
      },
      {
        id: 'def',
        height: 970000,
        timestamp: 1790000000,
        txCount: 2500,
        sizeBytes: 1_680_000,
      },
    ])
    expect(result.dataDate).toBe(new Date(1790000600 * 1000).toISOString().slice(0, 10))
  })
})

describe('data tap — snapshot fallback', () => {
  it('falls back when the live source is unreachable', async () => {
    const tap = createDataTap(downFetch)
    const result = await tap.recentBlocks()
    expect(result.mode).toBe('snapshot')
    expect(result.dataDate).toBe(snapshot.retrieved)
    expect(result.data.length).toBeGreaterThan(0)
  })

  it('falls back when the live source answers with an error', async () => {
    const tap = createDataTap(errorFetch)
    const result = await tap.recentBlocks()
    expect(result.mode).toBe('snapshot')
    expect(result.dataDate).toBe(snapshot.retrieved)
  })

  it('falls back when the live source hangs past the timeout', async () => {
    const tap = createDataTap(hangingFetch, 50)
    const result = await tap.recentBlocks()
    expect(result.mode).toBe('snapshot')
  })
})

describe('bundled snapshot sanity', () => {
  it('carries a source, a date, and a plausible chain of blocks', () => {
    expect(snapshot.source).toContain('mempool.space')
    expect(snapshot.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(snapshot.blocks.length).toBeGreaterThanOrEqual(10)
    // Newest first, strictly descending heights.
    for (let i = 1; i < snapshot.blocks.length; i++) {
      expect(snapshot.blocks[i].height).toBe(snapshot.blocks[i - 1].height - 1)
    }
  })
})

describe('data tap — mempool', () => {
  it('passes the live waiting-transaction count through, flagged live', async () => {
    const mempoolFetch: FetchLike = async () => ({
      ok: true,
      json: async () => ({ count: 87515 }),
    })
    const tap = createDataTap(mempoolFetch)
    const result = await tap.mempoolTxCount()
    expect(result.mode).toBe('live')
    expect(result.data).toBe(87515)
  })

  it('falls back to the bundled mempool snapshot when live is down', async () => {
    const tap = createDataTap(downFetch)
    const result = await tap.mempoolTxCount()
    expect(result.mode).toBe('snapshot')
    expect(result.data).toBeGreaterThan(0)
    expect(result.dataDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

const liveNodes = {
  timestamp: 1790000000,
  total_nodes: 27000,
  coordinates: Array.from({ length: 5000 }, (_, i) => [(i % 170) - 85, (i % 350) - 175]),
}
const okNodeFetch: FetchLike = async () => ({
  ok: true,
  json: async () => liveNodes,
})

describe('data tap — nodes', () => {
  it('thins a huge live list to a drawable sample, flagged live', async () => {
    const tap = createDataTap(okNodeFetch)
    const result = await tap.nodes()
    expect(result.mode).toBe('live')
    expect(result.data.points.length).toBeGreaterThan(0)
    expect(result.data.points.length).toBeLessThanOrEqual(400)
    expect(result.data.totalReachable).toBe(27000)
  })

  it('falls back to the bundled node snapshot when live is down', async () => {
    const tap = createDataTap(downFetch)
    const result = await tap.nodes()
    expect(result.mode).toBe('snapshot')
    expect(result.data.points.length).toBeGreaterThan(50)
    expect(result.data.totalReachable).toBeGreaterThan(1000)
  })
})
