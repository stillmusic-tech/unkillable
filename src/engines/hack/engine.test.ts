import { describe, expect, it } from 'vitest'
import {
  checkAgainstSnapshot,
  flipsToPrivateKey,
  keyToHex,
  passphraseToPrivateKey,
  privateKeyToAddress,
  privateKeyToAddresses,
  randomFlips,
  type CoinFlip,
  type RichSnapshot,
} from './engine'
import snapshot from '../../data/rich-snapshot.json'

const richSnapshot = snapshot as RichSnapshot

describe('flipsToPrivateKey', () => {
  it('rejects anything but exactly 256 flips', () => {
    expect(() => flipsToPrivateKey([])).toThrow(/256/)
    expect(() => flipsToPrivateKey(Array(255).fill(0) as CoinFlip[])).toThrow(/256/)
    expect(() => flipsToPrivateKey(Array(257).fill(0) as CoinFlip[])).toThrow(/256/)
  })

  it('rejects the all-tails key (zero is not a valid key)', () => {
    expect(() => flipsToPrivateKey(Array(256).fill(0) as CoinFlip[])).toThrow()
  })

  it('is deterministic: 255 tails then one heads is the key 0x…01', () => {
    const flips = [...(Array(255).fill(0) as CoinFlip[]), 1 as CoinFlip]
    const key = flipsToPrivateKey(flips)
    expect(keyToHex(key)).toBe('0'.repeat(63) + '1')
  })
})

// The key 1 has published address vectors for every standard shape, so it pins
// all three derivations at once (legacy + native SegWit are canonical BIP test
// vectors).
const KEY_ONE = (() => {
  const k = new Uint8Array(32)
  k[31] = 1
  return k
})()

describe('privateKeyToAddresses (golden vectors for key = 1)', () => {
  it('derives the legacy "1…" address', () => {
    expect(privateKeyToAddress(KEY_ONE)).toBe('1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH')
  })

  it('derives the native SegWit "bc1…" address (BIP173 vector)', () => {
    expect(privateKeyToAddresses(KEY_ONE).native).toBe(
      'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    )
  })

  it('derives the nested SegWit "3…" address', () => {
    const nested = privateKeyToAddresses(KEY_ONE).nested
    expect(nested.startsWith('3')).toBe(true)
    expect(nested).toBe('3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN')
  })
})

describe('passphraseToPrivateKey (brain wallet)', () => {
  it('is a single SHA-256 of the words — deterministic and instant', () => {
    // sha256("") = e3b0c442... : the canonical empty-string digest.
    const key = passphraseToPrivateKey('')
    expect(keyToHex(key)).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })

  it('different phrases give different keys', () => {
    expect(keyToHex(passphraseToPrivateKey('password'))).not.toBe(
      keyToHex(passphraseToPrivateKey('bitcoin')),
    )
  })
})

describe('checkAgainstSnapshot', () => {
  it('a freshly flipped key never matches the real rich-list snapshot', () => {
    for (let i = 0; i < 200; i++) {
      const addresses = privateKeyToAddresses(flipsToPrivateKey(randomFlips()))
      expect(checkAgainstSnapshot(addresses, richSnapshot)).toBeNull()
    }
  })

  it('checks every derived address shape, not just the legacy one', () => {
    // Plant a fixture on the key's bech32 address; the check must still catch it.
    const addresses = privateKeyToAddresses(KEY_ONE)
    const planted: RichSnapshot = {
      source: 'test fixture',
      retrieved: '2026-08-08',
      entries: [{ address: addresses.native, label: 'planted bech32 vault', btc: 42 }],
    }
    const match = checkAgainstSnapshot(addresses, planted)
    expect(match?.label).toBe('planted bech32 vault')
  })

  it('a planted fixture key DOES match — the check is real, not rigged', () => {
    const fixtureAddress = privateKeyToAddress(KEY_ONE)
    const planted: RichSnapshot = {
      source: 'test fixture',
      retrieved: '2026-08-08',
      entries: [
        { address: fixtureAddress, label: 'planted vault', btc: 42 },
        ...richSnapshot.entries,
      ],
    }
    const match = checkAgainstSnapshot(fixtureAddress, planted)
    expect(match?.label).toBe('planted vault')
  })
})

describe('the bundled rich-list snapshot', () => {
  it('is a real dated dataset with entries', () => {
    expect(richSnapshot.entries.length).toBeGreaterThan(50)
    expect(richSnapshot.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(richSnapshot.source).toBeTruthy()
  })
})
