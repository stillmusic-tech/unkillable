// Page smoke tests — deliberately shallow (PRD Testing Decisions, seam 3):
// every page loads, its key labels and controls are present, no errors.

import { expect, test } from '@playwright/test'

const routes: Array<[path: string, expectedText: string]> = [
  ['/', 'UNKILLABLE'],
  ['/attack', 'Think you can stop it'],
  ['/attack/hack', 'Just hack it'],
  ['/attack/shut-down', 'pull the plug'],
  ['/attack/51-percent', 'more mining power than the rest of the world'],
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

test('attack 2: killing nodes leaves the network OPERATIONAL and dark-earth regrows', async ({
  page,
}) => {
  await page.goto('/attack/shut-down')
  await expect(page.locator('#net-status')).toHaveText(/operational/i)
  const killedBefore = await page.locator('#killed').textContent()
  expect(killedBefore).toBe('0')

  // Raid: arm, then tap the globe's centre (guaranteed on the disc) — killed
  // count rises, status holds.
  await page.getByRole('button', { name: /single raid/i }).click()
  await page.locator('#globe').click() // default: element centre
  await expect(page.locator('#killed')).not.toHaveText('0')
  await expect(page.locator('#net-status')).toHaveText(/operational/i)

  // Dark earth: everything dies, then the network regrows and the turn shows.
  await page.getByRole('button', { name: /dark earth/i }).click()
  await expect(page.locator('#reveal')).toBeVisible({ timeout: 10000 })
  await expect(page.locator('#reveal')).toContainText(/of these lights/i)
  await expect(page.locator('#net-status')).toHaveText(/operational/i)
  // Regrowth brought nodes back — not everything is dead at the end.
  await expect
    .poll(async () => Number((await page.locator('#running').textContent())?.replace(/\D/g, '')))
    .toBeGreaterThan(0)
})

test('attack 3: buying mining power runs the bill and 51% reveals the prize', async ({
  page,
}) => {
  await page.goto('/attack/51-percent')
  await expect(page.locator('#spent')).toHaveText('$0')

  // Buying raises the bill and your share.
  await page.getByRole('button', { name: /one mining machine/i }).click()
  await expect(page.locator('#spent')).not.toHaveText('$0')

  // Buy a year of global production until 51% wins (buttons disable on win, so
  // stop clicking once the prize shows).
  const yearBtn = page.getByRole('button', { name: /year of global production/i })
  const prize = page.locator('#prize')
  for (let i = 0; i < 4 && !(await prize.isVisible()); i++) {
    if (!(await yearBtn.isEnabled())) break
    await yearBtn.click()
  }
  await expect(prize).toBeVisible()
  await expect(page.locator('#prize')).toContainText(/still cannot/i)
  await expect(page.locator('#prize')).toContainText(/steal a single coin/i)
  await expect(page.locator('#prize-bill')).toContainText(/\$/)
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
