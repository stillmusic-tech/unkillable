// Attack 6 "The uptime wall" — the brains layer (no visuals). The page's one
// hard problem is rendering 900k+ blocks as a smooth, zoomable surface. The
// answer, proven here and tested, is virtualization: never touch all 900k
// blocks — from the scroll position and zoom, compute only the bounded window
// of blocks actually on screen. Rendering cost is O(viewport), not O(chain).
// This is the Phase-11 feasibility spike, made concrete and testable.

import timeline from '../../data/timeline-events.json'

export interface TimelineEvent {
  height: number
  date: string
  kind: string
  title: string
  note: string
  source: string
}

export const EVENTS = timeline.events as TimelineEvent[]
export const GENESIS_DATE = timeline.genesisDate
export const OBITUARIES_TOTAL = timeline.obituariesTotal
export const AVG_SECONDS_PER_BLOCK = timeline.avgSecondsPerBlock

/** Zoom is expressed as blocks-per-pixel: small = zoomed in (blocks are wide),
 * large = zoomed out (whole years in a screen). Clamped to sane bounds. */
export const MIN_BLOCKS_PER_PX = 0.02 // deep zoom: ~50px per block
export const MAX_BLOCKS_PER_PX = 4000 // whole chain in a laptop screen

export function clampZoom(blocksPerPx: number): number {
  return Math.min(MAX_BLOCKS_PER_PX, Math.max(MIN_BLOCKS_PER_PX, blocksPerPx))
}

export interface VisibleWindow {
  firstBlock: number
  lastBlock: number
  /** Number of blocks in the window — ALWAYS bounded by the viewport, never
   * the chain length. This is the whole point. */
  count: number
  blocksPerPx: number
}

/**
 * Given the leftmost visible block, the zoom, the viewport width and the chain
 * tip, return the bounded window of blocks to draw (with a small overscan so
 * scrolling doesn't reveal gaps). Clamped to [0, tipHeight].
 */
export function visibleWindow(
  leftBlock: number,
  blocksPerPx: number,
  viewportWidthPx: number,
  tipHeight: number,
  overscanPx = 40,
): VisibleWindow {
  const z = clampZoom(blocksPerPx)
  const spanBlocks = (viewportWidthPx + overscanPx * 2) * z
  const first = Math.max(0, Math.floor(leftBlock - overscanPx * z))
  const last = Math.min(tipHeight, Math.ceil(first + spanBlocks))
  return {
    firstBlock: first,
    lastBlock: last,
    count: Math.max(0, last - first + 1),
    blocksPerPx: z,
  }
}

/**
 * The number of draw operations for a window — the feasibility number. When
 * zoomed in (few blocks on screen) it's one rect per block; when zoomed out
 * each screen column aggregates many blocks, so it's capped at the pixel width.
 * Either way it's bounded by the viewport, never the chain length.
 */
export function renderColumns(
  win: VisibleWindow,
  viewportWidthPx: number,
  overscanPx = 40,
): number {
  return Math.min(win.count, Math.ceil(viewportWidthPx + overscanPx * 2))
}

/** Draw operations when fully zoomed out over the whole chain — ~viewport
 * width, independent of how long the chain is. */
export function drawnColumnsAtFullZoom(viewportWidthPx: number, tipHeight: number): number {
  const z = clampZoom(tipHeight / viewportWidthPx)
  const win = visibleWindow(0, z, viewportWidthPx, tipHeight)
  return renderColumns(win, viewportWidthPx)
}

/** Pixel x of a block within the current window. */
export function blockToX(block: number, leftBlock: number, blocksPerPx: number): number {
  return (block - leftBlock) / clampZoom(blocksPerPx)
}

/** Which block sits under a pixel x (inverse of blockToX). */
export function xToBlock(x: number, leftBlock: number, blocksPerPx: number): number {
  return Math.round(leftBlock + x * clampZoom(blocksPerPx))
}

/** Approximate calendar date for a block height (labelled approximate in the
 * UI). Uses the average block interval from genesis — accurate to weeks, which
 * is all a 17-year wall needs. Returns YYYY-MM-DD. */
export function approxDateForHeight(height: number): string {
  const genesisMs = new Date(GENESIS_DATE + 'T00:00:00Z').getTime()
  const ms = genesisMs + height * AVG_SECONDS_PER_BLOCK * 1000
  return new Date(ms).toISOString().slice(0, 10)
}

/** Events whose height falls inside a window — the only ones worth drawing. */
export function eventsInWindow(win: VisibleWindow): TimelineEvent[] {
  return EVENTS.filter((e) => e.height >= win.firstBlock && e.height <= win.lastBlock)
}

/** Days the chain has been running, from genesis to the given tip's date. */
export function daysRunning(nowMs: number): number {
  const genesisMs = new Date(GENESIS_DATE + 'T00:00:00Z').getTime()
  return Math.floor((nowMs - genesisMs) / 86_400_000)
}
