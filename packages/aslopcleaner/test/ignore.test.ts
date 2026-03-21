import { describe, it, expect } from 'vitest';
import path from 'node:path';

import { FAST_GLOB_IGNORE_PATTERNS, MAX_FILE_SIZE_BYTES, shouldSkipSensitivePath, normalizeGlobPath } from '../src/ignore.js';

describe('shouldSkipSensitivePath', () => {
  it('excludes .env files', () => {
    expect(shouldSkipSensitivePath('.env')).toBe(true);
    expect(shouldSkipSensitivePath('.env.production')).toBe(true);
    expect(shouldSkipSensitivePath('.env.local')).toBe(true);
  });

  it('excludes key material', () => {
    expect(shouldSkipSensitivePath('secrets/id_rsa')).toBe(true);
    expect(shouldSkipSensitivePath('id_ed25519')).toBe(true);
    expect(shouldSkipSensitivePath('known_hosts')).toBe(true);
    expect(shouldSkipSensitivePath('authorized_keys')).toBe(true);
    expect(shouldSkipSensitivePath('.npmrc')).toBe(true);
    expect(shouldSkipSensitivePath('.pypirc')).toBe(true);
    expect(shouldSkipSensitivePath('.netrc')).toBe(true);
  });

  it('excludes certificate files', () => {
    expect(shouldSkipSensitivePath('tls/server.pem')).toBe(true);
    expect(shouldSkipSensitivePath('cert.key')).toBe(true);
    expect(shouldSkipSensitivePath('ca.crt')).toBe(true);
    expect(shouldSkipSensitivePath('store.p12')).toBe(true);
    expect(shouldSkipSensitivePath('bundle.pfx')).toBe(true);
    expect(shouldSkipSensitivePath('cert.cer')).toBe(true);
    expect(shouldSkipSensitivePath('cert.der')).toBe(true);
    expect(shouldSkipSensitivePath('cert.csr')).toBe(true);
    expect(shouldSkipSensitivePath('chain.p7b')).toBe(true);
    expect(shouldSkipSensitivePath('chain.p7c')).toBe(true);
    expect(shouldSkipSensitivePath('java.jks')).toBe(true);
    expect(shouldSkipSensitivePath('app.keystore')).toBe(true);
    expect(shouldSkipSensitivePath('key.asc')).toBe(true);
    expect(shouldSkipSensitivePath('key.gpg')).toBe(true);
    expect(shouldSkipSensitivePath('passwords.kdbx')).toBe(true);
  });

  it('allows normal files', () => {
    expect(shouldSkipSensitivePath('docs/readme.md')).toBe(false);
    expect(shouldSkipSensitivePath('src/index.ts')).toBe(false);
    expect(shouldSkipSensitivePath('package.json')).toBe(false);
  });
});

describe('FAST_GLOB_IGNORE_PATTERNS', () => {
  it('targets third-party and build directories', () => {
    expect(FAST_GLOB_IGNORE_PATTERNS).toContain('node_modules/**');
    expect(FAST_GLOB_IGNORE_PATTERNS).toContain('**/dist/**');
    expect(FAST_GLOB_IGNORE_PATTERNS).toContain('**/node_modules/**');
    expect(FAST_GLOB_IGNORE_PATTERNS).toContain('.git/**');
  });

  it('does not include docs', () => {
    expect(FAST_GLOB_IGNORE_PATTERNS).not.toContain('docs/**');
  });
});

describe('MAX_FILE_SIZE_BYTES', () => {
  it('is 125 KiB', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(125 * 1024);
  });
});

describe('normalizeGlobPath', () => {
  it('converts path separators to forward slashes', () => {
    expect(normalizeGlobPath('a/b/c')).toBe('a/b/c');
  });

  it('handles single segment', () => {
    expect(normalizeGlobPath('file.ts')).toBe('file.ts');
  });
});
