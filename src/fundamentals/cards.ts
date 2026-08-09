// The seven Bitcoin Fundamentals cards, in the locked person-driven order
// (the book → its pages → its keepers → its writers → why it's safe → its money
// rule → your ownership). One idea, one visual, zero prior knowledge each.
// Shared by the Fundamentals landing page and the mid-attack overlay so the
// content lives in exactly one place.

export interface FundCard {
  id: string
  icon: string
  title: string
  /** The one idea, in a sentence or two — plain layman language. */
  idea: string
  /** A tiny self-contained visual (HTML string; emoji/CSS only, no assets). */
  visual: string
  /** Where "See it attacked →" leads, and its label. */
  attackHref: string
  attackLabel: string
}

export const CARDS: FundCard[] = [
  {
    id: 'what-is-bitcoin',
    icon: '🪙',
    title: 'What is Bitcoin?',
    idea: 'A shared record book of who owns what — kept not by one bank, but by thousands of strangers around the world who each hold a full copy and constantly check each other. No one is in charge, and no single copy matters, because they all have to agree.',
    visual:
      '<div class="viz-row"><span>📕</span><span>📕</span><span>📕</span><span>📕</span><span>📕</span></div><p class="viz-cap">thousands of identical copies, everyone checking everyone</p>',
    attackHref: '/attack',
    attackLabel: 'Try to kill it →',
  },
  {
    id: 'block',
    icon: '🧱',
    title: 'What is a block?',
    idea: 'One page of that record book. About every ten minutes a fresh page is filled with recent payments and glued onto the page before it. You can never quietly change an old page — every page locks the one behind it, all the way back to 2009.',
    visual:
      '<div class="viz-row viz-chain"><span>🧱</span><span>→</span><span>🧱</span><span>→</span><span>🧱</span><span>→</span><span>🧱</span></div><p class="viz-cap">a new page every ~10 minutes, chained to the last</p>',
    attackHref: '/attack/time',
    attackLabel: 'See the whole chain →',
  },
  {
    id: 'node',
    icon: '💻',
    title: 'What is a node?',
    idea: "One of the people keeping a full copy of the book and checking every new page against the rules. There are tens of thousands, in every country. Anyone can run one — it costs less than a games console. There's no head office to shut down, because everyone is a branch.",
    visual:
      '<div class="viz-row"><span>💻</span><span>💻</span><span>💻</span><span>💻</span><span>💻</span><span>💻</span></div><p class="viz-cap">tens of thousands of independent copies — no centre</p>',
    attackHref: '/attack/shut-down',
    attackLabel: 'Try to switch it off →',
  },
  {
    id: 'mining',
    icon: '⛏️',
    title: 'What is Bitcoin mining?',
    idea: 'It decides who gets to write the next page. Computers around the world race to solve a hard, pointless puzzle; the winner writes the page and earns some new bitcoin. It looks wasteful — that’s the point of the next card.',
    visual:
      '<div class="viz-row"><span>⛏️</span><span>⛏️</span><span>🏆</span><span>⛏️</span><span>⛏️</span></div><p class="viz-cap">a global race to write the next page</p>',
    attackHref: '/attack/51-percent',
    attackLabel: 'Try to win the race →',
  },
  {
    id: 'energy',
    icon: '⚡',
    title: 'How energy protects the network',
    idea: "Because writing a page costs real electricity, cheating costs real money. To rewrite history you'd have to out-spend the entire world's miners, non-stop, forever — and even then every node would reject your fake pages. The expense IS the lock. Cheap security is easy to break; this is deliberately expensive to attack.",
    visual:
      '<div class="viz-row"><span>⚡</span><span>💰</span><span>🔒</span></div><p class="viz-cap">expensive to write → expensive to cheat → safe to trust</p>',
    attackHref: '/attack/51-percent',
    attackLabel: 'Try to out-spend the world →',
  },
  {
    id: 'cap',
    icon: '🔢',
    title: 'Why 21 million?',
    idea: 'The rule that there will only ever be 21 million bitcoin is written into the software every keeper runs. New coins are released on a fixed, slowing schedule and stop for good. No one can vote to print more, because every node would simply reject any page that tried.',
    visual:
      '<div class="viz-row"><span class="viz-big">21,000,000</span></div><p class="viz-cap">fixed forever — checked by every copy of the book</p>',
    attackHref: '/attack/print',
    attackLabel: 'Try to print more →',
  },
  {
    id: 'key',
    icon: '🔑',
    title: 'What is a private key?',
    idea: 'Now that you know there’s a book worth owning a line of: your bitcoin is controlled by one enormous secret number — your private key. Knowing it is owning the coins; it’s the only thing that can authorise moving them. It’s not stored on any server — it’s just a number you keep.',
    visual:
      '<div class="viz-row"><span>🔑</span><span>=</span><span>🪙</span></div><p class="viz-cap">know the number, own the coins — nothing else needed</p>',
    attackHref: '/attack/hack',
    attackLabel: 'Try to guess a key →',
  },
]

export function cardById(id: string): FundCard | undefined {
  return CARDS.find((c) => c.id === id)
}
