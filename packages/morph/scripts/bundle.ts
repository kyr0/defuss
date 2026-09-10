#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Why: dist/index.mjs/.cjs (pkgroll) serve bundler/Node consumers. Websites
 * that load defuss-morph directly from jsDelivr via <script type="module">
 * get a single, readable, self-contained ESM file instead:
 * dist/all.js (+ all.js.map, mapping back to the src/*.ts modules).
 * minify.ts then derives all.min.js + all.min.js.map from it.
 *
 * Runs after pkgroll (dist/ exists) and before minify.ts.
 */

const ROOT = join(import.meta.dirname, '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

const result = await Bun.build({
  entrypoints: [join(SRC, 'all.ts')],
  outdir: DIST,
  naming: 'all.js',
  format: 'esm',
  target: 'browser',
  sourcemap: 'external',
  minify: false,
});
if (!result.success) {
  console.error('bundle: Bun.build failed:');
  for (const log of result.logs) console.error(`  ${log}`);
  process.exit(1);
}

// Bun.build writes all.js.map but only stamps a debugId comment — link the map
// explicitly (must be the LAST line of the file)
const allJs = join(DIST, 'all.js');
writeFileSync(
  allJs,
  `${readFileSync(allJs, 'utf8').trimEnd()}\n//# sourceMappingURL=all.js.map\n`,
);

console.log('bundle: src/all.ts → dist/all.js (+ all.js.map)');
