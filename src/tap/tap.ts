// The data tap — the ONE module that answers "what does the network look like
// right now" (PRD Implementation Decisions). Live source first, bundled
// snapshot fallback, always exposing which mode it's in and the data's date.
// Pages never call live sources directly.

import blocksSnapshot from '../data/blocks-snapshot.json'

export interface BlockSummary {
  id: string
  height: number
  timestamp: number // unix seconds
  txCount: number
}

export interface TapResult<T> {
  mode: 'live' | 'snapshot'
  /** ISO date (YYYY-MM-DD) the data is from — the newest block's day in live
   * mode, the snapshot's retrieval day in snapshot mode. */
  dataDate: string
  data: T
}

/** Minimal fetch shape so tests can inject a fake. */
export type FetchLike = (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>

const BLOCKS_URL = 'https://mempool.space/api/v1/blocks'
const TIMEOUT_MS = 8000

interface RawBlock {
  id: string
  height: number
  timestamp: number
  tx_count: number
}

function isoDay(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10)
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms),
    ),
  ])
}

export function snapshotBlocks(): TapResult<BlockSummary[]> {
  return {
    mode: 'snapshot',
    dataDate: blocksSnapshot.retrieved,
    data: blocksSnapshot.blocks as BlockSummary[],
  }
}

export interface DataTap {
  /** Newest-first list of recent blocks. Never throws — falls back to snapshot. */
  recentBlocks(): Promise<TapResult<BlockSummary[]>>
}

export function createDataTap(fetchFn?: FetchLike, timeoutMs = TIMEOUT_MS): DataTap {
  const doFetch: FetchLike = fetchFn ?? ((url) => fetch(url))
  return {
    async recentBlocks() {
      try {
        const res = await withTimeout(doFetch(BLOCKS_URL), timeoutMs)
        if (!res.ok) throw new Error('live source not ok')
        const raw = (await res.json()) as RawBlock[]
        if (!Array.isArray(raw) || raw.length === 0) throw new Error('empty response')
        const data = raw.map((b) => ({
          id: b.id,
          height: b.height,
          timestamp: b.timestamp,
          txCount: b.tx_count,
        }))
        return { mode: 'live' as const, dataDate: isoDay(data[0].timestamp), data }
      } catch {
        return snapshotBlocks()
      }
    },
  }
}
