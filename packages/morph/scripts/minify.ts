#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { minifySync } from 'oxc-minify';

/**
 * Why: the CDN bundle (dist/all.js) ships readable for debugging; production
 * pages want the tiny payload. This post-pass writes dist/all.min.js +
 * all.min.js.map (oxc-minify, mapping min → the readable all.js, whose own
 * map then maps back to the src/*.ts modules).
 *
 * Runs after bundle.ts, never touches src/.
 */

const ROOT = join(import.meta.dirname, '..');
const ALL_JS = join(ROOT, 'dist', 'all.js');

const source = readFileSync(ALL_JS, 'utf8');

// mangle without `toplevel`: inner names get minified, but module top-level
// names stay — the exports are the public API contract (morph, updateDomWithVdom, ...)
const result = minifySync(relative(ROOT, ALL_JS), source, {
  module: true, // shipped as <script type="module"> — keep import/export semantics
  compress: true,
  mangle: true,
  sourcemap: true,
});
if (result.errors.length || !result.map) {
  console.error('minify: dist/all.js:', result.errors);
  process.exit(1);
}

// devtools resolve map.sources relative to the .map's URL — point at the
// sibling readable all.js by basename (oxc emits the ROOT-relative input path)
const map = { ...result.map, file: 'all.min.js', sources: ['all.js'] };
// the comment must START a line — oxc's codegen may omit the trailing newline
const code = result.code.endsWith('\n') ? result.code : `${result.code}\n`;
writeFileSync(join(ROOT, 'dist', 'all.min.js'), `${code}//# sourceMappingURL=all.min.js.map\n`);
writeFileSync(join(ROOT, 'dist', 'all.min.js.map'), JSON.stringify(map));

const pct = Math.round((100 * code.length) / source.length);
console.log(`minify: dist/all.js → dist/all.min.js (+ map) (${source.length} → ${code.length} bytes, ${pct}%)`);
