// Page smoke tests — deliberately shallow (PRD Testing Decisions, seam 3):
// every page loads, its key labels and controls are present, no errors.

import { expect, test } from '@playwright/test'

const routes: Array<[path: string, expectedText: string]> = [
  ['/', 'UNKILLABLE'],
  ['/attack', 'Attack the Network'],
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
