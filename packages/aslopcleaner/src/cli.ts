#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { readFile, writeFile } from "node:fs/promises";
import * as readline from "node:readline/promises";

import { shouldSkipSensitivePath } from "./ignore.js";
import { applyOccurrences, countByMatch } from "./matcher.js";
import { REPLACEMENT_RULE_MAP, REPLACEMENT_RULES } from "./replacements.js";
import { scanDirectory } from "./scanner.js";
import type { MatchOccurrence } from "./types.js";

function parseArgs(argv: readonly string[]): { yes: boolean; help: boolean } {
  const flags = new Set(argv);
  return {
    yes: flags.has("-y") || flags.has("--yes"),
    help: flags.has("-h") || flags.has("--help"),
  };
}

function printHelp(): void {
  console.log(`aslopcleaner

Usage:
  aslopcleaner [-y]

Options:
  -y, --yes   Replace every detected occurrence without prompting
  -h, --help  Show help
`);
}

function formatCounts(matches: readonly MatchOccurrence[]): string {
  const counts = countByMatch(matches);
  const parts = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([match, count]) => {
      const replacement = REPLACEMENT_RULE_MAP.get(match) ?? "?";
      return `${JSON.stringify(match)}=>${JSON.stringify(replacement)} x${count}`;
    });

  return parts.join(", ");
}

async function promptReplace(
  rl: readline.Interface,
  filePath: string,
  matches: readonly MatchOccurrence[],
): Promise<boolean> {
  console.log(`\n${filePath}`);
  console.log(`  ${matches.length} occurrence(s): ${formatCounts(matches)}`);

  while (true) {
    const answer = (await rl.question("  Replace and overwrite? [y/n] "))
      .trim()
      .toLowerCase();

    if (answer === "y") {
      return true;
    }

    if (answer === "n") {
      return false;
    }
  }
}

async function replaceFile(
  root: string,
  relativePath: string,
  matches: readonly MatchOccurrence[],
): Promise<boolean> {
  if (shouldSkipSensitivePath(relativePath)) {
    return false;
  }

  const absolutePath = path.join(root, relativePath);
  const original = await readFile(absolutePath, "utf8");
  const updated = applyOccurrences(original, matches, REPLACEMENT_RULE_MAP);

  if (updated === original) {
    return false;
  }

  await writeFile(absolutePath, updated, "utf8");
  return true;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.yes && (!process.stdin.isTTY || !process.stdout.isTTY)) {
    console.error(
      "Interactive mode requires a TTY. Use -y for non-interactive replacement.",
    );
    process.exitCode = 1;
    return;
  }

  const cwd = process.cwd();
  console.log(`Scanning ${cwd}`);
  console.log(
    `Loaded ${REPLACEMENT_RULES.length} ASCII normalization rule(s).`,
  );

  const scan = await scanDirectory(cwd);
  const entries = [...scan.matchesByFile.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  if (entries.length === 0) {
    console.log("No matching Unicode characters found.");
    return;
  }

  const rl = args.yes
    ? null
    : readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

  let updatedFiles = 0;
  let replacedOccurrences = 0;

  try {
    for (const [filePath, matches] of entries) {
      const shouldReplace =
        args.yes ||
        (rl !== null && (await promptReplace(rl, filePath, matches)));
      if (!shouldReplace) {
        continue;
      }

      const changed = await replaceFile(cwd, filePath, matches);
      if (!changed) {
        continue;
      }

      updatedFiles += 1;
      replacedOccurrences += matches.length;
      console.log(`  updated ${filePath}`);
    }
  } finally {
    await rl?.close();
  }

  console.log("\nDone.");
  console.log(`  files with matches: ${entries.length}`);
  console.log(`  files updated: ${updatedFiles}`);
  console.log(`  occurrences replaced: ${replacedOccurrences}`);
  console.log(`  files scanned after glob filtering: ${scan.scannedFiles}`);
  console.log(
    `  skipped by sensitive path rules: ${scan.skippedBySensitivePattern}`,
  );
  console.log(`  skipped by size (>125 KiB): ${scan.skippedBySize}`);
  console.log(`  skipped as binary: ${scan.skippedByBinary}`);
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(message);
  process.exitCode = 1;
});
