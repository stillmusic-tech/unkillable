// The seven Bitcoin Fundamentals cards, in the locked person-driven order
// (the book → its keepers → its pages → its writers → why it's safe → its
// money rule → your ownership). One idea, one visual, zero prior knowledge
// each. Copy is canonical in the vault note "Unkillable - Bitcoin Fundamentals
// Page Content" — edit there first, then mirror here. Shared by the
// Fundamentals landing page and the mid-attack overlay so the content lives in
// exactly one place.

export interface FundCard {
  id: string
  icon: string
  title: string
  /** The chapter body as trusted HTML (short paragraphs + bullet lists). */
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
    idea: `<p>Bitcoin is money.</p>
<p>Money is 3 things:</p>
<ul>
<li>Energy.</li>
<li>A language to communicate value</li>
<li>A ledger, or communal notebook — a record that keeps track of who earned what.</li>
</ul>
<p>Money's value comes from its scarcity.</p>
<p>Bitcoin is the first time that digital scarcity is possible, and the first ever asset with an absolute limit. There will only ever be 21 Million Bitcoin.</p>
<p class="fhook">How does it achieve this?</p>`,
    visual:
      '<div class="viz-row"><span>⚡</span><span>🗣️</span><span>📒</span></div><p class="viz-cap">energy · a language for value · a communal notebook</p>',
    attackHref: '/attack',
    attackLabel: 'Try to kill it →',
  },
  {
    id: 'node',
    icon: '💻',
    title: 'What is a node?',
    idea: `<p>A bank keeps its own ledger. You have to trust the bank not to cheat.</p>
<p>Bitcoin is the opposite.</p>
<p>The Bitcoin Network is made up of tens of thousands of nodes, all around the world.</p>
<p>Each node contains a record of transactions in the Bitcoin Network all the way back to the first block (the genesis block).</p>
<p>Every time a new block is created, each node checks to make sure the new block follows Bitcoin's rules.</p>
<p>No one can change a transaction in the record unless every node agrees it follows the rules.</p>
<p>Anyone in the world can download and run a node, on an ordinary computer. This is why we call bitcoin 'decentralised'.</p>
<p class="fhook">So who gets to create blocks, and write in the ledger?</p>`,
    visual:
      '<div class="viz-row"><span>💻</span><span>💻</span><span>💻</span><span>💻</span><span>💻</span><span>💻</span></div><p class="viz-cap">tens of thousands of independent copies — no centre</p>',
    attackHref: '/attack/shut-down',
    attackLabel: 'Try to switch it off →',
  },
  {
    id: 'block',
    icon: '🧱',
    title: 'What is a block?',
    idea: `<p>A block is one page of the notebook.</p>
<p>Recent payments are written onto the block.</p>
<p>Every 10 minutes, a new block is added to the blockchain.</p>
<p>To cheat the system and change the record on an old block, you'd have to re-write every single block that follows in the chain (which costs a lot of energy and compute), all while the whole world watches you try and cheat.</p>
<p class="fhook">Who writes new blocks?</p>`,
    visual:
      '<div class="viz-row viz-chain"><span>🧱</span><span>→</span><span>🧱</span><span>→</span><span>🧱</span><span>→</span><span>🧱</span></div><p class="viz-cap">a new block every ~10 minutes, chained to the last</p>',
    attackHref: '/attack/time',
    attackLabel: 'See the whole chain →',
  },
  {
    id: 'mining',
    icon: '⛏️',
    title: 'What is Bitcoin mining?',
    idea: `<p>Bitcoin mining decides who writes the next block.</p>
<p>Millions of computers around the world race to guess a really large number.</p>
<p>The first computer to guess correctly writes the block and seals it.</p>
<p>The prize: brand-new bitcoin, and network transaction fees.</p>
<p>But what happens if more computers join the network? Does guessing the number get easier?</p>
<p>Nope. The difficulty adjusts.</p>
<p>The more computers join, the harder it gets. If computers leave, it gets easier. One new block is created every 10 minutes, no matter how much compute (hashpower) is in the network.</p>`,
    visual:
      '<div class="viz-row"><span>⛏️</span><span>⛏️</span><span>🏆</span><span>⛏️</span><span>⛏️</span></div><p class="viz-cap">a global race to write the next block</p>',
    attackHref: '/attack/51-percent',
    attackLabel: 'Try to win the race →',
  },
  {
    id: 'energy',
    icon: '⚡',
    title: 'How energy protects the network',
    idea: `<p>Before bitcoin, anything purely digital could be copied or deleted at zero cost.</p>
<p>Bitcoin changed that.</p>
<p>Creating a new block costs real electricity.</p>
<p>Cheating means rewriting blocks.</p>
<p>Rewriting blocks means out-spending every miner on Earth, non-stop, forever. In both energy, and compute power.</p>
<p>Energy is a physical wall protecting the digital notebook. Protecting Bitcoin's scarcity. Protecting its value.</p>`,
    visual:
      '<div class="viz-row"><span>⚡</span><span>💰</span><span>🔒</span></div><p class="viz-cap">expensive to write → expensive to cheat → safe to trust</p>',
    attackHref: '/attack/51-percent',
    attackLabel: 'Try to out-spend the world →',
  },
  {
    id: 'cap',
    icon: '🔢',
    title: 'Why only 21 million?',
    idea: `<p>Money's value comes from its scarcity. So what stops anyone making more than 21 million bitcoin?</p>
<p>The block reward miners earn gets cut in half every 4 years in an event called 'the halving'.</p>
<p>From 50 → 25 → 12.5 → 6.25 → …</p>
<p>Until 2140, when new bitcoin per block will reach zero. At exactly 21 million bitcoin.</p>
<p>Almost 20 million already exist. The last million will take over a hundred years to mine.</p>
<p>But couldn't powerful people just change the rule?</p>
<p>They tried. In 2017, 95% of miners backed a rule change. The nodes, ordinary people running ordinary computers said no. The miners backed down.</p>
<p>No amount of money, energy, or effort can cheat the rules of the Network. Every node would reject the block that tried.</p>
<p class="fhook">So if no bank holds your bitcoin, how do you own it?</p>`,
    visual:
      '<div class="viz-row"><span class="viz-big">21,000,000</span></div><p class="viz-cap">fixed forever — enforced by every node</p>',
    attackHref: '/attack/print',
    attackLabel: 'Try to print more →',
  },
  {
    id: 'key',
    icon: '🔑',
    title: 'What is a private key?',
    idea: `<p>Your money in a bank isn't really yours. The bank holds it, the bank can freeze it, and you need their permission to move it.</p>
<p>Bitcoin has no bank. You actually own it, and hold it yourself, with two things:</p>
<p>A public address — your mailbox. Anyone can see it and send bitcoin to it.</p>
<p>A private key — one enormous secret number. The only thing in the world that can move your coins.</p>
<p>Your key can be written down as 12 or 24 ordinary words (a seed phrase). Never store these digitally. Always on paper, or stamp them onto a fire-proof titanium plate.</p>
<p>Memorise your seed phrase, and you can carry your life savings across any border. No documents, no bank, no permission. Nothing for anyone to confiscate.</p>
<p>This has never been possible before in human history.</p>
<p>Remember. Not your keys, not your coins.</p>`,
    visual:
      '<div class="viz-row"><span>🔑</span><span>=</span><span>🪙</span></div><p class="viz-cap">know the number, own the coins — nothing else needed</p>',
    attackHref: '/attack/hack',
    attackLabel: 'Try to guess a key →',
  },
]

export function cardById(id: string): FundCard | undefined {
  return CARDS.find((c) => c.id === id)
}
