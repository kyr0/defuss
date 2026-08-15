# `defuss-semantic-compress`

Deterministic, safe-only semantic compressor for LLM input text. Removes or
shortens text only through conservative heuristics — no neural model, no
paraphrasing, no guessing. Works on natural language, Markdown and selected
code-fenced data formats. Implemented in Rust, targets native + WASM.

There is exactly one mode: **`safe`**.

## Core architecture

```text
input text
  -> lossless ASL parse        (render(parse(input)) == input, always)
  -> classification            (lexicon + grammar, multi-language overlay)
  -> rule matching             (on the immutable node graph)
  -> candidate transformations (rules never mutate text)
  -> conflict resolver         (deterministic winner selection)
  -> final writer output       (writes from the ORIGINAL input)
```

Rules only produce transformation **candidates**. The writer decides what
wins. This is what makes `I would like you to build this.` become `build`
and not `I'd like you to build this.`: the phrase-removal candidate has
higher priority than the local contraction, and conflict resolution is
deterministic (class → layer → priority → span length → replacement size →
rule id).

## Workspace layout

```text
crates/
  defuss-semantic-compress/        core library (parse/classify/rules/writer)
  defuss-semantic-compress-cli/    `defuss-semantic-compress` binary
  defuss-semantic-compress-wasm/   wasm-bindgen bindings
  defuss-semantic-compress-eval/   LLM effect safety harness (lib + binary)
rules/
  en/  de/                         per-language JSON rule packs
  shared/                          markdown/codefence format toggles
tests/fixtures/
  e2e/                             input -> expected output fixtures
  integration/                     ASL-level fixtures (classifications, candidates)
  llm_effect/                      LLM behavior-equivalence fixtures
```

## What gets compressed (safe transforms)

- **Politeness phrases** — `Please, could you fix the bug now.` → `fix bug now`
- **DET/FILLER removal** — `within this project` → `within project`,
  `basically fix this` → `fix`
- **Contractions** — `I am` → `I'm` (negation contractions like
  `do not` → `don't` are **not** shipped in v1)
- **JSON code fences** — pretty-printed JSON → compact JSON (invalid JSON is
  left untouched)
- **CSS / HTML code fences** — conservative hand-rolled minifiers (WASM-safe;
  `pre/code/textarea/script/style` content is never altered)
- **Markdown tables** — `| Name | Age |` → `Name|Age` (structure, alignment
  markers and empty cells preserved)
- **Exact repeat lines** — `foo\nfoo\nfoo` → `foo x3` (byte-identical
  consecutive lines only)
- **Paths** — explicit configured regexes only, e.g. `/Users/aron` → `~`
- **Bad words** — per-language lists, word-level removal
- **Docstrings** — `/**\n * Foo\n */` → `/** Foo */` (single-line bodies only)
- **Markdown blank lines** — 2+ blank lines collapse to one

## What is protected

- **Quotes** — `"..."`, `'...'`, `` `...` ``, `> blockquotes`; a sentence
  containing an inline quote is left entirely untouched
- **Code fences** — protected by default; only the `json`/`css`/`html` bodies
  get their format minifier, and `markdown` fences are treated as prose
- **Complementizer clauses** — `I think that this works.` stays untouched
  (`that` after think/believe/know/... introduces a load-bearing clause)
- **Named entities** — fixed known phrases only (`The Hague`, `The Beatles`,
  ...), no TitleCase guessing
- **Negation sentences** — any sentence containing `not`/`never`/`n't`/
  `nicht`/... is fully protected (`Please do not delete this.` untouched)
- **Ambiguous words** — a word present in more than one active language pack
  is never classified or transformed (multi-language overlay cancellation)
- **Empty-sentence guards** — removals never empty a sentence or a paragraph

## Safety nets (final checks)

Every compression run verifies:

- output is valid UTF-8 and never longer than the input
- no resolved candidate intersects a protected span
- **idempotence**: `compress(compress(x)) == compress(x)`

Any violation falls back to returning the input unchanged and is counted in
`metrics.safety_violations`.

## Usage

### Rust

```rust
use defuss_semantic_compress::{compress, CompressConfig};

let result = compress("Please, could you fix the bug now.", CompressConfig::default())?;
assert_eq!(result.output, "fix bug now");
```

Use `Compressor::new(lang, rules_path)` to reuse loaded rule packs.
`Compressor::analyze()` exposes the full pipeline (ASL, candidates,
resolution) for tooling.

### CLI

```bash
cargo run -p defuss-semantic-compress-cli -- file.md
defuss-semantic-compress file.md --json --trace
defuss-semantic-compress --stdin --lang de
defuss-semantic-compress ast file.md          # dump the ASL as JSON
defuss-semantic-compress test tests/fixtures/e2e/
defuss-semantic-compress eval tests/fixtures/llm_effect/
```

### WASM / JS

```ts
import { compress } from "defuss-semantic-compress-wasm";
const result = compress("Please, could you fix the bug now.", { lang: "en" });
// result.output === "fix bug now"
```

## Rule packs

All lexical knowledge lives in JSON under `rules/`:

- `lexicon.json` — word classes: `det`, `filler`, `negation` (protective)
- `grammar_rules.json` — context classification (complementizer `that`,
  named entities, infinitive particle `to`)
- `replacements.json` — contractions + class-removal rules
- `politeness_phrases.json` — phrase rules + action-word list
- `bad_words.json`, `paths.json`
- `shared/` — markdown transform toggles, code-fence format toggles

Rule kinds: `Remove`, `Replace` with layers `Line..Whitespace`, priorities,
sequence patterns (`word`, `regex`, `class`, `normalized`, `symbol`,
`whitespace`, `optional`, `optional_if_class`), anchors (`start`/`end`),
symbol absorption and guards (`forbidden_ancestors`, `forbidden_tags`,
`requires_utf8_saving`, `requires_non_empty_sentence`,
`requires_following_action_word`, `min_utf8_saving`).

Load your own packs with `--rules <dir>` / `rules_path`. The embedded packs
are compiled in, so the library, CLI and WASM build work with zero assets.

## Testing

```bash
cargo test --workspace
```

- parser identity + ASL shape snapshots
- lexicon overlay / grammar disambiguation / matcher / resolver / writer units
- E2E fixtures (`tests/fixtures/e2e`), incl. synthetic-pack ambiguity fixtures
- integration fixtures against the ASL (`tests/fixtures/integration`)
- negative fixtures (§28.4 of the plan) must stay byte-identical
- proptest properties: parse/render identity, UTF-8 validity, idempotence,
  span validity, non-overlapping resolutions, protected-span integrity
- LLM effect harness: `defuss-semantic-compress-eval` with `mock:` providers
  offline, OpenAI-compatible providers via env config

## Notable design decisions (resolving plan ambiguities)

The implementation plan is followed closely; a few contradictions in it were
resolved conservatively:

1. **Final-period removal is sibling-gated.** §21.5 allows removing final
   `.`, but §28.4 requires e.g. `I think that this works.` to stay
   byte-identical. Resolution: a final-period candidate only survives when
   another accepted edit exists in the same block.
2. **Inline quotes protect their whole sentence.** `` `the` is a token. ``
   must stay unchanged (§28.4) although `a` is a DET — quoting signals exact
   text, so the sentence is protected.
3. **Complementizer rules protect the following clause** (`protect_following`),
   keeping `that this works` intact.
4. **Negation sentences are fully protected**, which also explains why
   negation contractions ship disabled (§21.3 + §28.4).
5. **Repeat-line compression skips protected spans** (fences/blockquotes),
   preserving the "protected stays byte-identical" invariant over the literal
   "applies everywhere" wording.
6. Markdown table normal form is uniform: no leading/trailing pipe, `|`
   separators (the plan's §21.6 example output is internally inconsistent).

## License

MIT
