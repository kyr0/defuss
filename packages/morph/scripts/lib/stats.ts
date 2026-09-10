import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

/**
 * Shared size accounting for stats.ts (writes dist/stats.json + refreshes the
 * README bundle-size block) and verify.ts (gates that both are fresh).
 * Deterministic: no timestamps, so freshness checks compare byte-for-byte.
 */

export interface FileStat {
  bytes: number;
  gzip: number;
}

export interface StatsFile {
  package: string;
  version: string;
  files: Record<string, FileStat>;
}

/** measured in ship order: bundler/Node entries first, then the CDN files */
export const MEASURED_FILES = [
  'dist/index.mjs',
  'dist/index.cjs',
  'dist/all.js',
  'dist/all.min.js',
] as const;

export const README_SIZE_START = '<!-- bundle-size:start -->';
export const README_SIZE_END = '<!-- bundle-size:end -->';

export const computeStats = (root: string): StatsFile => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const files: Record<string, FileStat> = {};
  for (const rel of MEASURED_FILES) {
    const content = readFileSync(join(root, rel));
    files[rel] = { bytes: content.byteLength, gzip: gzipSync(content).byteLength };
  }
  return { package: pkg.name, version: pkg.version, files };
};

const kb = (n: number) => `${(n / 1024).toFixed(1)} kB`;

/** per-file purpose, shown in the README table so the four artifacts make sense */
const PURPOSE: Record<string, string> = {
  'dist/index.mjs': 'ESM/library build; used when installing via npm/bun',
  'dist/index.cjs': 'CommonJS build',
  'dist/all.js': 'UMD build; for CDN-based usage with debugging',
  'dist/all.min.js':
    'Minified UMD build; for CDN-based usage without debugging (Pareto-optimal when no bundler is used)',
};

export const renderReadmeBlock = (stats: StatsFile): string => {
  const rows = MEASURED_FILES.map((rel) => {
    const { bytes, gzip } = stats.files[rel];
    const name = rel.replace('dist/', '');
    const gzipCell = rel.endsWith('all.min.js') ? `**${kb(gzip)}**` : kb(gzip);
    return `| \`${name}\` | ${kb(bytes)} | ${gzipCell} | ${PURPOSE[rel]} |`;
  });
  return [
    README_SIZE_START,
    '| File | Size | Gzipped | Purpose |',
    '| --- | ---: | ---: | --- |',
    ...rows,
    README_SIZE_END,
  ].join('\n');
};
