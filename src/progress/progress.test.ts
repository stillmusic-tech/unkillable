// Progress-record tests — the campaign blob that the armoury (FAILED stamps)
// and report card both read. We test through a fake Storage so no browser is
// needed; the key behaviour is: attempts persist, quantum is pending not
// failed, and malformed/foreign data resets rather than crashes.

import { describe, expect, it } from 'vitest'
import {
  ATTACK_IDS,
  emptyRecord,
  loadProgress,
  markAttempted,
  parseRecord,
  saveProgress,
  summarise,
  verdictFor,
  type StorageLike,
} from './progress'

function fakeStorage(seed?: string): StorageLike {
  const m = new Map<string, string>()
  if (seed !== undefined) m.set('unkillable.progress.v1', seed)
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
  }
}

describe('progress record', () => {
  it('starts empty', () => {
    const s = fakeStorage()
    const r = loadProgress(s)
    expect(r.outcomes).toEqual({})
    expect(summarise(r).attempted).toBe(0)
  })

  it('marks an attack failed and persists it', () => {
    const s = fakeStorage()
    markAttempted(s, 'hack')
    const reloaded = loadProgress(s)
    expect(verdictFor(reloaded, 'hack')).toBe('failed')
  })

  it('marks quantum pending, never failed', () => {
    const s = fakeStorage()
    markAttempted(s, 'quantum')
    expect(verdictFor(loadProgress(s), 'quantum')).toBe('pending')
  })

  it('a full campaign is six failed + one pending', () => {
    const s = fakeStorage()
    for (const id of ATTACK_IDS) markAttempted(s, id)
    const sum = summarise(loadProgress(s))
    expect(sum.failed).toBe(6)
    expect(sum.pending).toBe(1)
    expect(sum.complete).toBe(true)
  })

  it('survives a round-trip through storage (browser-restart proxy)', () => {
    const s = fakeStorage()
    markAttempted(s, 'ban')
    markAttempted(s, 'print')
    // Simulate a fresh page load: new reader over the same backing store.
    const raw = s.getItem('unkillable.progress.v1')
    const s2 = fakeStorage(raw ?? undefined)
    const sum = summarise(loadProgress(s2))
    expect(sum.failed).toBe(2)
  })

  it('resets malformed JSON to empty', () => {
    expect(parseRecord('{not json').outcomes).toEqual({})
    expect(parseRecord(null).outcomes).toEqual({})
  })

  it('ignores foreign version and unknown attack ids', () => {
    expect(parseRecord(JSON.stringify({ version: 99, outcomes: { hack: 'failed' } })).outcomes).toEqual(
      {},
    )
    const r = parseRecord(
      JSON.stringify({ version: 1, outcomes: { hack: 'failed', bogus: 'failed', ban: 'nonsense' } }),
    )
    expect(r.outcomes).toEqual({ hack: 'failed' })
  })

  it('emptyRecord and saveProgress agree on shape', () => {
    const s = fakeStorage()
    saveProgress(s, emptyRecord())
    expect(loadProgress(s)).toEqual(emptyRecord())
  })
})
