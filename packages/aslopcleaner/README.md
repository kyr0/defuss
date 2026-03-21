# aslopcleaner

High-performance CLI to normalize common LLM/AI Unicode punctuation and symbols into plain ASCII.

## What it does

- Recursively scans the current directory.
- Uses `fast-glob` to skip expensive third-party/build/cache directories early.
- Never opens `.env*`, SSH keys, certificate/key material, or password database files.
- Skips files larger than **125 KiB**.
- Uses a jump-sampled binary heuristic before reading as UTF-8.
- Prompts once per file in interactive mode.
- Replaces everything automatically in non-interactive mode with `-y`.

## Default replacements

### Dashes / bullets / arrows

- `—` => `-`
- `–` => `-`
- `‒` => `-`
- `―` => `--`
- `‐` => `-`
- `‑` => `-`
- `−` => `-`
- `→` => `=>`
- `⇒` => `=>`
- `⟶` => `=>`
- `➜` => `=>`
- `➔` => `=>`
- `➝` => `=>`
- `✔` => `-`
- `✅` => `-`
- `☑` => `-`
- `✓` => `-`
- `•` => `-`
- `‣` => `-`
- `◦` => `-`
- `▪` => `-`
- `·` => `-`
- `●` => `-`
- `○` => `-`

### Quotes / punctuation / spacing

- `“` => `"`
- `”` => `"`
- `„` => `"`
- `‟` => `"`
- `«` => `"`
- `»` => `"`
- `‹` => `'`
- `›` => `'`
- `‘` => `'`
- `’` => `'`
- `‚` => `'`
- `‛` => `'`
- `…` => `...`
- `≤` => `<=`
- `≥` => `>=`
- `≠` => `!=`
- NBSP / narrow NBSP / figure space => regular space
- zero-width space / joiner / BOM => removed

## Run it

### NPM

```bash
npx aslopcleaner
```

### Bun

```bash
bunx aslopcleaner
```

### PNPM

```bash
pnpx aslopcleaner
```

### Yarn

```bash
yarn dlx aslopcleaner
```

### Local testing

#### Node

```bash
node dist/cli.mjs
```

### Bun

```bash
bun run dist/cli.mjs
```

## Library usage

You can also import `aslopcleaner` as a library to integrate Unicode normalization into your own tools:

```bash
bun add aslopcleaner
pnpm install aslopcleaner
yarn add aslopcleaner
npm install aslopcleaner
```

```ts
import {
  findOccurrences,
  applyOccurrences,
  countByMatch,
  scanDirectory,
  isProbablyBinary,
  shouldSkipSensitivePath,
  REPLACEMENT_RULES,
  REPLACEMENT_RULE_MAP,
} from "aslopcleaner";

// Scan a directory for files containing Unicode slop
const { files, totalOccurrences } = await scanDirectory(process.cwd());

// Find occurrences in a string
const content = '"Hello" → world…';
const matches = findOccurrences(content, REPLACEMENT_RULES);

// Apply replacements
const cleaned = applyOccurrences(content, matches, REPLACEMENT_RULE_MAP);
// => '"Hello" => world...'

// Count occurrences per symbol
const counts = countByMatch(matches);
// => Map { '"' => 1, '"' => 1, '→' => 1, '…' => 1 }

// Check if a file is binary (skip before processing)
const binary = await isProbablyBinary("image.png"); // true

// Check if a path is sensitive (e.g. .env, SSH keys)
shouldSkipSensitivePath(".env.production"); // true
```

### Exported types

```ts
import type { ReplacementRule, MatchOccurrence, ScanResult } from "aslopcleaner";
```
