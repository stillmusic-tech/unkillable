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
| `npx wrangler deploy` | Build + publish live to Cloudflare               |

**Deploy is manual, not push-to-deploy.** Cloudflare (Workers static hosting) serves the site, but pushing to `main` does NOT publish it — GitHub CI only runs the tests. To go live, run `npm run build && npx wrangler deploy` (config in `wrangler.jsonc`; needs a one-time `npx wrangler login`). The custom domain `unkillable.bitcoin-fix.com` is a Worker custom domain; its edge cache can serve the previous version for a short while after a deploy.
