// Attack 1 engine — "Just hack it".
// Pure brains layer: coin flips (or a passphrase) in, real keys, real Bitcoin
// addresses, and honest verdicts out. No visuals. Tested through this public
// interface (see engine.test.ts).

import { sha256 } from '@noble/hashes/sha2'
import { ripemd160 } from '@noble/hashes/legacy'
import { getPublicKey } from '@noble/secp256k1'
import { base58, bech32 } from '@scure/base'

/** One coin flip: heads = 1, tails = 0. */
export type CoinFlip = 0 | 1

export interface SnapshotEntry {
  address: string
  label: string
  btc: number
}

export interface RichSnapshot {
  source: string
  sourceUrl?: string
  retrieved: string
  entries: SnapshotEntry[]
}

/** The three standard address shapes one private key can unlock. */
export interface DerivedAddresses {
  /** Legacy P2PKH — starts "1…". */
  legacy: string
  /** Nested SegWit P2SH-P2WPKH — starts "3…". */
  nested: string
  /** Native SegWit P2WPKH (bech32) — starts "bc1…". */
  native: string
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

/**
 * A real random private key, straight from cryptographic randomness — the
 * cracking loop's ammunition. Retries on the astronomically rare out-of-range
 * draw so callers always get a usable key.
 */
export function randomPrivateKey(): Uint8Array {
  for (;;) {
    const key = new Uint8Array(32)
    crypto.getRandomValues(key)
    try {
      getPublicKey(key, true)
      return key
    } catch {
      // out of range — draw again
    }
  }
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

/**
 * Turn a human-chosen passphrase into a private key the way a "brain wallet"
 * does: one SHA-256 of the words. This is the whole point of Scene 4 — a
 * passphrase collapses 2^256 down to a single guess anyone can make instantly.
 * Throws in the (vanishingly unlikely) case the hash is out of range.
 */
export function passphraseToPrivateKey(passphrase: string): Uint8Array {
  const key = sha256(new TextEncoder().encode(passphrase))
  getPublicKey(key, true) // validates range
  return key
}

/** RIPEMD-160 of SHA-256 of the compressed public key — the 20-byte "hash160". */
function hash160(publicKey: Uint8Array): Uint8Array {
  return ripemd160(sha256(publicKey))
}

/** base58check: version byte + payload + 4-byte double-SHA-256 checksum. */
function base58check(version: number, payload: Uint8Array): string {
  const body = new Uint8Array(1 + payload.length)
  body[0] = version
  body.set(payload, 1)
  const checksum = sha256(sha256(body)).slice(0, 4)
  const full = new Uint8Array(body.length + 4)
  full.set(body)
  full.set(checksum, body.length)
  return base58.encode(full)
}

/**
 * Derive all three standard Bitcoin addresses this key unlocks. Checking every
 * shape is what makes the rich-list match honest — the snapshot holds legacy,
 * P2SH and bech32 addresses, so a fair test must derive all three.
 */
export function privateKeyToAddresses(privateKey: Uint8Array): DerivedAddresses {
  const publicKey = getPublicKey(privateKey, true)
  const h160 = hash160(publicKey)

  const legacy = base58check(0x00, h160)

  // Nested SegWit: hash160 of the witness program `OP_0 <20-byte hash160>`.
  const redeemScript = new Uint8Array(22)
  redeemScript[0] = 0x00
  redeemScript[1] = 0x14
  redeemScript.set(h160, 2)
  const nested = base58check(0x05, hash160(redeemScript))

  // Native SegWit: bech32 of witness version 0 + hash160.
  const native = bech32.encode('bc', [0, ...bech32.toWords(h160)])

  return { legacy, nested, native }
}

/** Legacy ("1…") address only — kept for the golden-vector test. */
export function privateKeyToAddress(privateKey: Uint8Array): string {
  return privateKeyToAddresses(privateKey).legacy
}

export function keyToHex(key: Uint8Array): string {
  return Array.from(key, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * The knife-is-real check: does any address this key unlocks hold someone's
 * coins? Accepts one address or the full derived set. Returns the matched
 * snapshot entry (a genuine theft target) or null.
 */
export function checkAgainstSnapshot(
  address: string | DerivedAddresses,
  snapshot: RichSnapshot,
): SnapshotEntry | null {
  const candidates =
    typeof address === 'string' ? [address] : [address.legacy, address.nested, address.native]
  return snapshot.entries.find((e) => candidates.includes(e.address)) ?? null
}
