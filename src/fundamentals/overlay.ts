// The mid-attack Fundamentals overlay. Any page can call initFundamentals():
// it wires every element with a data-card="<id>" attribute to open that card in
// a light overlay — so a visitor tapping a term inside an attack learns the
// idea and returns in one click, without losing their place. On the
// Fundamentals landing page it also opens a card if the URL carries #<id>.

import { cardById, type FundCard } from './cards'

let overlayEl: HTMLElement | null = null
let bodyEl: HTMLElement | null = null

function ensureOverlay(): HTMLElement {
  if (overlayEl) return overlayEl
  const el = document.createElement('div')
  el.id = 'fund-overlay'
  el.hidden = true
  el.innerHTML = `
    <div class="fund-backdrop" data-close></div>
    <div class="fund-card" role="dialog" aria-modal="true" aria-labelledby="fund-title">
      <button class="fund-close" data-close aria-label="Close">✕</button>
      <div id="fund-body"></div>
    </div>`
  document.body.appendChild(el)
  el.querySelectorAll('[data-close]').forEach((c) =>
    c.addEventListener('click', () => close()),
  )
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close()
  })
  overlayEl = el
  bodyEl = el.querySelector('#fund-body')
  return el
}

function renderCard(card: FundCard): string {
  return `
    <div class="fund-icon">${card.icon}</div>
    <h2 id="fund-title">${card.title}</h2>
    <div class="fund-visual">${card.visual}</div>
    <div class="fund-idea">${card.idea}</div>
    <a class="fund-attack" href="${card.attackHref}">${card.attackLabel}</a>`
}

export function openCard(id: string): void {
  const card = cardById(id)
  if (!card) return
  const el = ensureOverlay()
  if (bodyEl) bodyEl.innerHTML = renderCard(card)
  el.hidden = false
  document.body.style.overflow = 'hidden'
}

export function close(): void {
  if (overlayEl) overlayEl.hidden = true
  document.body.style.overflow = ''
}

/** Wire every [data-card] on the page to open its card as an overlay instead
 * of navigating; fall back to normal navigation if JS somehow can't. */
export function initFundamentals(): void {
  document.querySelectorAll<HTMLElement>('[data-card]').forEach((term) => {
    term.addEventListener('click', (e) => {
      const id = term.dataset.card
      if (!id || !cardById(id)) return // let the link navigate normally
      e.preventDefault()
      openCard(id)
    })
  })
  // Deep-link support: /fundamentals#node opens that card — on first load and
  // on same-page hash changes (an anchor tapped while already on the page).
  const openFromHash = () => {
    const hash = location.hash.replace('#', '')
    if (hash && cardById(hash)) openCard(hash)
  }
  openFromHash()
  window.addEventListener('hashchange', openFromHash)
}
