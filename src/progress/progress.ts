// The visitor's campaign record — the one small versioned blob in the
// browser's local storage (PRD Schema decision: no database). Records which
// attacks the visitor has run and how they ended. Born in Phase 6 (the
// armoury reads FAILED stamps from it); the report card (Phase 14) reads the
// same record. Pure and injectable so it tests without a real browser.

export const ATTACK_IDS = [
  'hack',
  'shut-down',
  '51-percent',
  'ban',
  'print',
  'time',
  'quantum',
] as const

export type AttackId = (typeof ATTACK_IDS)[number]

/** How an attack ended. 'failed' = the visitor ran it and the network held.
 * 'pending' = the honest verdict we refuse to call (quantum only). */
export type Verdict = 'failed' | 'pending'

export interface ProgressRecord {
  version: 1
  /** attackId → verdict, present only once the visitor has run that attack. */
  outcomes: Partial<Record<AttackId, Verdict>>
}

const STORAGE_KEY = 'unkillable.progress.v1'
const CURRENT_VERSION = 1 as const

export function emptyRecord(): ProgressRecord {
  return { version: CURRENT_VERSION, outcomes: {} }
}

/** Minimal Storage shape so tests can pass a fake. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function isAttackId(x: unknown): x is AttackId {
  return typeof x === 'string' && (ATTACK_IDS as readonly string[]).includes(x)
}

/** Parse a stored blob defensively — anything malformed or from a future
 * version resets to empty rather than throwing. */
export function parseRecord(raw: string | null): ProgressRecord {
  if (!raw) return emptyRecord()
  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      (parsed as { version?: unknown }).version !== CURRENT_VERSION
    ) {
      return emptyRecord()
    }
    const outcomes: Partial<Record<AttackId, Verdict>> = {}
    const src = (parsed as { outcomes?: Record<string, unknown> }).outcomes ?? {}
    for (const [k, v] of Object.entries(src)) {
      if (isAttackId(k) && (v === 'failed' || v === 'pending')) outcomes[k] = v
    }
    return { version: CURRENT_VERSION, outcomes }
  } catch {
    return emptyRecord()
  }
}

export function loadProgress(storage: StorageLike): ProgressRecord {
  return parseRecord(storage.getItem(STORAGE_KEY))
}

export function saveProgress(storage: StorageLike, record: ProgressRecord): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(record))
}

/** Record that an attack was run. Quantum always resolves to 'pending'; every
 * other attack to 'failed'. Returns the updated record (also persisted). */
export function markAttempted(storage: StorageLike, id: AttackId): ProgressRecord {
  const record = loadProgress(storage)
  record.outcomes[id] = id === 'quantum' ? 'pending' : 'failed'
  saveProgress(storage, record)
  return record
}

export function verdictFor(record: ProgressRecord, id: AttackId): Verdict | undefined {
  return record.outcomes[id]
}

export interface CampaignSummary {
  failed: number
  pending: number
  attempted: number
  total: number
  complete: boolean
}

export function summarise(record: ProgressRecord): CampaignSummary {
  const values = Object.values(record.outcomes)
  const failed = values.filter((v) => v === 'failed').length
  const pending = values.filter((v) => v === 'pending').length
  const attempted = values.length
  return {
    failed,
    pending,
    attempted,
    total: ATTACK_IDS.length,
    complete: attempted === ATTACK_IDS.length,
  }
}

/** Browser-side convenience: the real localStorage, or a no-op if unavailable
 * (private mode, SSR). Never throws. */
export function browserStorage(): StorageLike {
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__unkillable_probe__'
      localStorage.setItem(probe, '1')
      localStorage.removeItem(probe)
      return localStorage
    }
  } catch {
    /* fall through to memory */
  }
  const mem = new Map<string, string>()
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
  }
}
