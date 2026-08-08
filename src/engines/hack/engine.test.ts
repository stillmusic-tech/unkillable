import { describe, expect, it } from 'vitest'
import {
  checkAgainstSnapshot,
  flipsToPrivateKey,
  keyToHex,
  privateKeyToAddress,
  randomFlips,
  type CoinFlip,
  type RichSnapshot,
} from './engine'
import snapshot from '../../data/rich-snapshot.stub.json'

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

describe('privateKeyToAddress', () => {
  it('derives the canonical address for the key 1 (golden vector)', () => {
    const key = new Uint8Array(32)
    key[31] = 1
    expect(privateKeyToAddress(key)).toBe('1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH')
  })
})

describe('checkAgainstSnapshot', () => {
  it('a freshly flipped key never matches the rich snapshot', () => {
    for (let i = 0; i < 200; i++) {
      const address = privateKeyToAddress(flipsToPrivateKey(randomFlips()))
      expect(checkAgainstSnapshot(address, richSnapshot)).toBeNull()
    }
  })

  it('a planted fixture key DOES match — the check is real, not rigged', () => {
    const fixtureKey = flipsToPrivateKey([
      ...(Array(255).fill(0) as CoinFlip[]),
      1 as CoinFlip,
    ])
    const fixtureAddress = privateKeyToAddress(fixtureKey)
    const planted: RichSnapshot = {
      source: 'test fixture',
      retrieved: '2026-08-08',
      entries: [
        { address: fixtureAddress, label: 'planted vault', btc: 42 },
        ...richSnapshot.entries,
      ],
    }
    const match = checkAgainstSnapshot(fixtureAddress, planted)
    expect(match).not.toBeNull()
    expect(match?.label).toBe('planted vault')
  })
})
