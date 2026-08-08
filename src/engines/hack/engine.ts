// Attack 1 engine — "Just hack it".
// Pure brains layer: coin flips in, real keys and verdicts out. No visuals.
// Tested through this public interface (see engine.test.ts).

import { sha256 } from '@noble/hashes/sha2'
import { ripemd160 } from '@noble/hashes/legacy'
import { getPublicKey } from '@noble/secp256k1'
import { base58 } from '@scure/base'

/** One coin flip: heads = 1, tails = 0. */
export type CoinFlip = 0 | 1

export interface SnapshotEntry {
  address: string
  label: string
  btc: number
}

export interface RichSnapshot {
  source: string
  retrieved: string
  entries: SnapshotEntry[]
}

/**
 * Turn exactly 256 coin flips into a real Bitcoin private key.
 * Throws if the flip count is wrong, or in the astronomically rare case
 * (odds ~1 in 2^128) that the resulting number falls outside the valid
 * key range — callers just flip again.
 */
export function flipsToPrivateKey(flips: readonly CoinFlip[]): Uint8Array {
  if (flips.length !== 256) {
    throw new Error(`a Bitcoin key needs exactly 256 coin flips, got ${flips.length}`)
  }
  const key = new Uint8Array(32)
  for (let i = 0; i < 256; i++) {
    if (flips[i] === 1) key[i >> 3] |= 0x80 >> (i & 7)
  }
  getPublicKey(key, true) // validates the key is in range; throws otherwise
  return key
}

/** Flip 256 fair coins using the browser's cryptographic randomness. */
export function randomFlips(): CoinFlip[] {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const flips: CoinFlip[] = []
  for (let i = 0; i < 256; i++) {
    flips.push(((bytes[i >> 3] >> (7 - (i & 7))) & 1) as CoinFlip)
  }
  return flips
}

/** Derive the legacy (P2PKH, "1…") Bitcoin address this key unlocks. */
export function privateKeyToAddress(privateKey: Uint8Array): string {
  const publicKey = getPublicKey(privateKey, true)
  const hash = ripemd160(sha256(publicKey))
  const payload = new Uint8Array(21)
  payload[0] = 0x00
  payload.set(hash, 1)
  const checksum = sha256(sha256(payload)).slice(0, 4)
  const full = new Uint8Array(25)
  full.set(payload)
  full.set(checksum, 21)
  return base58.encode(full)
}

export function keyToHex(key: Uint8Array): string {
  return Array.from(key, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * The knife-is-real check: does this address hold anyone's coins?
 * Returns the matched snapshot entry (a genuine theft target) or null.
 */
export function checkAgainstSnapshot(
  address: string,
  snapshot: RichSnapshot,
): SnapshotEntry | null {
  return snapshot.entries.find((e) => e.address === address) ?? null
}
