#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  README_SIZE_END,
  README_SIZE_START,
  computeStats,
  renderReadmeBlock,
} from './lib/stats.ts';

/**
 * Why: publish the size summary of the shipped package as dist/stats.json
 * (per-file byte + gzip sizes) and keep the README bundle-size block in sync.
 * Runs right after minify (the min twin is what gets measured), standalone
 * via `bun run stats` / `make stats`, and is part of the `build` pipeline.
 * verify's freshness gate keeps both outputs from ever lagging dist/.
 */

const ROOT = join(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');

if (!existsSync(join(DIST, 'all.min.js'))) {
  console.error('stats: dist/all.min.js missing — run `bun run build && bun run bundle && bun run minify` first');
  process.exit(1);
}

const stats = computeStats(ROOT);
writeFileSync(join(DIST, 'stats.json'), `${JSON.stringify(stats, null, 2)}\n`);

// refresh the README bundle-size block between its markers
const readmePath = join(ROOT, 'README.md');
const readme = readFileSync(readmePath, 'utf8');
const start = readme.indexOf(README_SIZE_START);
const end = readme.indexOf(README_SIZE_END);
if (start === -1 || end === -1) {
  console.error('stats: README.md is missing the bundle-size markers');
  process.exit(1);
}
writeFileSync(
  readmePath,
  `${readme.slice(0, start)}${renderReadmeBlock(stats)}${readme.slice(end + README_SIZE_END.length)}`,
);

const min = stats.files['dist/all.min.js'];
console.log(
  `stats: ${Object.keys(stats.files).length} files measured · ` +
    `all.min.js ${(min.bytes / 1024).toFixed(1)} kB (${(min.gzip / 1024).toFixed(1)} kB gz) → dist/stats.json + README.md`,
);
