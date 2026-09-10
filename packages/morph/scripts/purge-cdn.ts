#!/usr/bin/env bun
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Why: jsDelivr resolves npm @latest to a version once and caches both the
 * resolution and the files (s-maxage=43200 at the edge, max-age=604800 in
 * browsers), so right after a release, CDN consumers of dist/all(.min).js can
 * keep receiving the PREVIOUS release for up to 12h.
 *
 * This script purges the @latest package root (the resolution entry itself)
 * plus every CDN-facing dist asset. Run it after `npm publish`.
 */

const ROOT = join(import.meta.dirname, '..');
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const CDN_BASE = `https://cdn.jsdelivr.net/npm/${PKG.name}@latest`;
const PURGE_BASE = `https://purge.jsdelivr.net/npm/${PKG.name}@latest`;

const CDN_FILES = [
  'dist/all.js',
  'dist/all.js.map',
  'dist/all.min.js',
  'dist/all.min.js.map',
  'dist/stats.json',
];

// Preflight: a purge only re-fetches from whatever version @latest currently
// resolves to. If npm publish hasn't propagated yet, every purge is a silent
// no-op. A direct @<version> fetch succeeds as soon as the version is live.
const probe = await fetch(`${CDN_BASE.replace('@latest', `@${PKG.version}`)}/dist/all.min.js`, {
  method: 'HEAD',
});
if (!probe.ok) {
  console.error(
    `purge-cdn: jsDelivr cannot serve ${PKG.name}@${PKG.version} yet (dist/all.min.js -> ${probe.status}).\n` +
      `  Purging now would be a silent no-op — publish first, then re-run.`,
  );
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function purgeUrl(url: string): Promise<'ok' | 'retry'> {
  try {
    const res = await fetch(url);
    if (!res.ok) return 'retry';
    const body = (await res.json()) as {
      status?: string;
      paths?: Record<string, { throttled?: boolean }>;
    };
    const entry = Object.values(body.paths ?? {})[0];
    if (body.status !== 'finished' || entry?.throttled) return 'retry';
    return 'ok';
  } catch {
    return 'retry';
  }
}

async function purgeWithRetry(url: string, attempts = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if ((await purgeUrl(url)) === 'ok') return true;
    await sleep(1000 * attempt); // the purge API throttles aggressive clients
  }
  return false;
}

// 1. package root FIRST: purging `…@latest` clears the cached resolution,
//    so the per-file purges below re-fetch from the NEW version.
if (!(await purgeWithRetry(PURGE_BASE))) {
  console.error(
    `purge-cdn: purging the @latest package root failed (${PURGE_BASE}) —\n` +
      `  file purges would re-resolve through the stale entry; aborting.`,
  );
  process.exit(1);
}

// 2. every CDN-facing dist asset
const failed: string[] = [];
for (const rel of CDN_FILES) {
  if (!(await purgeWithRetry(`${PURGE_BASE}/${rel}`))) failed.push(rel);
  await sleep(150);
}

if (failed.length > 0) {
  console.error(`purge-cdn: ${failed.length}/${CDN_FILES.length} paths failed:`);
  for (const rel of failed) console.error(`  ${rel}`);
  process.exit(1);
}

console.log(`purge-cdn: @latest package root + ${CDN_FILES.length} dist asset paths purged from jsDelivr`);
