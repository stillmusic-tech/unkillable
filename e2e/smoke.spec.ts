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

test('attack 1 tracer: flipping coins mints a key and checks it', async ({ page }) => {
  await page.goto('/attack/hack')
  await page.getByRole('button', { name: /flip 256 coins/i }).click()
  await expect(page.locator('#key')).toContainText(/^[0-9a-f]{64}$/)
  await expect(page.locator('#address')).toContainText(/^1/)
  await expect(page.locator('#verdict')).toContainText(/no match/i)
})
