// The data tap — the ONE module that answers "what does the network look like
// right now" (PRD Implementation Decisions). Live source first, bundled
// snapshot fallback, always exposing which mode it's in and the data's date.
// Pages never call live sources directly.

import blocksSnapshot from '../data/blocks-snapshot.json'
import nodesSnapshot from '../data/nodes-snapshot.json'
import hashrateSnapshot from '../data/hashrate-snapshot.json'
import mempoolSnapshot from '../data/mempool-snapshot.json'

export interface BlockSummary {
  id: string
  height: number
  timestamp: number // unix seconds
  txCount: number
  sizeBytes?: number
}

export interface NodePoint {
  lat: number
  lon: number
}

export interface NodeInfo {
  /** Representative sample of node coordinates for drawing. */
  points: NodePoint[]
  /** The real reachable-node count the sample stands in for. */
  totalReachable: number
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
const NODES_URL = 'https://bitnodes.io/api/v1/snapshots/latest/?field=coordinates'
const HASHRATE_URL = 'https://mempool.space/api/v1/mining/hashrate/3d'
const MEMPOOL_URL = 'https://mempool.space/api/mempool'
const TIMEOUT_MS = 8000
const NODE_SAMPLE_CAP = 400

interface RawBlock {
  id: string
  height: number
  timestamp: number
  tx_count: number
  size: number
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

export function snapshotNodes(): TapResult<NodeInfo> {
  return {
    mode: 'snapshot',
    dataDate: nodesSnapshot.retrieved,
    data: {
      points: nodesSnapshot.nodes as NodePoint[],
      totalReachable: nodesSnapshot.totalReachableNodes,
    },
  }
}

interface RawNodeSnapshot {
  timestamp: number
  total_nodes: number
  coordinates: [number, number][]
}

export function snapshotMempool(): TapResult<number> {
  return {
    mode: 'snapshot',
    dataDate: mempoolSnapshot.retrieved,
    data: mempoolSnapshot.txCount,
  }
}

interface RawMempool {
  count: number
}

export function snapshotHashrate(): TapResult<number> {
  return {
    mode: 'snapshot',
    dataDate: hashrateSnapshot.retrieved,
    data: hashrateSnapshot.currentHashrateEH,
  }
}

interface RawHashrate {
  currentHashrate: number // H/s
}

export interface DataTap {
  /** Newest-first list of recent blocks. Never throws — falls back to snapshot. */
  recentBlocks(): Promise<TapResult<BlockSummary[]>>
  /** Node coordinates + reachable count. Never throws — falls back to snapshot. */
  nodes(): Promise<TapResult<NodeInfo>>
  /** Whole-network mining power in EH/s. Never throws — falls back to snapshot. */
  hashrateEH(): Promise<TapResult<number>>
  /** How many transactions are waiting in the mempool. Never throws. */
  mempoolTxCount(): Promise<TapResult<number>>
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
          sizeBytes: b.size,
        }))
        return {
          mode: 'live' as const,
          dataDate: isoDay(data[0].timestamp),
          data,
        }
      } catch {
        return snapshotBlocks()
      }
    },

    async nodes() {
      try {
        const res = await withTimeout(doFetch(NODES_URL), timeoutMs)
        if (!res.ok) throw new Error('live source not ok')
        const raw = (await res.json()) as RawNodeSnapshot
        const coords = raw?.coordinates
        if (!Array.isArray(coords) || coords.length === 0) throw new Error('empty response')
        // Thin a huge live list down to a drawable, geographically-spread sample.
        const step = Math.max(1, Math.floor(coords.length / NODE_SAMPLE_CAP))
        const points: NodePoint[] = []
        for (let i = 0; i < coords.length && points.length < NODE_SAMPLE_CAP; i += step) {
          const [lat, lon] = coords[i]
          if (lat == null || lon == null || (lat === 0 && lon === 0)) continue
          points.push({ lat, lon })
        }
        if (points.length === 0) throw new Error('no usable coordinates')
        return {
          mode: 'live' as const,
          dataDate: raw.timestamp ? isoDay(raw.timestamp) : snapshotNodes().dataDate,
          data: { points, totalReachable: raw.total_nodes ?? points.length },
        }
      } catch {
        return snapshotNodes()
      }
    },

    async hashrateEH() {
      try {
        const res = await withTimeout(doFetch(HASHRATE_URL), timeoutMs)
        if (!res.ok) throw new Error('live source not ok')
        const raw = (await res.json()) as RawHashrate
        const hps = raw?.currentHashrate
        if (typeof hps !== 'number' || !isFinite(hps) || hps <= 0)
          throw new Error('bad hashrate')
        const eh = hps / 1e18
        return {
          mode: 'live' as const,
          dataDate: snapshotHashrate().dataDate,
          data: eh,
        }
      } catch {
        return snapshotHashrate()
      }
    },

    async mempoolTxCount() {
      try {
        const res = await withTimeout(doFetch(MEMPOOL_URL), timeoutMs)
        if (!res.ok) throw new Error('live source not ok')
        const raw = (await res.json()) as RawMempool
        const count = raw?.count
        if (typeof count !== 'number' || !isFinite(count) || count < 0)
          throw new Error('bad mempool count')
        return {
          mode: 'live' as const,
          dataDate: snapshotMempool().dataDate,
          data: count,
        }
      } catch {
        return snapshotMempool()
      }
    },
  }
}
