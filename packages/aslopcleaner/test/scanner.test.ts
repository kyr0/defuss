import { describe, it, expect } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';

import { scanDirectory } from '../src/scanner.js';

describe('scanDirectory', () => {
  it('finds files with Unicode slop', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'aslop-scan-'));
    await writeFile(path.join(dir, 'a.txt'), 'hello \u2192 world', 'utf8');
    await writeFile(path.join(dir, 'b.txt'), 'plain text only', 'utf8');

    const result = await scanDirectory(dir);

    expect(result.matchesByFile.size).toBe(1);
    expect(result.matchesByFile.has('a.txt')).toBe(true);
    expect(result.scannedFiles).toBeGreaterThanOrEqual(2);
  });

  it('skips binary files', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'aslop-scan-bin-'));
    await writeFile(path.join(dir, 'bin.dat'), Buffer.from([0x00, 0x01, 0x02, 0x03]));

    const result = await scanDirectory(dir);

    expect(result.matchesByFile.size).toBe(0);
    expect(result.skippedByBinary).toBeGreaterThanOrEqual(1);
  });

  it('skips oversized files', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'aslop-scan-big-'));
    const bigContent = 'x'.repeat(130 * 1024);
    await writeFile(path.join(dir, 'big.txt'), bigContent, 'utf8');

    const result = await scanDirectory(dir);

    expect(result.skippedBySize).toBeGreaterThanOrEqual(1);
  });

  it('skips sensitive files like .env', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'aslop-scan-env-'));
    await writeFile(path.join(dir, '.env'), 'SECRET=\u2192arrow', 'utf8');

    const result = await scanDirectory(dir);

    expect(result.matchesByFile.has('.env')).toBe(false);
    expect(result.skippedBySensitivePattern).toBeGreaterThanOrEqual(1);
  });

  it('returns zero matches for empty directory', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'aslop-scan-empty-'));

    const result = await scanDirectory(dir);

    expect(result.matchesByFile.size).toBe(0);
    expect(result.scannedFiles).toBe(0);
  });

  it('handles multiple files with unicode', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'aslop-scan-multi-'));
    await writeFile(path.join(dir, 'one.txt'), '\u201Cquote\u201D', 'utf8');
    await writeFile(path.join(dir, 'two.txt'), 'arrow \u2192', 'utf8');
    await writeFile(path.join(dir, 'three.txt'), 'clean file', 'utf8');

    const result = await scanDirectory(dir);

    expect(result.matchesByFile.size).toBe(2);
  });
});
