# Unkillable

Attack Bitcoin yourself and watch what actually happens. Live at [unkillable.bitcoin-fix.com](https://unkillable.bitcoin-fix.com).

- **What & why:** [the PRD (issue #1)](https://github.com/stillmusic-tech/unkillable/issues/1)
- **The journey:** [plans/unkillable-site.md](plans/unkillable-site.md) — 18 phases
- **The words we use:** [CONTEXT.md](CONTEXT.md)

## Commands

| Command            | Does                                      |
| ------------------ | ----------------------------------------- |
| `npm run dev`      | Local dev server                          |
| `npm test`         | Engine + data-tap tests (Vitest)          |
| `npm run build`    | Static build to `dist/`                   |
| `npm run test:e2e` | Page smoke tests (Playwright, needs build) |

Deployed by Cloudflare (Workers static hosting) on every push to `main` — build `npm run build`, deploy `npx wrangler deploy`, config in `wrangler.jsonc`.
