import { describe, it, expect } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, writeFile } from 'node:fs/promises';

import { isProbablyBinary } from '../src/binary.js';

describe('isProbablyBinary', () => {
  it('accepts normal UTF-8 text', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'aslop-text-'));
    const filePath = path.join(dir, 'sample.txt');
    await writeFile(filePath, 'Hello world test\n', 'utf8');

    expect(await isProbablyBinary(filePath)).toBe(false);
  });

  it('rejects null-byte content', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'aslop-bin-'));
    const filePath = path.join(dir, 'sample.bin');
    await writeFile(filePath, Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]));

    expect(await isProbablyBinary(filePath)).toBe(true);
  });

  it('rejects a large binary file (>150 KiB)', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'aslop-bigbin-'));
    const filePath = path.join(dir, 'big.bin');
    const size = 160 * 1024;
    const buf = Buffer.alloc(size);
    for (let i = 0; i < size; i++) {
      buf[i] = i % 256;
    }
    await writeFile(filePath, buf);

    expect(await isProbablyBinary(filePath)).toBe(true);
  });

  it('accepts a large text file (>150 KiB)', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'aslop-bigtxt-'));
    const filePath = path.join(dir, 'big.txt');
    const line = 'The quick brown fox jumps over the lazy dog.\n';
    const repeats = Math.ceil((160 * 1024) / line.length);
    await writeFile(filePath, line.repeat(repeats), 'utf8');

    expect(await isProbablyBinary(filePath)).toBe(false);
  });

  it('accepts an empty file', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'aslop-empty-'));
    const filePath = path.join(dir, 'empty.txt');
    await writeFile(filePath, '');

    expect(await isProbablyBinary(filePath)).toBe(false);
  });

  it('detects files with high ratio of control characters', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'aslop-ctrl-'));
    const filePath = path.join(dir, 'ctrl.bin');
    const buf = Buffer.alloc(100);
    for (let i = 0; i < 100; i++) {
      buf[i] = (i % 8) + 1;
    }
    await writeFile(filePath, buf);

    expect(await isProbablyBinary(filePath)).toBe(true);
  });

  it('accepts text with allowed control characters (tab, newline, CR)', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'aslop-ctrl-ok-'));
    const filePath = path.join(dir, 'tabs.txt');
    await writeFile(filePath, 'col1\tcol2\tcol3\r\nval1\tval2\tval3\n', 'utf8');

    expect(await isProbablyBinary(filePath)).toBe(false);
  });
});
