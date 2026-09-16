# AGENTS.md — defuss-query

Package-specific notes for LLMs and agents working on `defuss-query`.
General defuss guidance lives in the monorepo root (`../../AGENTS.md`);
the architecture of this package is documented in [ARCH.md](ARCH.md).

## Commands

- **Setup:** `bun install && bunx playwright install chromium`
- **Build:** `bun run build` — compiles ESM + CJS, bundles the browser
  artifacts, writes `dist/stats.json`, then runs the README sync gate
- **Test:** `bun run test` — vitest: node project + real Chromium browser
  project, with v8 coverage (`coverage/coverage-summary.json`)
- **Full gate:** `bun run check` — build → typecheck → tests → packed-consumer
  tests → verify (this is what `prepublishOnly` runs)

## README sync rule (required after every build/test run)

`README.md` contains **measured** values that change when the code changes:

- the bundle-size table between `<!-- bundle-size:start -->` and
  `<!-- bundle-size:end -->` (source of truth: `dist/stats.json`)
- the coverage bullet between `<!-- coverage:start -->` and
  `<!-- coverage:end -->` (source of truth: `coverage/coverage-summary.json`)

`bun run build` and `bun run verify` both run `scripts/readme-sync.ts`, which
compares the actual readings against the marked sections. When a section is
stale, the script **exits 1** and prints an instruction block with the exact
replacement text.

When that happens:

1. Apply the printed replacement to `README.md`, between the markers — verbatim.
2. Re-run `bun run verify` until it passes.

Never invent, round differently, or "fix" sizes or coverage numbers by hand.
Only the readings printed by the script are valid.

## Release

`npm publish` only — `prepublishOnly` runs the full `bun run check` gate.
No release folders, no committed reports, no tarballs in the repo.

## Testing architecture (short version)

- `tests/suite.browser.test.ts` — the 75-case DOM suite, executed against each
  shipped bundle (`all.js`, `all.min.js`, `global.min.js` via blob scripts)
  **and** once against `/src/all.ts` through the dev server (this run feeds
  the v8 coverage on `src/**`)
- `tests/edge.browser.test.ts`, `tests/node.test.ts`, `tests/src-node.test.ts`
  — API/internal edge paths; import `../src/*.js` **statically** so the
  coverage-instrumented module instances are used (dynamic runtime-URL
  imports bypass instrumentation and create duplicate instances)
- The real morph engine comes from the workspace peer, served under
  `/__morph__/` by a plugin in `vitest.config.ts` — no vendored snapshot
