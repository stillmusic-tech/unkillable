// Page smoke tests — deliberately shallow (PRD Testing Decisions, seam 3):
// every page loads, its key labels and controls are present, no errors.

import { expect, test } from '@playwright/test'

const routes: Array<[path: string, expectedText: string]> = [
  ['/', 'UNKILLABLE'],
  ['/attack', 'Think you can stop it'],
  ['/attack/hack', 'Just hack it'],
  ['/attack/shut-down', 'pull the plug'],
  ['/attack/51-percent', 'more mining power than the rest of the world'],
  ['/attack/ban', 'Just make it illegal'],
  ['/attack/print', 'open it up and give yourself some'],
  ['/attack/time', 'Everything dies eventually'],
  ['/attack/quantum', 'a computer that breaks the maths itself'],
  ['/fundamentals', 'What is Bitcoin?'],
  ['/about', 'The honesty pledge'],
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

test('attack 4: banning stays OPERATIONAL and ban-all reveals the turn', async ({ page }) => {
  await page.goto('/attack/ban')
  await expect(page.locator('#net-status')).toHaveText(/operational/i)
  // Arrives pre-loaded with real historical bans (China et al).
  await expect(page.locator('#markers .marker.banned')).not.toHaveCount(0)
  const bansStart = Number(await page.locator('#bans').textContent())
  expect(bansStart).toBeGreaterThan(3)

  // Ban everything: the turn shows, status still holds, mining never hits zero.
  await page.getByRole('button', { name: /ban all 195/i }).click()
  await expect(page.locator('#turn')).toBeVisible()
  await expect(page.locator('#turn')).toContainText(/didn't make it stop/i)
  await expect(page.locator('#net-status')).toHaveText(/operational/i)
  await expect(page.locator('#bans')).toHaveText('195')
})

test('attack 5: honest block is accepted, a cheat block is rejected', async ({ page }) => {
  await page.goto('/attack/print')
  // Honest by default → accepted.
  await page.getByRole('button', { name: /submit to the network/i }).click()
  await expect(page.locator('#accepted')).toHaveText('1', { timeout: 5000 })
  await expect(page.locator('#chain .chain-block')).toHaveCount(1)

  // Cheat: mint past the cap → rejected, with the turn revealed.
  await page.getByRole('button', { name: /mine coin 21,000,001/i }).click()
  await page.getByRole('button', { name: /submit to the network/i }).click()
  await expect(page.locator('#rejected')).toHaveText('1', { timeout: 5000 })
  await expect(page.locator('#turn')).toBeVisible()
  await expect(page.locator('#turn-line')).toContainText(/every copy of the software/i)
})

test('attack 6: the wall renders and skip-to-end lands on the present', async ({ page }) => {
  await page.goto('/attack/time')
  await expect(page.locator('#wall')).toBeVisible()
  // The wall canvas gets sized (render ran).
  await expect
    .poll(async () => page.locator('#wall').evaluate((c: HTMLCanvasElement) => c.width))
    .toBeGreaterThan(0)
  // Blocks count populates from the tap (live or snapshot).
  await expect(page.locator('#blocks')).not.toHaveText('…', { timeout: 15000 })

  await page.getByRole('button', { name: /skip to the end/i }).click()
  await expect(page.locator('#turn')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('#turn-line')).toContainText(/being built/i)
})

test('attack 7: aiming answers honestly, verdict is pending, report card renders', async ({
  page,
}) => {
  await page.goto('/attack/quantum')
  await expect(page.locator('#verdict')).toContainText(/does not exist yet/i)

  // Aim at the old wallet → the one honest "exposed" answer.
  await page.getByRole('button', { name: /old, exposed wallet/i }).click()
  await expect(page.locator('#reaction')).toBeVisible()
  await expect(page.locator('#reaction')).toHaveClass(/exposed/)
  await expect(page.locator('#reaction')).toContainText(/canary/i)

  // Aim at mining → safe.
  await page.getByRole('button', { name: /^.*Mining$/i }).click()
  await expect(page.locator('#reaction')).toHaveClass(/safe/)

  // The report card shows quantum as pending after aiming.
  await expect(page.locator('#card-body')).toContainText(/pending/i)
  await expect(page.locator('#card-body')).toContainText(/Guess the key/i)
})

test('fundamentals: seven cards in order, each exiting to an attack', async ({ page }) => {
  await page.goto('/fundamentals')
  await expect(page.locator('.fcard')).toHaveCount(7)
  await expect(page.locator('.fcard').first()).toContainText('What is Bitcoin')
  await expect(page.locator('.fcard').first().locator('.fattack')).toBeVisible()
  // Deep-link opens a specific card as an overlay.
  await page.goto('/fundamentals#node')
  await expect(page.locator('#fund-overlay')).toBeVisible()
  await expect(page.locator('#fund-body')).toContainText(/node/i)
  await page.locator('.fund-close').click()
  await expect(page.locator('#fund-overlay')).toBeHidden()
})

test('fundamentals: each chapter is a carousel — one idea at a time', async ({ page }) => {
  await page.goto('/fundamentals')
  const carousel = page.locator('.fcard').first().locator('.fcarousel')
  const slides = carousel.locator('.fc-slide')
  const dots = carousel.locator('.fc-dot')
  // Only the first idea shows; you can't go back from it.
  await expect(slides.first()).toBeVisible()
  await expect(slides.nth(1)).toBeHidden()
  await expect(carousel.locator('.fc-prev')).toBeDisabled()
  await expect(dots.first()).toHaveClass(/is-active/)
  // The right arrow advances one idea and moves the orange dot.
  await carousel.locator('.fc-next').click()
  await expect(slides.nth(1)).toBeVisible()
  await expect(slides.first()).toBeHidden()
  await expect(dots.nth(1)).toHaveClass(/is-active/)
  // A dot jumps straight to its idea; at the end the right arrow stops.
  await dots.last().click()
  await expect(slides.last()).toBeVisible()
  await expect(carousel.locator('.fc-next')).toBeDisabled()
  // No emoji anywhere in the chapters (design call, 2026-08-09).
  const text = await page.locator('.ladder').innerText()
  expect(/\p{Extended_Pictographic}/u.test(text)).toBe(false)
})

test('fundamentals: chapter rail lists all seven and focuses a chapter on click', async ({
  page,
}) => {
  await page.goto('/fundamentals')
  const items = page.locator('#fund-rail .rail-item')
  await expect(items).toHaveCount(7)
  await expect(items.nth(3)).toContainText('What is Bitcoin mining?')
  // Clicking a chapter scrolls it into focus and the rail highlights it.
  await items.nth(3).click()
  await expect(page.locator('#mining')).toBeInViewport({ timeout: 5000 })
  await expect(items.nth(3)).toHaveClass(/active/, { timeout: 5000 })
  // The top menu stays pinned while moving between chapters.
  await expect(page.locator('nav')).toBeInViewport()
  // Clicking a rail item must NOT set a #hash (a hash opens the overlay).
  await expect(page).toHaveURL(/\/fundamentals$/)
  await expect(page.locator('#fund-overlay')).toBeHidden()
  // Wait for the click's smooth glide to settle — wheeling mid-glide can
  // snap-land back on the same chapter, which isn't what we're testing.
  await page.waitForFunction(
    () =>
      new Promise((resolve) => {
        const y = window.scrollY
        setTimeout(() => resolve(window.scrollY === y), 250)
      }),
  )
  // Scrolling onward moves the highlight without a click. Scroll
  // programmatically — a synthetic wheel gesture races Chromium's snap
  // physics under parallel-worker load and can land back where it started.
  await page.evaluate(() => window.scrollTo({ top: window.scrollY + 2000 }))
  await expect(items.nth(3)).not.toHaveClass(/active/, { timeout: 5000 })
})

test('fundamentals overlay opens mid-attack without leaving the page', async ({ page }) => {
  await page.goto('/attack/51-percent')
  await page.getByRole('link', { name: /what is bitcoin mining/i }).click()
  await expect(page.locator('#fund-overlay')).toBeVisible()
  await expect(page.locator('#fund-body')).toContainText(/writes the next block/i)
  // Still on the attack page — place not lost.
  await expect(page).toHaveURL(/51-percent/)
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

// --- Touch pass (Phase 17): every tool usable on a phone-size screen, with no
// horizontal overflow (the TBF audience's actual arrival device). ---
test.describe('touch pass — phone viewport', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true })

  const mobileRoutes = [
    '/',
    '/attack',
    '/attack/hack',
    '/attack/shut-down',
    '/attack/51-percent',
    '/attack/ban',
    '/attack/print',
    '/attack/time',
    '/attack/quantum',
    '/fundamentals',
    '/about',
  ]

  for (const path of mobileRoutes) {
    test(`${path} fits the phone width — no sideways scroll`, async ({ page }) => {
      await page.goto(path)
      // The page body must never be wider than the viewport.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(2) // allow sub-pixel rounding
    })
  }

  test('a key control is tappable on the hub at phone size', async ({ page }) => {
    await page.goto('/attack')
    // Weapon cards are big tap targets and navigate.
    await page.locator('.weapon').first().tap()
    await expect(page).toHaveURL(/\/attack\/hack/)
  })

  test('Attack 1 plays by tap on a phone', async ({ page }) => {
    await page.goto('/attack/hack')
    await page.getByRole('button', { name: /flip 256 coins/i }).tap()
    await expect(page.locator('#key')).toContainText(/^[0-9a-f]{64}$/)
  })

  test('Attack 3 buys by tap and can reach the win on a phone', async ({ page }) => {
    await page.goto('/attack/51-percent')
    const yearBtn = page.getByRole('button', { name: /year of global production/i })
    const prize = page.locator('#prize')
    for (let i = 0; i < 4 && !(await prize.isVisible()); i++) {
      if (!(await yearBtn.isEnabled())) break
      await yearBtn.tap()
    }
    await expect(prize).toBeVisible()
  })
})
