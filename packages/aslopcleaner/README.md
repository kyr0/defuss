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

## Run it

```bash
bunx aslopcleaner    # Bun
npx aslopcleaner     # npm
pnpx aslopcleaner    # pnpm
yarn dlx aslopcleaner # Yarn
```

## Default replacements

### Dashes / hyphens

- `—` => `-` (em dash)
- `–` => `-` (en dash)
- `‒` => `-` (figure dash)
- `―` => `--` (horizontal bar)
- `‐` => `-` (hyphen)
- `⁃` => `-` (hyphen bullet)
- `﹘` => `-` (small em dash)
- `﹣` => ` - ` (small hyphen-minus)
- `－` => `-` (fullwidth hyphen-minus)
- `−` => `-` (minus sign)
- `⎯` => `--` (horizontal line extension)
- `⏤` => `--` (straight horizontal bar)
- `─` => `-` (box drawings light horizontal)
- `━` => `-` (box drawings heavy horizontal)
- `╴` => `-` (box drawings light left)
- `╶` => `-` (box drawings light right)
- `᠆` => `-` (mongolian todo soft hyphen)
- `֊` => `-` (hebrew maqaf)
- `゠` => `-` (katakana-hiragana double hyphen)

### Arrows

- `→` => `=>` (right arrow)
- `⟶` => `=>` (long right arrow)
- `➜` => `=>` (heavy right arrow)
- `➔` => `=>` (black right arrow)
- `➝` => `=>` (drafting right arrow)
- `➡` => `=>` (black rightwards arrow)
- `⇢` => `=>` (rightwards dashed arrow)
- `⇨` => `=>` (rightwards white arrow)
- `⇒` => `=>` (double right arrow)
- `⟹` => `=>` (long double right arrow)
- `⇛` => `=>` (rightwards triple dash arrow)
- `←` => `<=` (left arrow)
- `⟵` => `<=` (long left arrow)
- `⇐` => `<=` (double left arrow)
- `⟸` => `<=` (long double left arrow)
- `⬅` => `<=` (black leftwards arrow)
- `↔` => `<->` (left right arrow)
- `⇄` => `<->` (right arrow over left arrow)
- `⇆` => `<->` (left arrow over right arrow)
- `⇔` => `<=>` (left right double arrow)
- `⟷` => `<->` (long left right arrow)
- `⟺` => `<=>` (long left right double arrow)
- `↑` => `^` (up arrow)
- `⇑` => `^` (double up arrow)
- `↓` => `v` (down arrow)
- `⇓` => `v` (double down arrow)
- `↕` => `^v` (up down arrow)
- `⇕` => `^v` (up down double arrow)

### Bullets / markers

- `✔` => `[OK]` (heavy check mark)
- `✅` => `[OK]` (check mark button)
- `☑` => `[OK]` (ballot box with check)
- `✓` => `[OK]` (check mark)
- `🗸` => `[ ]` (light check mark)
- `✗` => `[X]` (crossed out)
- `✘` => `[X]` (crossed out bold)
- `✕` => `x` (multiplication x)
- `✖` => `x` (heavy multiplication x)
- `•` => `-` (bullet)
- `‣` => `->` (triangular bullet)
- `◦` => `°` (white bullet)
- `▪` => `[ ]` (small square bullet)
- `▫` => `[ ]` (small white square)
- `■` => `[ ]` (black square)
- `□` => `[ ]` (white square)
- `▸` => `->` (black right-pointing small triangle)
- `▹` => `->` (white right-pointing small triangle)
- `►` => `->` (black right-pointing pointer)
- `▻` => `->` (white right-pointing pointer)
- `●` => `-` (black circle bullet)
- `○` => `-` (white circle bullet)
- `◉` => `-` (fisheye)
- `◎` => `-` (bullseye)
- `◯` => `-` (large circle)
- `·` => `-` (middle dot)
- `・` => `-` (katakana middle dot)
- `∙` => `*` (bullet operator)
- `⋅` => `*` (dot operator)
- `‧` => `-` (hyphenation point)
- `※` => `-` (reference mark)
- `⁂` => `***` (asterism)
- `❖` => `<>` (black diamond minus white x)
- `◆` => `<>` (black diamond)
- `◇` => `<>` (white diamond)
- `◈` => `<>` (white diamond containing black small diamond)
- `❥` => `{>` (rotated heavy black heart bullet)

### Quotes / apostrophes / primes

- `"` => `"` (left double quote)
- `"` => `"` (right double quote)
- `„` => `"` (low double quote)
- `‟` => `"` (double high-reversed-9 quote)
- `«` => `"` (left guillemet)
- `»` => `"` (right guillemet)
- `‹` => `<` (left single guillemet)
- `›` => `>` (right single guillemet)
- `'` => `'` (left single quote)
- `'` => `'` (right single quote / apostrophe)
- `‚` => `'` (low single quote)
- `‛` => `'` (single high-reversed-9 quote)
- `❛` => `'` (heavy left single quote ornament)
- `❜` => `'` (heavy right single quote ornament)
- `❝` => `"` (heavy left double quote ornament)
- `❞` => `"` (heavy right double quote ornament)
- `〝` => `"` (reversed double prime quote)
- `〞` => `"` (double prime quote)
- `＂` => `"` (fullwidth quotation mark)
- `＇` => `'` (fullwidth apostrophe)
- `′` => `'` (prime)
- `‵` => `` ` `` (reversed prime)
- `ʹ` => `'` (modifier letter prime)
- `ʻ` => `'` (modifier letter turned comma)
- `ʼ` => `'` (modifier letter apostrophe)
- `ʽ` => `'` (modifier letter reversed comma)
- `ʾ` => `'` (modifier letter right half ring)
- `ʿ` => `'` (modifier letter left half ring)
- `ˈ` => `'` (modifier letter vertical line)
- `ˊ` => `'` (modifier letter acute accent)
- `ˋ` => `` ` `` (modifier letter grave accent)
- `˴` => `` ` `` (modifier letter middle grave accent)
- `´` => `'` (acute accent)
- `″` => `""` (double prime)
- `‶` => `""` (reversed double prime)
- `ʺ` => `""` (modifier letter double prime)
- `‴` => `"""` (triple prime)
- `⁗` => `""""` (quadruple prime)

### Ellipsis / dots

- `…` => `...` (ellipsis)
- `‥` => `..` (two dot leader)
- `⋯` => `...` (midline horizontal ellipsis)
- `︙` => `:` (presentation form for vertical horizontal ellipsis)
- `⋮` => `:` (vertical ellipsis)
- `⋰` => `...` (up right diagonal ellipsis)
- `⋱` => `:` (down right diagonal ellipsis)

### Math / relations

- `≤` => `<=` (less-than-or-equal)
- `≦` => `<=` (less-than over equal)
- `⩽` => `<=` (slanted equal to or less-than)
- `≥` => `>=` (greater-than-or-equal)
- `≧` => `>=` (greater-than over equal)
- `⩾` => `>=` (slanted equal to greater-than)
- `≠` => `!=` (not-equal)
- `≉` => `!=` (not almost equal)
- `≈` => `~=` (almost equal)
- `≃` => `~=` (asymptotically equal)
- `≅` => `~=` (approximately equal)
- `∼` => `~` (tilde operator)
- `∽` => `~` (reversed tilde)
- `∿` => `~` (sine wave)
- `˜` => `~` (small tilde)
- `〜` => `~` (wave dash)
- `～` => `~` (fullwidth tilde)
- `≪` => `<<` (much less-than)
- `≫` => `>>` (much greater-than)
- `⋘` => `<<` (very much less-than)
- `⋙` => `>>` (very much greater-than)
- `¬` => `!` (not sign)
- `±` => `+/-` (plus-minus)
- `∓` => `-/+` (minus-or-plus)
- `×` => `x` (times sign)
- `÷` => `/` (division sign)
- `⁄` => `/` (fraction slash)
- `∕` => `/` (division slash)
- `∣` => `|` (divides)
- `∥` => `||` (parallel to)
- `¦` => `|` (broken bar)
- `‖` => `||` (double vertical line)
- `∧` => `^` (logical and)
- `∨` => `v` (logical or)
- `⊕` => `+` (circled plus)
- `⊗` => `*` (circled times)
- `⊙` => `.` (circled dot)
- `√` => `sqrt` (square root)
- `∛` => `cuberoot` (cube root)
- `∞` => `inf` (infinity)
- `∈` => `in` (element of)
- `∉` => `not in` (not element of)
- `∅` => `{}` (empty set)
- `∩` => `cap` (intersection)
- `∪` => `cup` (union)
- `⊂` => `<` (subset of)
- `⊃` => `>` (superset of)
- `⊆` => `<=` (subset of or equal)
- `⊇` => `>=` (superset of or equal)
- `∴` => `therefore` (therefore)
- `∵` => `because` (because)

### Fractions

- `¼` => `1/4` (one quarter)
- `½` => `1/2` (one half)
- `¾` => `3/4` (three quarters)
- `⅐` => `1/7` (one seventh)
- `⅑` => `1/9` (one ninth)
- `⅒` => `1/10` (one tenth)
- `⅓` => `1/3` (one third)
- `⅔` => `2/3` (two thirds)
- `⅕` => `1/5` (one fifth)
- `⅖` => `2/5` (two fifths)
- `⅗` => `3/5` (three fifths)
- `⅘` => `4/5` (four fifths)
- `⅙` => `1/6` (one sixth)
- `⅚` => `5/6` (five sixths)
- `⅛` => `1/8` (one eighth)
- `⅜` => `3/8` (three eighths)
- `⅝` => `5/8` (five eighths)
- `⅞` => `7/8` (seven eighths)

### Symbols

- `©` => `(C)` (copyright sign)
- `®` => `(R)` (registered sign)
- `℗` => `(P)` (sound recording copyright)
- `™` => `TM` (trade mark sign)
- `℠` => `SM` (service mark)
- `°` => ` deg` (degree sign)
- `℃` => ` degC` (degree celsius)
- `℉` => ` degF` (degree fahrenheit)
- `№` => `No.` (numero sign)
- `ª` => `a` (feminine ordinal indicator)
- `º` => `o` (masculine ordinal indicator)
- `‰` => `permille` (per mille sign)
- `‱` => `permyriad` (per ten thousand sign)

### Spaces / invisibles / separators

- NBSP, ogham space mark, en/em quad/space, thin space, hair space, etc. => regular space
- Soft hyphen, zero-width space/joiner/non-joiner, word joiner, BOM, etc. => removed
- Line separator, paragraph separator, vertical tab, form feed => newline(s)

### Slashes / bars

- `／` => `/` (fullwidth solidus)
- `⧸` => `/` (big solidus)
- `╱` => `/` (box drawings diagonal)
- `⟋` => `/` (mathematical rising diagonal)
- `＼` => `\` (fullwidth reverse solidus)
- `∖` => `\` (set minus)
- `⧵` => `\` (reverse solidus operator)
- `⟍` => `\` (mathematical falling diagonal)
- `╲` => `\` (box drawings diagonal)
- `｜` => `|` (fullwidth vertical line)
- `ǀ` => `|` (latin letter dental click)
- `︱` => `|` (presentation form for vertical em dash)
- `│` => `|` (box drawings light vertical)
- `┃` => `|` (box drawings heavy vertical)
- `┆` => `|` (box drawings light triple dash vertical)
- `┊` => `|` (box drawings light quadruple dash vertical)
- `╎` => `|` (box drawings light double dash vertical)
- `╏` => `|` (box drawings heavy double dash vertical)

### Punctuation

- `：` => `:` (fullwidth colon)
- `∶` => `:` (ratio)
- `ː` => `:` (modifier letter triangular colon)
- `꞉` => `:` (modifier letter colon)
- `；` => `;` (fullwidth semicolon)
- `，` => `,` (fullwidth comma)
- `、` => `,` (ideographic comma)
- `﹐` => `,` (small comma)
- `﹑` => `,` (small ideographic comma)
- `．` => `.` (fullwidth full stop)
- `。` => `.` (ideographic full stop)
- `｡` => `.` (halfwidth ideographic full stop)
- `！` => `!` (fullwidth exclamation mark)
- `‼` => `!!` (double exclamation mark)
- `⁉` => `?!` (exclamation question mark)
- `？` => `?` (fullwidth question mark)
- `⁇` => `??` (double question mark)
- `⁈` => `!?` (question exclamation mark)

### Brackets

- `（` / `）` => `(` / `)` (fullwidth parentheses)
- `［` / `］` => `[` / `]` (fullwidth square brackets)
- `｛` / `｝` => `{` / `}` (fullwidth curly brackets)
- `〈` / `〉` => `<` / `>` (angle brackets)
- `《` / `》` => `<<` / `>>` (double angle brackets)
- `⟨` / `⟩` => `<` / `>` (mathematical angle brackets)
- `「` / `」` => `[` / `]` (corner brackets)
- `『` / `』` => `[` / `]` (white corner brackets)
- `【` / `】` => `[` / `]` (black lenticular brackets)
- `〔` / `〕` => `[` / `]` (tortoise shell brackets)
- `〖` / `〗` => `[` / `]` (white lenticular brackets)
- `〘` / `〙` => `[` / `]` (white tortoise shell brackets)
- `〚` / `〛` => `[` / `]` (white square brackets)

### Misc ASCII lookalikes

- `＆` => `&` (fullwidth ampersand)
- `＊` => `*` (fullwidth asterisk)
- `＿` => `_` (fullwidth low line)
- `‗` => `_` (double low line)
- `＾` => `^` (fullwidth circumflex accent)
- `‸` => `^` (caret insertion point)
- `％` => `%` (fullwidth percent)
- `＋` => `+` (fullwidth plus)
- `＝` => `=` (fullwidth equals)
- `═` => `=` (box drawings double horizontal)
- `╬` => `+` (box drawings double horizontal and vertical)
- `╪` => `+` (box drawings double vertical and horizontal)
- `╫` => `+` (box drawings vertical double and horizontal)
- `╩` => `+` (box drawings double up and horizontal)
- `╨` => `+` (box drawings double down and horizontal)
- `╂` => `+` (box drawings light vertical and horizontal)
- `╋` => `+` (box drawings heavy vertical and horizontal)

### Local testing

```bash
node dist/cli.mjs    # Node
bun run dist/cli.mjs # Bun
```

## Library usage

You can also import `aslopcleaner` as a library to integrate Unicode normalization into your own tools:

```bash
bun add aslopcleaner
pnpm add aslopcleaner
yarn add aslopcleaner
npm add aslopcleaner
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
