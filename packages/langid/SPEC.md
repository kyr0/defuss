# **defuss-lid**

*A ≈ 230 kB statistics-only language identifier for Rust & WebAssembly – fully explainable, no neural nets.*

---

## 1  Purpose

Commodity language-ID libraries (fastText, CLD) either ship multi-megabyte neural models or sacrifice short-text accuracy. **`defuss-lid`** shows that a carefully budgeted **hand-crafted, statistics-only model** can match their macro-F₁ while remaining tiny: a ≈ 230 kB binary (well under the 250 kB cap), one L2-cache load and < 1 ms per 200-char input in the browser.

---

## 2  Notation

| Symbol      | Meaning                                                      |
| ----------- | ------------------------------------------------------------ |
| **L**       | language index (0 ≤ L < `LANG_COUNT`)                        |
| **g**       | character *n*-gram                                           |
| **V**       | global vocabulary (all retained grams)                       |
| **Kₙ(L)**   | number of retained *n*-grams of length *n* for language *L*  |
| **Δp(g,L)** | discrimination score = *p(g \| L) − p(g \| ¬L)*              |
| **W(g)**    | weight assigned to *g* (§ 7)                                 |
| **df(g)**   | document frequency = # languages that kept *g* (clamped ≥ 1) |
| **Sₙ(L)**   | raw score for language *L* on the *n*-gram channel           |
| **λₙ(len)** | length back-off weight (§ 8)                                 |

All probabilities use unsmoothed maximum-likelihood counts; smoothing appears only during inference.

---

## 3  Hard targets

| Target                      | Value / limit                                                                |
| --------------------------- | ---------------------------------------------------------------------------- |
| **Model file** (`.lidm`)    | **≤ 250 kB**                                                                 |
| **Runtime resident memory** | **≤ 250 kB** (model + working buffers)                                       |
| **Quality** (Latin mix)     | macro-F₁ ≥ 0.90 on ≈ 15 chars; ≥ 0.95 on ≥ 50 chars                          |
| **Quality** (< 5 chars)     | ≥ 0.75 accuracy with the byte-pair fallback                                  |
| **Latency**                 | < 1 ms for a 200-char input on a single 3 GHz core                           |
| **Languages**               | 100 (Latin, Cyrillic, Greek, Arabic, Hebrew, CJK, Hangul)                    |
| **Deps – training**         | `std`, `rayon`, `byteorder` (opt `ndarray`)                                  |
| **Deps – inference**        | pure `std`                                                                   |
| **Safety**                  | header magic & version, CRC-32, bound-checked slices, `panic = abort` (Wasm) |

---

## 4  Pre-processing pipeline

1. **Tokenisation.** Split on Unicode regex `[^\p{L}\p{N}]+`.
2. **Case-fold.** `to_lowercase(Locale::ROOT)`; diacritics kept.
3. **Per-word n-gram extraction.** Overlapping grams inside each token.
4. **Script gating.** Each language stores a **352-bit bitmap** of Unicode blocks **frozen to Unicode 15.0** (future block insertions will trigger a version bump). Zero intersection → language discarded.
5. **n-gram lengths.**

   | Script group                                   | *n*   |
   | ---------------------------------------------- | ----- |
   | Latin, Cyrillic, Greek, Arabic, Hebrew, Hangul | 1 – 4 |
   | Han                                            | 1 – 2 |
   | Kana                                           | 1 – 3 |

---

## 5  Feature selection

For every language *L* and each allowed *n*:

```text
p_L(g)    = count_L(g)             / Σ_g count_L(g)
p_notL(g) = Σ_{L'≠L} count_{L'}(g) / Σ_g Σ_{L'≠L} count_{L'}(g)
Δp(g,L)   = | p_L(g) − p_notL(g) |
```

Keep the top `Kₙ(L)` grams by Δp (ties → higher **numeric** *p\_L(g)*).

---

## 6  Dynamic feature budgeting (Matryoshka)

### 6.1  Seed allocation & confusion boosts

**Baseline allocation (per language):**

```text
K₁(L) = 200
K₂(L) = 600
K₃(L) = 800   (if n_max(L) ≥ 3)
K₄(L) = 1000  (if n_max(L) ≥ 4)
```

**Confusion-driven boosts:**

```text
if n_max(L) ≥ 4:   K₄(L) += 100 × |{L' ≠ L : F1(L,L') < 0.90}|
if n_max(L) ≥ 3:   K₃(L) +=  50 × |{L' ≠ L : F1(L,L') < 0.90}|
```

(Languages whose maximum *n* is 2 or 1 receive no K₃/K₄ boost.)

### 6.2  Global byte-budget loop

`BITS_PER_ID = ceil(log₂ VOCAB_COUNT)` → **expected 14 – 16 bits** (≈ 16 k – 65 k IDs). Building aborts if `BITS_PER_ID > 16` or `VOCAB_COUNT > 65535`.

Before looping, subtract fixed-size blocks from the **250 kB target**:

| Block                                 | Size        |
| ------------------------------------- | ----------- |
| Header (§ 9, offsets 0 – 39)          | 40 B        |
| Script masks (44 B × `LANG_COUNT`)    | 4 400 B     |
| ISO-639-1 codes (2 B × `LANG_COUNT`)  | 200 B       |
| Offset table (6 × u32 × `LANG_COUNT`) | 2 400 B     |
| --Slack padding--                     | 512 B       |
| Fallback byte-pair table (§ 13)       | 3 072 B     |

```text
bytes_left = 250*1024 − fixed_blocks

// Reserve 110 kB for global vocab strings + df table
bytes_left -= 110*1024

for n = 4 downto 1 {
    bytes_needed = Σ_L Kₙ(L) × 3  // delta-encoded ID-list bytes (worst-case)
    if bytes_needed > bytes_left {
        scale   = bytes_left / bytes_needed
        Kₙ(L)   = floor(Kₙ(L) × scale)   // for all L
        bytes_needed = Σ_L Kₙ(L) × 3
    }
    bytes_left -= bytes_needed
}
```

*Delta-encoded ID lists average ≈ 1.2 B/ID; 3 B is a safe worst-case.*

---

## 7  Weighting scheme

Candidate formulas (grid-searched on dev set):

```text
0: W(g) = n
1: W(g) = log10( |V| / df(g) )
2: W(g) = n × log10( |V| / df(g) )
3: W(g) = n / (1 + df(g))
```

* **df(g)** stored as **u8** (clamped ≥ 1).
* |V| read from header; *n* inferred from ID range (§ 9).
* Winning formula's index (0 – 3) saved in `WEIGHT_ID`.
* `W(g)` computed at load-time.

---

## 8  Length back-off

```
λₙ(len) = len / (len + τₙ)
```

Optimise τ₁ … τ₄ via Nelder–Mead; store each as **u16 = round(τ × 100)**.

```rust
// load-time
for n in 1..=4 {
    model.tau[n-1] = raw_tau[n-1] as f32 / 100.0;   // τ[0]..τ[3] for n=1..4
}
```

---

## 9  Binary model format ".dlidm"

`dlidm` = **defuss language id model**; **LIDM** is the file extension.

*Little-endian throughout; header size = 40 B.*

### 9.1  Header

| Off | Type    | Name           | Notes                    |
| --- | ------- | -------------- | ------------------------ |
| 0   | u8      | MAGIC          | 0xD1                     |
| 1   | u8      | VERSION        | 0x01                     |
| 2   | u8      | SPLIT\_MARK    | 0x07                     |
| 3   | u8      | MAX\_N         | 0x04                     |
| 4   | u8      | BITS\_PER\_ID  | 14 – 16 (abort > 16)     |
| 5   | u8      | WEIGHT\_ID     | 0 – 3                    |
| 6   | u16     | LANG\_COUNT    |                          |
| 8   | u32     | VOCAB\_COUNT   | (≤ 65 535)               |
| 12  | u32     | N₄             | # 4-grams (ID 0 … N₄-1)  |
| 16  | u32     | N₃             | # 3-grams                |
| 20  | u32     | N₂             | # 2-grams                |
| 24  | u32     | N₁             | # 1-grams                |
| 28  | u16     | SLACK\_BYTES   | ≤ 512                    |
| 30  | u16\[4] | τ₁, τ₂, τ₃, τ₄ | fixed-point × 100        |
| 38  | u16     | RESERVED       | 0x0000 (padding)         |

### 9.2  Blocks (in order)

| Block                    | Content                                                      |
| ------------------------ | ------------------------------------------------------------ |
| Script masks             | **44 B × `LANG_COUNT`**                                      |
| ISO-639-1 codes          | 2 B × `LANG_COUNT`                                           |
| Offset table             | 6 × u32 × `LANG_COUNT`                                       |
| **Slack padding**        | 512 B (future-proof)                                         |
| Vocabulary               | UTF-8 grams, delimited by `SPLIT_MARK`                       |
| **df table**             | `u8 df` per gram                                             |
| ID lists                 | per language, n = 4→1, **count-prefixed** + LEB128-δ-encoded |
| Fallback byte-pair table | **3 072 B**                                                  |
| CRC-32                   | IEEE-802.3 / Ethernet (covers everything above)              |

All variable-length blocks are padded to 8-byte boundaries.

### 9.3  Offset table (per language, 6 × u32)

| Field      | Meaning                        |
| ---------- | ------------------------------ |
| `ID4_OFF`  | byte offset to the 4-gram list |
| `ID3_OFF`  | … 3-gram list                  |
| `ID2_OFF`  | … 2-gram list                  |
| `ID1_OFF`  | … 1-gram list                  |
| `END_OFF`  | byte after the 1-gram list     |
| `RESERVED` | 0                              |

### 9.4  ID → *n* mapping

```
id < N₄                 → n = 4
N₄ ≤ id < N₄+N₃         → n = 3
N₄+N₃ ≤ id < N₄+N₃+N₂   → n = 2
else                    → n = 1
```

### 9.5  ID list encoding

* **Count prefix:** unsigned **LEB128** number of IDs in list
* IDs **strictly ascending**:
  – First ID: unsigned **LEB128**
  – Subsequent IDs: positive Δ (current − previous) as unsigned LEB128

---

## 10  Runtime memory footprint (100 languages)

| Component                           | Size (≈)   |
| ----------------------------------- | ---------- |
| UTF-8 gram strings                  | 45 kB      |
| **Decoded ID lists** (u16)          | 84 kB      |
| **df table (u8)**                   | 60 kB      |
| Fallback byte-pairs                 | **3 kB**   |
| Script masks                        | **4.4 kB** |
| Offset table                        | 2.4 kB     |
| Header + τ + ISO + slack            | 1.5 kB     |
| Working buffers                     | 2 kB       |
| **Total ≈ 202.3 kB** (under 250 kB) |            |

---

## 11  Training pipeline (overview)

```rust
// 1. Parallel counting
corpora.par_iter().for_each(|(L, sents)| {
    let mut map = FxHashMap::with_capacity(1_000_000);
    for s in sents { for g in grams(s) { *map.entry(g).or_default() += 1; } }
    dump_counts(L, map);                // tmp mmap
});

// 2. Δp and confusion
merge_counts();
calc_delta_p();
find_confusions();                      // ConfPairs (F1 < 0.90)

// 3. Allocation
apply_boosts();                         // §6.1
matryoshka_rescale();                   // §6.2

// 4. Vocabulary
select_top_grams();
assign_ids();                           // ASCII order within length
write_df_table();                       // u8 df (≥1)

// 5. Hyper-tuning
grid_search_weights();                  // 0–3
optimise_tau();                         // Nelder–Mead

// 6. Serialise
write_dlidm();                          // §9 format
```

---

## 12  Inference algorithm

```rust
pub fn detect(model: &Model, text: &str) -> Vec<(Lang, f32)> {
    let len = text.chars().count();
    if len < 5 { return byte_pair_fallback(model, text); }

    let grams = extract_ngrams(text);
    let mut cand = model.langs_by_script(text);            // ≈12 left
    let mut s = [[0.0f32; 100]; 4];                        // n = 1..4

    for g in grams {
        let n = g.chars().count();
        if !(1..=4).contains(&n) { continue; }
        if let Some(id) = model.vocab_id(&g) {
            let w = model.weight(id);                      // uses df + n
            for &L in &cand {
                if model.id_lists[L][n-1].binary_search(&id).is_ok() {
                    s[n - 1][L] += w;
                }
            }
        }
    }

    let λ = |n: usize| {
        let tau = model.tau[n-1];                          // τ[0]..τ[3]
        len as f32 / (len as f32 + tau)
    };

    let mut total = 0.0;
    let mut score = [0.0f32; 100];
    for &L in &cand {
        let sc = λ(4)*s[3][L] + λ(3)*s[2][L] +
                 λ(2)*s[1][L] + λ(1)*s[0][L];
        score[L] = sc;
        total   += sc;
    }

    if total == 0.0 { return Vec::new(); }
    cand.into_iter()
        .map(|L| (Lang(L), score[L] / total))
        .filter(|&(_, p)| p > 0.0)
        .sorted_by(|a, b| b.1.partial_cmp(&a.1).unwrap())
        .collect()
}
```

### 12.1  Fallback for < 5 characters

```rust
fn byte_pair_fallback(model: &Model, text: &str) -> Vec<(Lang, f32)> {
    let mut counts = [0u16; 100];
    let bytes = text.as_bytes();

    // overlapping pairs
    for i in 0..bytes.len().saturating_sub(1) {
        let pair = u16::from_le_bytes([bytes[i], bytes[i + 1]]);
        if let Ok(idx) = model.fallback_table.binary_search_by_key(&pair, |e| e.pair) {
            let lang = model.fallback_table[idx].lang as usize;
            counts[lang] = counts[lang].saturating_add(1);
        }
    }

    // majority vote (tie → lower index)
    if let Some((lang, _)) = counts.iter().enumerate().max_by_key(|&(_, &c)| c) {
        vec![(Lang(lang), 1.0)]
    } else {
        Vec::new()   // "und"
    }
}
```

`model.weight(id)` (runtime):

```rust
let df = model.df_table[id].max(1) as f32;
let n  = model.n_of(id);
match model.weight_id {
    0 => n as f32,
    1 => (model.vocab_len as f32 / df).log10(),
    2 => n as f32 * (model.vocab_len as f32 / df).log10(),
    _ => n as f32 / (1.0 + df),
}
```

---

## 13  Fallback byte-pair table

* **Size:** 1 000 entries × 3 B = **3 072 B** (padded).
* **Entry:** `[0–1]` u16 little-endian byte pair, `[2]` u8 language index.

**Training selection:**

1. Compute Δp(g,L) for all 65 536 byte pairs.
2. For each pair *g*, choose Lₘₐₓ = argmaxₗ Δp(g,L).
3. Keep top 1 000 pairs by Δp(g,Lₘₐₓ).

**Inference:** Overlapping pairs; each hit votes for its language. Majority wins; ties resolved by lower index.

---

## 14  WASM integration

* **Target:** `wasm32-unknown-unknown`
* **Flags:** `opt-level=z`, `lto="fat"`, symbols stripped
* **Allocator:** `wee_alloc` (\~1 kB, Wasm builds only)
* **Wasm code size:** ≈ 38 kB; `.lidm` fetched separately
* **Loading:** JS fetches model → `ArrayBuffer` → `init(ptr,len)`; Rust holds `&'static [u8]` zero-copy.
* **Guards:** MAGIC, VERSION, CRC-32 → `InitError` on failure.

---

## 15  Risks & mitigations

| Risk                                         | Mitigation                                                   |
| -------------------------------------------- | ------------------------------------------------------------ |
| Visually similar pairs (nb/da, id/ms, es/pt) | **Confusion-driven boosts** (§ 6.1, threshold = 0.90)        |
| CJK explosion                                | Han *n* ≤ 2, Kana *n* ≤ 3                                    |
| Bit-ID inflation                             | Build aborts if `BITS_PER_ID > 16` or `VOCAB_COUNT > 65 535` |
| τ decode error                               | `/ 100` applied once at load-time, unit-tested               |
| Binary corruption                            | MAGIC, VERSION, CRC-32 checked; abort on mismatch            |
| df = 0 (÷0)                                  | df clamped ≥ 1 at serialisation & load-time                  |
| Memory overrun                               | 250 kB budget includes df & fallback tables                  |
| Unicode version drift                        | Block bitmap frozen to Unicode 15.0; bump version on change  |
| Fallback ties                                | Tie-breaker defined (lower language index)                   |
| **ID-list decoding**                         | **Pre-decode to u16 arrays at load time**                    |

---

## 16  Reviewer checklist

1. Header is 40 B; CRC passes; offsets non-overlapping.
2. `.dlidm` ≤ 250 kB; stripped Wasm ≈ 38 kB.
3. Macro-F₁ on held-out test ≥ 0.95 for ≥ 50-char inputs; no language recall < 0.80.
4. ≥ 0.75 accuracy on 3–4-char inputs via fallback.
5. Resident memory ≤ 250 kB; latency < 1 ms on 200-char input.
6. All error paths abort gracefully; no undefined behaviour.