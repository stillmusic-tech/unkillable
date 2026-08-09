# Plan: Unkillable — the site that lets you attack Bitcoin

**PRD:** https://github.com/stillmusic-tech/unkillable/issues/1 (vault twin: `PRDs/Unkillable/Unkillable — Site PRD.md`)  ·  **Status:** Phases 1–9 COMPLETE. Building all remaining phases before one merged HITL feel review (Laurence's call, 2026-08-09: build everything, then test). **Phase 4** (2026-08-09) — the data tap (`src/tap/tap.ts`, live mempool.space + bundled fallback, mode + date exposed) and the live homepage block strip with ~10-min countdown. **Phase 5** (2026-08-09) — the observatory globe (`src/globe/globe.ts`, shared with Attack 2) with real node coordinates, drag-to-spin, pulsing arcs. 45 tests green (29 Vitest + 16 Playwright). Phase 3 (Attack 1 feel check) folds into the final Phase 18 full-site review. Next: Phase 6 (the armoury).

Canonical per-page behaviour lives in the vault's Unkillable Decision Register (27+ locked decisions) and eleven page-spec notes. If this plan and those notes disagree, the notes win.

## Durable Architectural Decisions

| Decision     | Detail                                                                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | Astro + TypeScript. Pages ship as static HTML; each attack tool is one interactive island. No backend of any kind.                               |
| Routes       | `/` (observatory) · `/attack` (armoury hub) · `/attack/hack` · `/attack/shut-down` · `/attack/51-percent` · `/attack/ban` · `/attack/print` · `/attack/time` · `/attack/quantum` · `/fundamentals` · `/about` |
| Schema       | No database. Per-visitor progress (FAILED stamps, report card) is one small versioned record in the browser's local storage.                     |
| Service boundaries | Per-attack **engine** (pure TypeScript brains, no visuals — the tested surface) · one shared **data tap** (live mempool.space / Bitnodes → bundled snapshot fallback, always exposing mode + data date; pages never call live sources directly) · one shared **globe** component (observatory + Attack 2) · **fundamentals overlay** openable mid-attack. |
| Testing      | Vitest for engines + data tap; Playwright for deliberately shallow page smoke tests. Look/feel is human-judged, never automated.                 |
| Dependencies | astro, typescript, vitest, playwright, plus the audited minimal-crypto trio @noble/secp256k1 + @noble/hashes + @scure/base (real Bitcoin key→address derivation; amendment recorded Phase 1). **globe.gl dropped (amendment, Phase 5):** it pulls in three.js (~600KB WebGL) which is heavy and can fail silently on older phones — the TBF audience's arrival device. Replaced by a hand-drawn canvas globe (`src/globe/globe.ts`): orthographic projection of real node coordinates, drag-to-spin, orange glowing nodes, pulsing arcs, killable node-by-node for Attack 2. Zero new deps, mobile-safe, same locked visual. Nothing else without a plan amendment. |
| Live data reality | Blocks are live in-browser (mempool.space sends `access-control-allow-origin: *`). **Nodes are snapshot-only client-side (amendment, Phase 5):** the Bitnodes API sends no CORS header, so browsers can't read it and there's no backend to proxy through; node geography is near-static anyway, so the bundled `nodes-snapshot.json` (real 27,814-node sample, dated) is served directly with its month shown. The tap keeps a tested live-first path for any server/future-proxy context. |
| Hosting      | Cloudflare Workers static hosting (`wrangler.jsonc` serves `dist/`), custom domain `unkillable.bitcoin-fix.com`. **Deploy is manual: `npm run build && npx wrangler deploy`** (one-time `wrangler login`). Push to `main` runs CI tests only — it does NOT publish. Correction recorded Phase 2. |

## Phases

### Phase 1 — Skeleton + first wire  ·  TRACER BULLET  ·  AFK
**Stories:** #5, #9, #11
**Slice:** Full pipeline end-to-end with the dumbest data: Astro scaffold, top menu + stub pages for all routes, Attack 1's engine in minimal form (flip coins → real private key → checked against a 3-address stub snapshot), one engine test, one smoke test, CI, deployed live to the subdomain.
**Done when:** the live subdomain serves the menu and stubs, a visitor can flip coins into a real key and see it checked, and both tests run green in CI.
**Blocked by:** none.

### Phase 2 — Attack 1 complete: "Just hack it"  ·  AFK
**Stories:** #9, #10, #11, #12
**Slice:** The full attack: 256-coin key minting, escalating key-crackers (laptop → every computer on earth) with honest timescales and an unmoving progress bar, the real bundled rich-address snapshot, the weak-passphrase footnote that cracks a bad phrase live, FAILED verdict, every number sourced.
**Done when:** the whole attack is playable end to end; engine tests prove a fresh key never matches the snapshot and a planted fixture key does.
**Blocked by:** Phase 1.

### Phase 3 — Attack 1 feel check  ·  HITL
**Stories:** #9–#12
**Slice:** Laurence plays Attack 1 in the browser and judges the emotional payoff — the register's cheapest test of the whole concept. Punch list gathered and fixed.
**Done when:** the punch list is empty and Laurence calls it good.
**Blocked by:** Phase 2.

### Phase 4 — The heartbeat  ·  AFK
**Stories:** #3, #34
**Slice:** The shared data tap is born: live source first, bundled snapshot fallback, mode + data date always exposed. It powers the homepage blockchain strip with its ~10-minute countdown and visibly-arriving new blocks.
**Done when:** the strip runs live on the homepage; a simulated outage flips it to snapshot mode with the snapshot's date shown; tap tests cover both modes.
**Blocked by:** Phase 1.

### Phase 5 — The observatory  ·  AFK
**Stories:** #1, #2, #4
**Slice:** The shared globe component is born: real nodes glowing, transaction lines pulsing, drag-to-spin only (clicks navigate nowhere), plus the single orange "Attack the Network" button as the homepage's only body-level door.
**Done when:** the homepage matches stories 1–4 live, fed through the data tap.
**Blocked by:** Phase 4.

### Phase 6 — The armoury  ·  AFK
**Stories:** #6, #7, #8, #29
**Slice:** The attack hub: seven weapon cards stating each doubt at full strength with attacker roles, live scar stats, FAILED stamps drawn from browser-stored progress (the progress record is born here).
**Done when:** completing Attack 1 stamps its card FAILED and the stamp survives closing and reopening the browser.
**Blocked by:** Phase 1.

### Phase 7 — Attack 2: "Shut down the server"  ·  AFK
**Stories:** #13, #14
**Slice:** Full-screen globe reuse; weapons panel (raid a building → black out a city → ban a country → switch off the earth) killing nodes visibly; NETWORK: OPERATIONAL scoreboard that never flinches; after total darkness, the satellite link survives and nodes regrow.
**Done when:** total blackout leaves the scoreboard OPERATIONAL and regrowth plays; engine test proves no kill-set silences the network.
**Blocked by:** Phases 5, 6.

### Phase 8 — Attack 3: "The 51% attack"  ·  AFK
**Stories:** #15, #16
**Slice:** The escalating mining-hardware shop with running bill and country-scale electricity meter; at 51%, the YOU WIN prize panel of what majority control buys — and doesn't.
**Done when:** the attack plays end to end; engine test proves the bill always equals the shop's cost table.
**Blocked by:** Phases 4, 6.

### Phase 9 — Attack 4: "Ban it"  ·  AFK
**Stories:** #17, #18, #19
**Slice:** World map with MINING BANNED stamps, real historical bans pre-tinted and dated, mining share visibly reflowing, the China 2021 replay as showpiece, and the ownership-ban footnote (memorisable keys, 1933 gold precedent).
**Done when:** the attack plays end to end; engine test proves no set of banned countries reduces surviving mining share to zero.
**Blocked by:** Phase 6.

### Phase 10 — Attack 5: "Print more of it"  ·  AFK
**Stories:** #20, #21, #22
**Slice:** The counterfeiter's desk: write the next block with a cheat menu, watch node after node reject it in a red cascade with one-line reasons, honest block accepted, the 2017 receipt.
**Done when:** the attack plays end to end; engine tests prove every cheat block is rejected with the correct reason and an honest block is accepted.
**Blocked by:** Phase 6.

### Phase 11 — Wall spike  ·  AFK
**Stories:** #23
**Slice:** Feasibility prototype only, the plan's one concentrated engineering risk: scroll and zoom 900k+ blocks smoothly. Outcome is a working scrolling prototype plus a short written decision on the rendering approach.
**Done when:** the prototype scrolls and zooms the full chain smoothly on a mid-range phone, or the compromise approach is written down for sign-off.
**Blocked by:** Phase 4.

### Phase 12 — Attack 6: "The uptime wall"  ·  AFK
**Stories:** #23, #24, #25
**Slice:** The full wall from January 2009: 477 obituaries, crashes, bans, Mt Gox, FTX pinned where they happened; the 2010 and 2013 outages shown honestly; ⏩ Skip to the end landing on the live block via the data tap.
**Done when:** the wall plays end to end and skip-to-end lands on the block being assembled right now.
**Blocked by:** Phase 11.

### Phase 13 — Attack 7: "Quantum"  ·  AFK
**Stories:** #26, #27
**Slice:** The targeting scope (mining / modern wallet / old exposed wallet / fire today), the real qubit gap on the scoreboard, the weapon-vs-shield race chart, and the no-spin verdict panel — the one attack not declared defeated.
**Done when:** all four targets answer honestly and the verdict panel renders the pending verdict.
**Blocked by:** Phase 6.

### Phase 14 — Report card + share  ·  AFK
**Stories:** #28, #29
**Slice:** The journey's ending: report card (six ❌ FAILED, quantum ⏳ PENDING) built from stored progress, "Share your defeat", and the door back to the observatory.
**Done when:** finishing the attacks yields the card, sharing works, and the card survives a browser restart.
**Blocked by:** Phases 7–13.

### Phase 15 — Fundamentals ladder + overlay  ·  AFK
**Stories:** #30, #31, #32
**Slice:** Eight two-minute visual cards in the locked layman order; any card openable as a mid-attack overlay from a tapped term without losing the visitor's place; every card ends "See it attacked →".
**Done when:** the ladder reads end to end, the overlay opens and closes mid-attack without losing state, and every card links to its weapon.
**Blocked by:** Phase 6.

### Phase 16 — About + sourcing sweep  ·  AFK
**Stories:** #33, #36, #37
**Slice:** The About page (why-this-exists, honesty pledge, sources list with dates, small print) plus a site-wide audit: every number traced to a named source, estimates labelled as estimates, bundled datasets printing their last-updated dates.
**Done when:** the audit finds no unsourced number, no unlabelled estimate, and no bundled dataset without a printed date.
**Blocked by:** Phases 7–13.

### Phase 17 — Touch pass  ·  AFK
**Stories:** #35
**Slice:** Every tool usable by touch on a phone-size screen — the TBF audience's actual arrival device.
**Done when:** a touch-only run-through completes every attack and the fundamentals ladder on a phone-size viewport.
**Blocked by:** Phases 7–13.

### Phase 18 — Full-site feel review  ·  HITL
**Stories:** all
**Slice:** Laurence plays the entire site start to finish; final punch list gathered and fixed.
**Done when:** the punch list is empty and Laurence calls the site ready for the TBF audience.
**Blocked by:** Phases 14–17.

## Executing this plan

One phase per fresh context window. For each phase:

    @https://github.com/stillmusic-tech/unkillable/issues/1 @plans/unkillable-site.md  Do phase N

Loop: explore → implement → review → commit the phase → clear context. Clear at ~35–40% context usage to stay in the smart zone. AFK phases can instead be compiled with `/plan-to-ralph` (code → GitHub issues) and run unattended.
