https://chatgpt.com/c/6a2940e0-38e8-83eb-9d73-570c28877031

# `defuss-semantic-compress` Implementation Plan

## 1. Goal

Implement `defuss-semantic-compress`: a deterministic, safe-only semantic compressor for LLM input text.

The compressor:

- removes/shortens text only through conservative heuristics
- works on natural language + Markdown + selected code-fenced data formats
- is implemented in Rust
- targets native + WASM
- uses no neural model in v1
- uses per-language JSON rule packs
- supports multi-language lexicon overlays
- avoids ambiguous cross-language word classification
- emits traceable transformations
- supports deterministic unit, integration, E2E, and LLM-effect safety tests

There is only one shipped mode:

```txt
safe
```

No unsafe/aggressive mode.

---

## 2. Core principle

The system must never apply rules by mutating the input text directly.

Instead:

```txt
input text
  -> lossless ASL parse
  -> classification
  -> rule matching on immutable node graph
  -> candidate transformations
  -> conflict resolver / writer planner
  -> final writer output
```

Rules only produce transformation candidates.

The final writer decides what wins.

This solves sequence problems like:

```txt
I would like you to build this.
```

where one rule might propose:

```txt
I would -> I'd
```

but another proposes:

```txt
I would like you to -> ""
```

The removal candidate must win because it has higher semantic compression priority over a local contraction.

---

## 3. Non-goals

Do not implement:

- unsafe grammar compression
- generalized paraphrasing
- neural compression
- URL aliasing like `GH:defuss`
- generalized log summarization
- comment/docstring prose rewriting
- OpenAPI schema pruning
- table-to-CSV conversion
- path abbreviation except explicit safe path regexes
- markdown heading normalization
- bullet label conversion
- broad regex rewriting without ASL context

---

## 4. Crate layout

```txt
defuss-semantic-compress/
  Cargo.toml

  crates/
    defuss-semantic-compress/
      src/
        lib.rs
        config.rs

        asl.rs
        span.rs
        render.rs
        trace.rs
        metrics.rs
        safety.rs

        parse/
          mod.rs
          markdown.rs
          block.rs
          codefence.rs
          quote.rs
          sentence.rs
          token.rs

        classify/
          mod.rs
          language.rs
          lexicon.rs
          grammar.rs
          overlay.rs

        rules/
          mod.rs
          schema.rs
          loader.rs
          matcher.rs
          candidate.rs
          resolver.rs
          writer.rs

        transforms/
          codefence_json.rs
          codefence_css.rs
          codefence_html.rs
          det_filler.rs
          contractions.rs
          politeness.rs
          punctuation.rs
          markdown_table.rs
          repeat_lines.rs
          paths.rs
          bad_words.rs
          docstrings.rs

    defuss-semantic-compress-cli/
      src/main.rs

    defuss-semantic-compress-wasm/
      src/lib.rs

    defuss-semantic-compress-eval/
      src/main.rs

  rules/
    en/
      lexicon.json
      grammar_rules.json
      replacements.json
      politeness_phrases.json
      bad_words.json
      paths.json

    de/
      lexicon.json
      grammar_rules.json
      replacements.json
      politeness_phrases.json
      bad_words.json
      paths.json

    shared/
      markdown.json
      codefence_formats.json

  tests/
    fixtures/
      unit/
      integration/
      e2e/
      llm_effect/
```

---

## 5. ASL: Abstract Semantic Layout

The internal representation is a lossless tree.

Invariant:

```rust
assert_eq!(render(parse(input)), input);
```

No transform is allowed to break this unless the writer explicitly emits a compressed output.

---

## 6. ASL node model

```rust
pub type NodeId = u32;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Asl {
    pub root: NodeId,
    pub nodes: Vec<Node>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Node {
    pub id: NodeId,
    pub kind: NodeKind,
    pub span: Span,
    pub children: Vec<NodeId>,
    pub text: Option<String>,
    pub meta: NodeMeta,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Span {
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum NodeKind {
    Root,

    Paragraph,
    Sentence,

    Word,
    Symbol,
    Whitespace,
    Newline,

    Quote,

    CodeFence,
    CodeFencePreamble,
    CodeFenceBody,

    MarkdownHeading,
    MarkdownList,
    MarkdownListItem,
    MarkdownTable,
    MarkdownTableRow,
    MarkdownTableCell,

    Det,
    Filler,
    Politeness,
    BadWord,

    Complementizer,
    NamedEntity,
    Prep,
    InfParticle,

    Json,
    Css,
    Html,
    Markdown,

    Unknown,
}
```

---

## 7. Node metadata

```rust
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct NodeMeta {
    pub lang: Option<String>,
    pub tags: Vec<Tag>,
    pub attrs: BTreeMap<String, String>,

    pub protected: bool,

    pub original_text: Option<String>,
    pub normalized_text: Option<String>,

    pub classification_rule: Option<String>,
}
```

Tags:

```rust
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Tag {
    Det,
    Filler,

    Quote,
    CodeFence,

    NamedEntity,
    Complementizer,

    Prep,
    InfParticle,

    PolitePrefix,
    PoliteSuffix,

    BadWord,
}
```

Important: `original_text` is immutable after parsing.

---

## 8. Parsing stages

Parsing happens coarse-to-fine.

```txt
input
  -> block scanner
  -> code fence scanner
  -> markdown scanner
  -> paragraph splitter
  -> sentence splitter
  -> inline quote scanner
  -> token scanner
  -> ASL
```

### 8.1 Code fences

Detect before normal inline parsing.

Supported:

````md
```json
{}
```
````

and:

````md
~~~json
{}
~~~
````

A code fence node stores:

```json
{
  "kind": "CodeFence",
  "meta": {
    "fence": "```",
    "preamble": "json"
  }
}
```

Default: code fences are protected.

Exceptions:

```txt
json       -> JSON minifier
css        -> CSS minifier
html       -> HTML minifier
markdown   -> safe Markdown transforms
```

### 8.2 Quotes

Quotes create ancestor nodes.

Examples:

```txt
"this"
'this'
> this
```

Any child inside `Quote` is protected by default.

### 8.3 Tokenization

Leaf nodes preserve exact source text.

Example:

```txt
Please, could you fix the bug now.
```

Token leaves:

```txt
Word("Please")
Symbol(",")
Whitespace(" ")
Word("could")
Whitespace(" ")
Word("you")
Whitespace(" ")
Word("fix")
Whitespace(" ")
Word("the")
Whitespace(" ")
Word("bug")
Whitespace(" ")
Word("now")
Symbol(".")
```

---

## 9. Language lexicons

Only these word classes are supported in v1:

```txt
DET:
  the, a, an, this, that, these, those

FILLER:
  basically, actually, simply, just, really, quite
```

Per-language equivalents live in:

```txt
rules/{lang}/lexicon.json
```

Example:

```json
{
  "language": "en",
  "classes": {
    "det": ["the", "a", "an", "this", "that", "these", "those"],
    "filler": ["basically", "actually", "simply", "just", "really", "quite"]
  }
}
```

---

## 10. Multi-language overlay

Build active lexicon from selected language packs.

For each folded word:

```txt
word -> [(language, class)]
```

If a word appears in more than one language pack:

```txt
omit from active classification
```

Even if both languages assign the same class.

Reason: deterministic safety in mixed-language input.

Example:

```txt
"die" appears in English/German context
=> not classified
=> no deletion
```

---

## 11. Grammar disambiguation

Some lexicon candidates must be protected.

### 11.1 `that` as complementizer

Protect `that` when it introduces a clause.

Examples:

```txt
I think that this works.
Ensure that the file exists.
The fact that this works matters.
```

Rule output:

```txt
that -> Complementizer
that.protected = true
```

Example rule:

```json
{
  "id": "en.that.complementizer",
  "target": "that",
  "classify_as": "Complementizer",
  "patterns": [
    {
      "before": ["think|believe|know|ensure|verify|confirm|assume|mean|say|said|claim|fact"],
      "self": "that",
      "after": ["\\w+"]
    }
  ]
}
```

### 11.2 `The` in named entities

Protect fixed known named-entity phrases.

Examples:

```txt
The Hague
The Netherlands
The Beatles
The Matrix
The Lord of the Rings
```

Rule output:

```txt
The -> NamedEntity
The.protected = true
```

Do not use generic TitleCase named-entity guessing in safe mode.

### 11.3 `to` classification

Needed for politeness phrases.

Classify:

```txt
to Berlin        -> Prep
to him           -> Prep
Monday to Friday -> Prep
to build         -> InfParticle
to fix           -> InfParticle
to understand    -> InfParticle
```

In v1 this is narrow and lexicon-driven.

Example:

```json
{
  "id": "en.to.inf_particle",
  "self": "to",
  "after": [
    "build",
    "fix",
    "create",
    "write",
    "remove",
    "add",
    "explain",
    "summarize",
    "compress",
    "understand"
  ],
  "classify_as": "InfParticle"
}
```

---

## 12. Rule system

Rules do **not** mutate ASL.

Rules emit candidate transformations.

A rule declares:

```txt
id
phase
priority
match basis
pattern
guards
candidate output transformation
```

The candidate output is explicit.

---

## 13. Candidate transformation model

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Candidate {
    pub id: CandidateId,
    pub rule_id: String,
    pub phase: Phase,

    pub priority: i32,
    pub layer: TransformLayer,

    pub target_nodes: Vec<NodeId>,
    pub target_span: Span,

    pub kind: CandidateKind,

    pub replacement: Option<String>,

    pub safety: SafetyClass,
}
```

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CandidateKind {
    Remove,
    Replace,
    CompactWhitespace,
    CompactStructuredFormat,
    RepeatCompress,
}
```

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransformLayer {
    Line,
    Block,
    Phrase,
    Word,
    Symbol,
    Whitespace,
}
```

---

## 14. Candidate examples

### 14.1 Contraction candidate

Input:

```txt
I would like you to build this.
```

Rule:

```txt
I would -> I'd
```

Candidate:

```json
{
  "rule_id": "en.contract.i_would",
  "phase": "contractions",
  "layer": "Word",
  "kind": "Replace",
  "target_nodes": [1, 2, 3],
  "replacement": "I'd",
  "priority": 100
}
```

### 14.2 Politeness removal candidate

Input:

```txt
I would like you to build this.
```

Rule:

```txt
I would like you to -> ""
```

Candidate:

```json
{
  "rule_id": "en.polite.i_would_like_you_to",
  "phase": "politeness",
  "layer": "Phrase",
  "kind": "Remove",
  "target_nodes": [1, 2, 3, 4, 5, 6, 7, 8, 9],
  "replacement": "",
  "priority": 500
}
```

The writer sees overlap.

Removal wins.

Output:

```txt
build this.
```

Not:

```txt
I'd like you to build this.
```

---

## 15. Conflict resolution

Candidates can overlap. The writer resolves them deterministically.

### 15.1 Primary priority order

```txt
Remove > CompactStructuredFormat > RepeatCompress > Replace > CompactWhitespace
```

### 15.2 Layer priority

For overlapping candidates:

```txt
Line > Block > Phrase > Word > Symbol > Whitespace
```

### 15.3 Explicit rule priority

Higher numeric priority wins.

```txt
priority 500 > priority 100
```

### 15.4 Span length

For equal class/layer/priority:

```txt
longer span wins
```

### 15.5 Word-level replacement tie-break

If multiple word-level replacements collide:

```txt
replacement with fewer UTF-8 symbols wins
```

If still tied:

```txt
lexicographically smaller replacement wins
```

If still tied:

```txt
lower rule_id wins
```

### 15.6 Final deterministic sort

```txt
candidate class
layer
priority
span length
replacement UTF-8 length
rule_id
target_span.start
```

---

## 16. Writer model

The writer consumes:

```txt
original input text
ASL
resolved candidate set
```

It emits final text by walking original spans.

Pseudo-code:

```rust
fn write(input: &str, asl: &Asl, candidates: &[Candidate]) -> String {
    let resolved = resolve_conflicts(candidates);
    let edits = candidates_to_edits(resolved);

    let mut out = String::new();
    let mut cursor = 0;

    for edit in edits.sorted_by_start() {
        out.push_str(&input[cursor..edit.start]);

        match edit.kind {
            EditKind::Remove => {}
            EditKind::Replace => out.push_str(&edit.replacement),
        }

        cursor = edit.end;
    }

    out.push_str(&input[cursor..]);
    repair_whitespace(out)
}
```

Important:

- The writer writes from the original input.
- Rules never depend on previous textual mutations.
- Transform candidates may be generated from ASL classification and original spans.
- Optional later pass may parse writer output again, but v1 should avoid multi-pass semantic mutation.

---

## 17. Apply phases

Even though text is not mutated during matching, phases still matter for classification and candidate generation.

Recommended phases:

```txt
0 parse
1 classify_language_and_lexicon
2 classify_grammar
3 generate_codefence_format_candidates
4 generate_exact_repeat_line_candidates
5 generate_contraction_candidates
6 generate_politeness_candidates
7 generate_det_filler_candidates
8 generate_bad_word_candidates
9 generate_markdown_table_candidates
10 generate_punctuation_candidates
11 generate_path_candidates
12 generate_docstring_candidates
13 resolve_candidates
14 write_output
15 final_safety_checks
```

---

## 18. Why this phase order works

### 18.1 Code-fence candidates early

Structured compression is independent.

### 18.2 Exact repeat line candidates early

Line-level removal must dominate lower-level phrase/word candidates.

### 18.3 Contractions before politeness?

Candidate generation can happen in this order, but it must not require mutation.

Politeness rules should include both:

```txt
I would like you to
I'd like you to
```

or use normalized pattern aliases.

However, conflict resolution ensures phrase removal beats contraction.

### 18.4 DET/FILLER after politeness

DET/FILLER candidates are lower priority.

Example:

```txt
Please fix the bug.
```

Candidates:

```txt
Please       -> remove politeness
the          -> remove det
.            -> remove punctuation
```

Writer output:

```txt
fix bug
```

---

## 19. Normalized matching without mutation

To reduce variants, matcher supports normalized token views.

Each token has:

```txt
original_text
folded_text
normalized_form
class tags
```

Example:

```txt
I would
I'd
I’d
```

can all normalize to:

```txt
i_would
```

A politeness rule may match normalized forms:

```json
{
  "id": "en.polite.i_would_like_you_to",
  "phase": "politeness",
  "priority": 500,
  "layer": "Phrase",
  "kind": "Remove",
  "match": [
    { "normalized": "i_would" },
    { "word": "like" },
    { "word": "you" },
    { "word": "to", "optional_if_class": "InfParticle" }
  ],
  "guards": {
    "forbidden_ancestors": ["Quote", "CodeFence"],
    "requires_following_action_word": true
  }
}
```

This keeps matching stable without text mutation.

---

## 20. Rule JSON schemas

### 20.1 Grammar rule

```json
{
  "id": "en.that.complementizer",
  "phase": "grammar",
  "kind": "classify",
  "priority": 100,
  "target": { "word": "that" },
  "context": {
    "before": ["think|believe|know|ensure|verify|confirm|assume|mean|say|said|claim|fact"],
    "after": ["\\w+"]
  },
  "classify_as": "Complementizer",
  "protect": true
}
```

### 20.2 Replacement rule

```json
{
  "id": "en.contract.i_would",
  "phase": "contractions",
  "kind": "Replace",
  "layer": "Word",
  "priority": 100,
  "match": [
    { "regex": "^[Ii]$" },
    { "whitespace": true },
    { "regex": "^would$" }
  ],
  "replacement": "I'd",
  "guards": {
    "forbidden_ancestors": ["Quote", "CodeFence"],
    "requires_utf8_saving": true
  }
}
```

### 20.3 Politeness rule

```json
{
  "id": "en.polite.i_would_like_you_to",
  "phase": "politeness",
  "kind": "Remove",
  "layer": "Phrase",
  "priority": 500,
  "partial_match": true,
  "match": [
    { "normalized": "i_would" },
    { "word": "like" },
    { "word": "you" },
    {
      "word": "to",
      "optional_if_class": "InfParticle"
    }
  ],
  "guards": {
    "forbidden_ancestors": ["Quote", "CodeFence"],
    "requires_following_action_word": true
  }
}
```

### 20.4 DET/FILLER rule

```json
{
  "id": "en.det.remove",
  "phase": "det_filler",
  "kind": "Remove",
  "layer": "Word",
  "priority": 200,
  "match": [
    { "class": "Det" }
  ],
  "guards": {
    "forbidden_ancestors": ["Quote", "CodeFence"],
    "forbidden_tags": ["NamedEntity", "Complementizer"],
    "requires_non_empty_sentence": true
  }
}
```

### 20.5 Bad-word rule

```json
{
  "id": "en.bad_words.remove",
  "phase": "bad_words",
  "kind": "Remove",
  "layer": "Word",
  "priority": 300,
  "match": [
    { "class": "BadWord" }
  ],
  "guards": {
    "forbidden_ancestors": ["Quote", "CodeFence"]
  }
}
```

---

## 21. Transform specifications

## 21.1 DET/FILLER removal

Allowed:

```txt
DET
FILLER
```

Forbidden when inside:

```txt
Quote
CodeFence
```

Except:

```txt
CodeFence(markdown)
```

Forbidden tags:

```txt
NamedEntity
Complementizer
```

Examples:

```txt
within this project -> within project
the bug -> bug
basically fix this -> fix
```

Reject:

```txt
this -> ""
that -> ""
```

because the sentence would become empty.

---

## 21.2 Politeness removal

Prefix examples:

```txt
please
could you
can you
would you
kindly
I would like you to
I'd like you to
I would appreciate if you could
```

Suffix examples:

```txt
please
thanks
thank you
if possible
when you have time
```

Examples:

```txt
Please, could you fix the bug now.
-> fix bug now

Could you fix the bug please.
-> fix bug
```

Rules produce phrase-level removal candidates.

Phrase-level removal beats word-level replacement.

---

## 21.3 Contractions

Examples:

```txt
I would -> I'd
I am -> I'm
you are -> you're
we are -> we're
they are -> they're
```

Safe restrictions:

- not in quotes
- not in code fences
- replacement must reduce UTF-8 symbol count
- final resolved output should not increase token count if tokenizer available

Caution:

```txt
do not -> don't
```

Allowed only if explicitly enabled and tested, because negation is semantically critical.

Default v1 should skip negation contractions.

---

## 21.4 Code-fenced data compression

Only inside matching code fences.

### JSON

Use parse/serialize compact JSON.

```json
{
  "a": 1,
  "b": [2, 3]
}
```

becomes:

```json
{"a":1,"b":[2,3]}
```

If parsing fails, leave unchanged.

### CSS

Use a real CSS minifier only.

If unavailable in WASM target, disable CSS compression there.

### HTML

Use conservative HTML minifier only.

Never alter:

```txt
pre
code
textarea
script
style
```

unless parser/minifier is explicitly safe.

---

## 21.5 Markdown blank line and punctuation compression

Allowed outside quote/code:

```txt
collapse multiple blank lines
remove final "." in paragraphs
remove final "." in list items
```

Do not normalize headings.

Do not convert bullet labels.

Do not alter blockquote content.

---

## 21.6 Markdown table compression

Preserve table structure.

Input:

```md
| Name | Age | City |
| --- | ---: | --- |
| Alice | 30 | Berlin |
```

Output:

```md
Name|Age|City
---|---:|---
Alice|30|Berlin|
```

Rules:

- preserve header row
- preserve alignment row
- preserve row count
- preserve column count
- preserve alignment markers
- do not convert to CSV
- do not drop semantic empty cells

---

## 21.7 Exact consecutive line repeat compression

Applies everywhere.

Only if lines are byte-exact equal and consecutive.

Input:

```txt
foo
foo
foo
```

Output:

```txt
foo x3
```

Do not compress similar lines.

Do not compress stack traces by pattern.

Only byte-identical line repetition.

---

## 21.8 Path compression

Only explicit configured regexes.

Allowed examples:

```txt
/Users/aron -> ~
/home/aron -> ~
```

Rule format:

```json
{
  "id": "path.home.aron.macos",
  "phase": "paths",
  "kind": "Replace",
  "layer": "Phrase",
  "priority": 100,
  "regex": "/Users/aron\\b",
  "replacement": "~",
  "guards": {
    "requires_utf8_saving": true
  }
}
```

No URL aliasing.

---

## 21.9 Docstrings

Only collapse multiline docstring wrappers.

Example:

```ts
/**
Foo
*/
```

becomes:

```ts
/** Foo */
```

Do not rewrite comment text.

Do not delete comments.

---

## 21.10 Bad-word removal

Per-language bad-word list.

Apply only when not inside:

```txt
Quote
CodeFence
```

Exception:

```txt
CodeFence(markdown)
```

Removal emits word-level candidate.

Whitespace repair happens in writer.

---

## 22. Whitespace repair

The writer performs final local repair.

Rules:

```txt
collapse duplicate spaces caused by removal
remove space before punctuation
remove leading spaces at line start caused by prefix deletion
remove trailing spaces before newline
preserve original newlines unless a transform explicitly edits them
```

Do not globally normalize whitespace.

---

## 23. Safety checks

Candidate guard checks:

```txt
forbidden ancestors
required ancestors
forbidden tags
required tags
minimum UTF-8 saving
minimum token saving if tokenizer available
non-empty sentence
not entire paragraph unless rule explicitly allows it
```

Global final checks:

```txt
output must be valid UTF-8
output must not be longer unless explicitly allowed
output must pass idempotence
output must not delete protected nodes
```

Idempotence:

```rust
let once = compress(input);
let twice = compress(&once.output);
assert_eq!(once.output, twice.output);
```

---

## 24. Trace output

Every accepted candidate emits trace.

```json
{
  "rule_id": "en.polite.could_you",
  "phase": "politeness",
  "kind": "Remove",
  "layer": "Phrase",
  "before": "Could you ",
  "after": "",
  "span": [0, 10],
  "node_ids": [1, 2, 3],
  "priority": 500
}
```

Rejected overlapping candidates can optionally be emitted in debug mode:

```json
{
  "rule_id": "en.contract.i_would",
  "rejected": true,
  "reason": "overlapped_by_higher_priority_removal"
}
```

---

## 25. Public Rust API

```rust
pub fn compress(input: &str, config: CompressConfig) -> Result<CompressResult>;

#[derive(Debug, Clone)]
pub struct CompressConfig {
    pub lang: Option<String>,
    pub rules_path: Option<PathBuf>,

    pub enable_markdown: bool,
    pub enable_codefence_formats: bool,

    pub emit_trace: bool,
    pub emit_rejected_candidates: bool,

    pub token_counter: Option<TokenCounterKind>,
}

#[derive(Debug, Clone)]
pub struct CompressResult {
    pub output: String,
    pub trace: Vec<TraceEvent>,
    pub rejected: Vec<RejectedCandidate>,
    pub metrics: Metrics,
    pub asl_debug: Option<Asl>,
}
```

No mode enum needed, because only safe mode ships.

---

## 26. WASM API

```ts
export type CompressOptions = {
  lang?: string;
  emitTrace?: boolean;
  emitRejectedCandidates?: boolean;
  enableMarkdown?: boolean;
  enableCodeFenceFormats?: boolean;
};

export type CompressResult = {
  output: string;
  trace: TraceEvent[];
  rejected?: RejectedCandidate[];
  metrics: {
    inputBytes: number;
    outputBytes: number;
    inputTokens?: number;
    outputTokens?: number;
  };
};

export function compress(input: string, options?: CompressOptions): CompressResult;
```

---

## 27. CLI

```bash
defuss-semantic-compress file.md
defuss-semantic-compress --stdin
defuss-semantic-compress file.md --json
defuss-semantic-compress file.md --trace
defuss-semantic-compress file.md --debug-candidates
defuss-semantic-compress file.md --lang en
defuss-semantic-compress file.md --rules ./rules
defuss-semantic-compress ast file.md
defuss-semantic-compress test fixtures/
defuss-semantic-compress eval fixtures/llm_effect/
```

JSON output:

```json
{
  "input_bytes": 1234,
  "output_bytes": 900,
  "input_tokens": 300,
  "output_tokens": 220,
  "token_saving": 80,
  "token_saving_ratio": 0.266,
  "output": "...",
  "trace": []
}
```

---

# 28. Testing plan

## 28.1 Unit tests

### Parser identity

```rust
parse_render_identity_plain_text()
parse_render_identity_markdown()
parse_render_identity_quotes()
parse_render_identity_code_fence()
parse_render_identity_tables()
parse_render_identity_unicode()
```

Invariant:

```rust
assert_eq!(render(parse(input)), input);
```

### ASL shape snapshots

Input:

```txt
Please fix this.
```

Expected shape:

```txt
Root
  Paragraph
    Sentence
      Word("Please")
      Whitespace(" ")
      Word("fix")
      Whitespace(" ")
      Word("this")
      Symbol(".")
```

### Lexicon overlay

Tests:

```txt
word in one language -> classified
word in two languages -> omitted
casefold works
ambiguous terms are never transformed
```

### Grammar disambiguation

```txt
I think that this works.        -> that = Complementizer
Ensure that the file exists.    -> that = Complementizer
that file                       -> that = Det
The Hague                       -> The = NamedEntity
the bug                         -> the = Det
to build                        -> to = InfParticle
to Berlin                       -> to = Prep
```

### Matcher

```txt
matches word sequence
matches regex sequence
matches normalized forms
matches optional token
does not match across quote boundary
does not match across protected code fence
```

### Candidate resolver

```txt
removal beats replacement
phrase beats word
higher priority beats lower priority
longer span beats shorter span
shorter UTF-8 replacement wins among word-level replacement collisions
deterministic rule_id tie-break works
```

### Writer

```txt
writes from original input
applies non-overlapping edits
repairs local whitespace
preserves unchanged input exactly
preserves protected spans exactly
```

---

## 28.2 Integration tests against ASL

Each integration fixture should inspect:

```txt
parse tree
classification
generated candidates
resolved candidates
final output
```

Fixture example:

```json
{
  "id": "en.polite.det.punctuation",
  "input": "Please, could you fix the bug now.",
  "expected_classifications": [
    ["Please", "Politeness"],
    ["the", "Det"]
  ],
  "expected_candidates": [
    "en.polite.please_could_you",
    "en.det.remove",
    "en.punctuation.final_period"
  ],
  "expected_resolved": [
    "en.polite.please_could_you",
    "en.det.remove",
    "en.punctuation.final_period"
  ],
  "expected_output": "fix bug now"
}
```

---

## 28.3 E2E tests

Fixture format:

```json
{
  "id": "en.fix_bug_polite",
  "lang": "en",
  "input": "Please, could you fix the bug now.",
  "expected": "fix bug now",
  "min_utf8_saving": 5
}
```

Categories:

```txt
plain prose
polite prompts
DET/FILLER
complementizer protection
named entity protection
quotes
code fences
markdown code fences
markdown tables
repeat lines
paths
bad words
docstrings
multilingual ambiguity
```

---

## 28.4 Negative tests

Must remain unchanged:

```txt
I think that this works.
The Hague is nice.
Please do not delete this.
Could you not change this?
"Please fix the bug."
"`the` is a token."
> Please fix the bug.
```

Code fence:

````md
```ts
const the = "that";
```
````

Expected:

````md
```ts
const the = "that";
```
````

---

## 28.5 Property tests

Use `proptest`.

Properties:

```rust
render(parse(s)) == s
compress(s) is valid UTF-8
compress(compress(s)) == compress(s)
trace node ids exist
candidate spans are valid
resolved candidates do not overlap
protected spans remain byte-identical
```

---

# 29. LLM effect safety tests

## 29.1 Goal

Verify behavior preservation.

```txt
original input -> LLM -> expected behavior
compressed input -> LLM -> expected behavior
```

Do not rely only on exact text equality.

## 29.2 Fixture format

```json
{
  "id": "fix_bug_simple",
  "task_type": "code_patch",
  "input": "Please, could you fix the bug in this function now?\n```ts\n...\n```",
  "models": [
    "openai:gpt-4.1-mini",
    "anthropic:claude-sonnet",
    "qwen:qwen3"
  ],
  "assert": {
    "type": "tests_pass",
    "command": "npm test"
  }
}
```

## 29.3 Assertion types

```txt
exact_json
json_schema_match
tool_call_equivalence
tests_pass
contains_required_terms
does_not_contain_forbidden_terms
classification_label_match
diff_equivalence
```

## 29.4 Model parameters

Use deterministic settings as far as provider allows:

```txt
temperature = 0
top_p = 1
fixed system prompt
fixed tool schema
seed if provider supports it
```

But never assume true determinism.

Measure behavior.

## 29.5 Pass condition

A fixture passes only if:

```txt
original prompt passes expected assertion
compressed prompt passes expected assertion
```

Optional stricter check:

```txt
baseline output equivalent to compressed output
```

---

# 30. Rule enablement gate

A rule can be enabled by default only if:

```txt
unit tests pass
ASL integration tests pass
E2E input-output tests pass
negative fixtures pass
LLM effect tests pass
candidate conflict tests pass
idempotence passes
protected span tests pass
```

---

# 31. Implementation milestones

## Milestone 1: Lossless ASL

Implement:

```txt
ASL structs
span model
block parser
code fence parser
quote parser
inline tokenizer
renderer
identity tests
```

Exit:

```txt
100+ parse/render fixtures pass
```

---

## Milestone 2: Classification

Implement:

```txt
language pack loader
lexicon loader
multi-language overlay
DET/FILLER classifier
grammar classifier
protected tag assignment
```

Exit:

```txt
DET/FILLER + that/The/to tests pass
```

---

## Milestone 3: Rule candidate engine

Implement:

```txt
rule schema
matcher
candidate generation
guards
candidate resolver
writer
trace
```

Exit:

```txt
removal-vs-replacement conflict test passes
```

Critical test:

```txt
Input:
I would like you to build this.

Candidates:
I would -> I'd
I would like you to -> ""

Expected output:
build this.
```

---

## Milestone 4: Safe English transforms

Implement:

```txt
contractions
politeness
DET/FILLER
punctuation
bad words
paths
```

Exit:

```txt
English E2E suite passes
```

---

## Milestone 5: Markdown/code transforms

Implement:

```txt
JSON code-fence minifier
CSS/HTML optional minifiers
Markdown blank-line collapse
Markdown table pipe-space compression
exact consecutive line repeat compression
docstring newline compression
```

Exit:

```txt
Markdown/code fixture suite passes
```

---

## Milestone 6: Multi-language safety

Implement:

```txt
German sample pack
cross-language ambiguity cancellation
multilingual fixtures
```

Exit:

```txt
ambiguous terms are not classified or transformed
```

---

## Milestone 7: CLI + WASM

Implement:

```txt
CLI
stdin/stdout
JSON output
trace output
debug candidates
WASM binding
JS package wrapper
```

Exit:

```txt
native CLI and WASM examples pass
```

---

## Milestone 8: LLM effect harness

Implement:

```txt
fixture runner
provider abstraction
assertion plugins
baseline/compressed execution
summary report
CI-compatible failure output
```

Exit:

```txt
initial model matrix passes safety fixtures
```

---

# 32. Definition of done

v1 is done when:

```txt
only safe mode exists
parse/render identity is stable
all transforms are candidate-based
writer resolves conflicts deterministically
removal beats replacement
word-level replacement collisions choose shorter UTF-8 output
multi-language ambiguity cancellation works
quotes/code fences are protected
JSON code-fence compression works
Markdown-safe compression works
CLI works
WASM API works
unit tests pass
integration ASL tests pass
E2E tests pass
LLM effect safety harness exists
```

---

# 33. Critical invariant summary

```txt
Rules never mutate text.
Rules emit candidates.
Candidates target immutable ASL node spans.
Writer writes from original input.
Conflict resolver chooses safe deterministic winners.
Only resolved candidates affect output.
```

This is the core architecture.
