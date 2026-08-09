// One idea at a time: each chapter body renders as a small carousel — one
// slide visible, then a footer bar with a "1 / 5" counter, pill dots, and the
// arrow buttons. Shared by the Fundamentals page (server-rendered via
// carouselHTML, hydrated with initCarousel) and the mid-attack popup
// (client-rendered, then initCarousel on mount). Styles live in Base.astro so
// the popup works on any page.

export function carouselHTML(slides: string[]): string {
  const slideEls = slides
    .map((s, i) => `<div class="fc-slide${i === 0 ? ' is-active' : ''}">${s}</div>`)
    .join('')
  const dots = slides
    .map(
      (_, i) =>
        `<button class="fc-dot${i === 0 ? ' is-active' : ''}" aria-label="Idea ${i + 1} of ${slides.length}"></button>`,
    )
    .join('')
  return `<div class="fcarousel">
    <div class="fc-viewport">${slideEls}</div>
    <div class="fc-bar">
      <span class="fc-count">1 / ${slides.length}</span>
      <div class="fc-dots">${dots}</div>
      <button class="fc-arrow fc-prev" aria-label="Previous idea" disabled>&lsaquo;</button>
      <button class="fc-arrow fc-next" aria-label="Next idea"${slides.length < 2 ? ' disabled' : ''}>&rsaquo;</button>
    </div>
  </div>`
}

export function initCarousel(root: HTMLElement): void {
  const slides = Array.from(root.querySelectorAll<HTMLElement>('.fc-slide'))
  const dots = Array.from(root.querySelectorAll<HTMLElement>('.fc-dot'))
  const prev = root.querySelector<HTMLButtonElement>('.fc-prev')
  const next = root.querySelector<HTMLButtonElement>('.fc-next')
  const count = root.querySelector<HTMLElement>('.fc-count')
  let index = 0
  const show = (i: number) => {
    index = Math.max(0, Math.min(slides.length - 1, i))
    slides.forEach((s, j) => s.classList.toggle('is-active', j === index))
    dots.forEach((d, j) => d.classList.toggle('is-active', j === index))
    if (prev) prev.disabled = index === 0
    if (next) next.disabled = index === slides.length - 1
    if (count) count.textContent = `${index + 1} / ${slides.length}`
  }
  prev?.addEventListener('click', () => show(index - 1))
  next?.addEventListener('click', () => show(index + 1))
  dots.forEach((d, j) => d.addEventListener('click', () => show(j)))
}
