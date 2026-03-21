import fg from 'fast-glob';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';

import { isProbablyBinary } from './binary.js';
import {
  FAST_GLOB_IGNORE_PATTERNS,
  MAX_FILE_SIZE_BYTES,
  normalizeGlobPath,
  shouldSkipSensitivePath
} from './ignore.js';
import { findOccurrences } from './matcher.js';
import { REPLACEMENT_RULES } from './replacements.js';
import type { ScanResult } from './types.js';

const DEFAULT_CONCURRENCY = 64;

async function processFile(
  cwd: string,
  relativePath: string
): Promise<{ path: string; matches: ReturnType<typeof findOccurrences> } | { kind: 'sensitive' | 'size' | 'binary' | 'none' }> {
  const normalizedPath = normalizeGlobPath(relativePath);

  if (shouldSkipSensitivePath(normalizedPath)) {
    return { kind: 'sensitive' };
  }

  const absolutePath = path.join(cwd, relativePath);
  const fileStat = await stat(absolutePath);

  if (fileStat.size > MAX_FILE_SIZE_BYTES) {
    return { kind: 'size' };
  }

  if (await isProbablyBinary(absolutePath)) {
    return { kind: 'binary' };
  }

  const content = await readFile(absolutePath, 'utf8');
  const matches = findOccurrences(content, REPLACEMENT_RULES);

  if (matches.length === 0) {
    return { kind: 'none' };
  }

  return {
    path: normalizedPath,
    matches
  };
}

export async function scanDirectory(cwd: string): Promise<ScanResult> {
  const matchesByFile = new Map<string, ReturnType<typeof findOccurrences>>();
  let scannedFiles = 0;
  let skippedBySensitivePattern = 0;
  let skippedBySize = 0;
  let skippedByBinary = 0;

  const stream = fg.stream('**/*', {
    cwd,
    onlyFiles: true,
    dot: true,
    followSymbolicLinks: false,
    unique: true,
    ignore: [...FAST_GLOB_IGNORE_PATTERNS]
  });

  const inFlight = new Set<Promise<void>>();

  const schedule = async (relativePath: string): Promise<void> => {
    scannedFiles += 1;

    try {
      const result = await processFile(cwd, relativePath);

      if ('kind' in result) {
        if (result.kind === 'sensitive') {
          skippedBySensitivePattern += 1;
        } else if (result.kind === 'size') {
          skippedBySize += 1;
        } else if (result.kind === 'binary') {
          skippedByBinary += 1;
        }
        return;
      }

      matchesByFile.set(result.path, result.matches);
    } catch {
      // Permission errors, transient broken paths, etc. are ignored.
    }
  };

  for await (const entry of stream) {
    const relativePath = String(entry);
    const task = schedule(relativePath).finally(() => {
      inFlight.delete(task);
    });

    inFlight.add(task);

    if (inFlight.size >= DEFAULT_CONCURRENCY) {
      await Promise.race(inFlight);
    }
  }

  await Promise.all(inFlight);

  return {
    matchesByFile,
    scannedFiles,
    skippedByGlob: 0,
    skippedBySensitivePattern,
    skippedBySize,
    skippedByBinary
  };
}
