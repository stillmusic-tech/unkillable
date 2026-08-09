// Page smoke tests — deliberately shallow (PRD Testing Decisions, seam 3):
// every page loads, its key labels and controls are present, no errors.

import { expect, test } from '@playwright/test'

const routes: Array<[path: string, expectedText: string]> = [
  ['/', 'UNKILLABLE'],
  ['/attack', 'Think you can stop it'],
  ['/attack/hack', 'Just hack it'],
  ['/attack/shut-down', 'Shut down the server'],
  ['/attack/51-percent', 'The 51% attack'],
  ['/attack/ban', 'Ban it'],
  ['/attack/print', 'Print more of it'],
  ['/attack/time', "It'll die eventually"],
  ['/attack/quantum', 'Quantum'],
  ['/fundamentals', 'Bitcoin Fundamentals'],
  ['/about', 'About'],
]

for (const [path, expectedText] of routes) {
  test(`${path} loads with menu, content, and no errors`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(path)
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.locator('main')).toContainText(expectedText)
    expect(errors).toEqual([])
  })
}

test('homepage: the blockchain strip shows blocks, a mode flag, and a countdown', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('#strip')).toBeVisible()
  // The tap always delivers blocks — live feed or bundled snapshot.
  await expect(page.locator('#blocks .block-tile')).not.toHaveCount(0, { timeout: 15000 })
  await expect(page.locator('#tap-mode')).toContainText(/live|snapshot/i, { timeout: 15000 })
  await expect(page.locator('#countdown')).toContainText(/next block/i, { timeout: 15000 })
})

test('homepage: the observatory globe renders with a dated node count', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#globe')).toBeVisible()
  // The canvas must actually get sized (the render loop ran).
  await expect
    .poll(async () => page.locator('#globe').evaluate((c: HTMLCanvasElement) => c.width))
    .toBeGreaterThan(0)
  await expect(page.locator('#node-count')).toContainText(/reachable nodes worldwide/i)
  await expect(page.locator('#node-count')).toContainText(/drag to spin/i)
})

test('armoury: seven weapon cards with doubts, roles, and live scars', async ({ page }) => {
  await page.goto('/attack')
  const cards = page.locator('.weapon')
  await expect(cards).toHaveCount(7)
  await expect(cards.first()).toContainText('Just hack it')
  await expect(cards.first()).toContainText(/hacker/i)
  await expect(cards.first()).toContainText(/0 keys ever guessed/i)
  await expect(page.locator('.weapon[data-attack="quantum"] .scar')).toContainText(/pending/i)
})

test('armoury: running Attack 1 stamps its card FAILED and it survives a reload', async ({
  page,
}) => {
  // No stamp before playing.
  await page.goto('/attack')
  await expect(page.locator('.weapon[data-attack="hack"] .stamp')).toBeHidden()

  // Play Attack 1 to its turn.
  await page.goto('/attack/hack')
  await page.getByRole('button', { name: /start cracking/i }).click()
  await expect(page.locator('#tried')).toHaveText(/[1-9]/, { timeout: 5000 })
  await page.getByRole('button', { name: /stop and see the damage/i }).click()
  await expect(page.locator('#turn')).toBeVisible()

  // The hub now shows the FAILED stamp — and it persists across a reload
  // (localStorage-backed, the browser-restart proxy).
  await page.goto('/attack')
  await expect(page.locator('.weapon[data-attack="hack"] .stamp')).toBeVisible()
  await expect(page.locator('.weapon[data-attack="hack"] .stamp')).toContainText(/failed/i)
  await page.reload()
  await expect(page.locator('.weapon[data-attack="hack"] .stamp')).toBeVisible()
})

test('attack 1: flipping coins mints a real key and its three addresses', async ({ page }) => {
  await page.goto('/attack/hack')
  await page.getByRole('button', { name: /flip 256 coins/i }).click()
  await expect(page.locator('#key')).toContainText(/^[0-9a-f]{64}$/)
  const addresses = page.locator('#addresses li')
  await expect(addresses).toHaveCount(3)
  await expect(addresses.nth(0)).toContainText(/1[A-Za-z0-9]{20,}/) // legacy
  await expect(addresses.nth(2)).toContainText(/bc1[a-z0-9]{20,}/) // native segwit
})

test('attack 1: cracking tries real keys and the turn reveals zero matches', async ({
  page,
}) => {
  await page.goto('/attack/hack')
  await page.getByRole('button', { name: /start cracking/i }).click()
  // Let a few real batches run (counter shows a non-zero digit), then stop.
  await expect(page.locator('#tried')).toHaveText(/[1-9]/, { timeout: 5000 })
  await page.getByRole('button', { name: /stop and see the damage/i }).click()
  await expect(page.locator('#turn')).toBeVisible()
  await expect(page.locator('#turn-verdict')).toContainText(/zero|matches/i)
})

test('attack 1: the passphrase footnote cracks a weak phrase instantly', async ({ page }) => {
  await page.goto('/attack/hack')
  await page.locator('summary').click()
  await page.locator('#phrase').fill('password')
  await page.getByRole('button', { name: /^crack it$/i }).click()
  await expect(page.locator('#phrase-address')).toContainText(/^1/)
  await expect(page.locator('#phrase-time')).toContainText(/sha-256|millisecond/i)
})
