// The floating chapter rail on the Fundamentals page. Clicking an entry
// scrolls its chapter into focus (deliberately WITHOUT setting the URL hash —
// on this page a #<id> hash opens the overlay, which is the attack-page
// deep-link path, not what a chapter click means). An IntersectionObserver
// keeps the rail's active entry in step while the visitor scrolls.

export function initRail(): void {
  const rail = document.getElementById('fund-rail')
  if (!rail) return

  // The nav stays pinned on this page; chapters size themselves against its
  // real height (it wraps to two rows on narrow screens) via --navh.
  const nav = document.querySelector('nav')
  const setNavHeight = () =>
    document.documentElement.style.setProperty('--navh', `${nav?.offsetHeight ?? 0}px`)
  setNavHeight()
  window.addEventListener('resize', setNavHeight, { passive: true })
  const items = Array.from(rail.querySelectorAll<HTMLElement>('[data-target]'))

  const setActive = (id: string) =>
    items.forEach((b) => b.classList.toggle('active', b.dataset.target === id))

  items.forEach((b) =>
    b.addEventListener('click', () => {
      const target = b.dataset.target
      if (!target) return
      document
        .getElementById(target)
        ?.closest('.fchapter')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }),
  )

  // Scroll spy: the chapter whose top sits nearest the viewport top is the
  // focused one. A plain scroll listener (not IntersectionObserver / rAF) so
  // it also runs in throttled or backgrounded tabs.
  const chapters = Array.from(
    document.querySelectorAll<HTMLElement>('.fchapter'),
  ).filter((s) => s.querySelector('.fcard'))
  const update = () => {
    let best: HTMLElement | null = null
    let bestDist = Infinity
    for (const s of chapters) {
      const dist = Math.abs(s.getBoundingClientRect().top)
      if (dist < bestDist) {
        bestDist = dist
        best = s
      }
    }
    const card = best?.querySelector('.fcard')
    if (card && card.id && bestDist < window.innerHeight / 2) setActive(card.id)
    else if (bestDist >= window.innerHeight / 2) setActive('')
  }
  window.addEventListener('scroll', update, { passive: true })
  update()
}
