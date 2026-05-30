# defuss-embeddings

Isomorphic text embeddings for **Node.js** and **Chrome/Web** using:

- `tss-deposium/harrier-oss-v1-270m-onnx-int8`
- `@huggingface/transformers`
- stock **int8 ONNX weights** for inference
- exact SIMD-friendly vector search utilities
- optional multicore worker-backed brute-force exact search
- a pure TypeScript **TurboQuant-style** vector search path for normalized embeddings

## What this package does

- **Plan A encoder**: use the existing ONNX Harrier int8 export with the default `model.onnx` runtime path
- **Client runtime**: browser-first entry point with remote model loading + browser cache
- **Server runtime**: Node-first entry point with optional filesystem cache/local model loading
- **Vector search**: single-thread exact top-k, multicore exact top-k, and a separate TurboQuant-style compressed index

## Package layout

This mirrors the split style used by `defuss-rpc`:

- `defuss-embeddings/client.js`
- `defuss-embeddings/server.js`
- `defuss-embeddings/vector-search.js`
- `defuss-embeddings/turboquant.js`

## Install

```bash
bun add defuss-embeddings
```

The package does not download model files during install. The first `loadModel(...)`, `embed(...)`, `embedQuery(...)`, or `embedDocuments(...)` call fetches the required files on demand and warms a persistent cache before the model pipeline is created.

- Browsers store model files in `defuss-db` on top of IndexedDB and mirror them into the Cache API for Transformers.js lookups.
- Node.js stores model files in the filesystem cache directory from `cacheDir`, or by default in the OS temp directory under `defuss-embeddings/`.
- If you want to warm the cache before the first real request, call `prefetchModel(...)` at application startup.
- After the first successful download, repeated runs reuse the same cache and should avoid downloading the model files again.

For runtime loading, prefer `loadModel(urlOrRepoId)`.

- Pass a Hugging Face repo id like `tss-deposium/harrier-oss-v1-270m-onnx-int8` to use the default Hub layout.
- Pass a base URL like `https://cdn.example.com/models/harrier` when the folder already contains `config.json`, `tokenizer.json`, `tokenizer_config.json`, and the `onnx/` files.
- For mirrored custom URLs whose file layout differs from the built-in manifests, pass `requiredFiles` so cache warming knows exactly which assets to fetch.
- A raw single `Buffer` or `Blob` is not enough on its own because Harrier is a multi-file model bundle, not just one `.onnx` file.

## Browser usage

```ts
import { createEmbeddingClient } from "defuss-embeddings/client.js";
import { buildTurboQuantIndex, searchTurboQuantIndexRerank } from "defuss-embeddings/turboquant.js";

const embedder = createEmbeddingClient({
  model: "tss-deposium/harrier-oss-v1-270m-onnx-int8",
  device: "webgpu", // or "wasm"
});

await embedder.loadModel("https://cdn.example.com/models/harrier");

const corpusTexts = [
  "machine learning systems",
  "cats on sofas",
  "vector search in browsers",
];

const corpusEmbeddings = await embedder.embed(corpusTexts);
const index = buildTurboQuantIndex(corpusEmbeddings, { seed: 1234 });

const queryEmbedding = await embedder.embedQuery("browser vector retrieval");
const { rerankedTopK } = searchTurboQuantIndexRerank(
  index,
  corpusEmbeddings,
  queryEmbedding,
  100,
  10,
);
console.log(rerankedTopK);
```

## Server usage

```ts
import { createEmbeddingServer } from "defuss-embeddings/server.js";
import {
  attachRecords,
  searchTopK,
  searchTopKMulticore,
} from "defuss-embeddings/vector-search.js";
import { buildTurboQuantIndex, searchTurboQuantIndexRerank } from "defuss-embeddings/turboquant.js";

const embedder = createEmbeddingServer({
  model: "tss-deposium/harrier-oss-v1-270m-onnx-int8",
  dtype: "fp32",
  cacheDir: ".cache/defuss-embeddings",
});

await embedder.loadModel("tss-deposium/harrier-oss-v1-270m-onnx-int8");

const docs = ["alpha", "beta", "gamma"];
const docVectors = await embedder.embedDocuments(docs);
const query = await embedder.embedQuery("beta");
const exactHits = attachRecords(searchTopK(docVectors, query, 2), docs);
const exactHitsMulticore = attachRecords(
  await searchTopKMulticore(docVectors, query, 2, { threshold: 4096 }),
  docs,
);

const turboIndex = buildTurboQuantIndex(docVectors, { seed: 99 });
const { rerankedTopK } = searchTurboQuantIndexRerank(turboIndex, docVectors, query, 100, 10);

console.log(exactHits);
console.log(exactHitsMulticore);
console.log(attachRecords(rerankedTopK, docs));
```

## Exact search strategies

- `searchTopK(...)` is the synchronous exact-search baseline.
- `searchTopKMulticore(...)` is the async exact-search variant that uses `defuss-multicore` workers in both Node.js and browsers.
- For small corpora, `searchTopKMulticore(...)` falls back to the single-thread path automatically.
- For large corpora, worker overhead is measurable, so benchmark on your target hardware instead of assuming multicore is always faster.
- On the current benchmark snapshot below, single-query brute-force search is still faster on one thread than via workers in both Node.js and Chromium because chunk cloning and worker dispatch dominate.

## OpenAI-Compatible endpoint usage

```ts
import { createEmbeddingServer } from "defuss-embeddings/server.js";

const embedder = createEmbeddingServer({
  model: "text-embedding-3-small",
  openAICompatible: {
    baseUrl: "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY,
  },
});

const docs = [
  "Create a Python virtual environment with python -m venv .venv.",
  "Use justify-content and align-items to center a div with flexbox.",
];

const docVectors = await embedder.embedDocuments(docs);

// For non-Harrier endpoint models, suppress the Harrier retrieval instruction.
const query = await embedder.embedQuery(
  "How do I create a Python virtual environment?",
  { instruction: "" },
);

console.log(docVectors, query);
```

## Benchmark snapshot

These numbers come from local runs on 11 April 2026. They are only a snapshot and will vary with hardware, cache state, runtime version, and network conditions.

### Quality takeaway

- The fair comparison is `exact candidate top-100 + exact rerank top-10` versus `TurboQuant candidate top-100 + exact rerank top-10`.
- `exact direct top-10` and `exact candidate top-100 + exact rerank top-10` matched on the synthetic and live runs, which is what you want from the exact baseline.
- On the current benchmark snapshot, `TurboQuant candidate top-100 + exact rerank top-10` matched `exact candidate top-100 + exact rerank top-10` on all synthetic cases and on the current live Harrier cases.
- That does not mean exact search stops being the quality upper bound. Exact still sees the whole corpus, and reranking cannot recover a relevant document that TurboQuant never surfaced in its candidate set.
- In the current live Harrier run, the quality bottleneck was the embedding model ranking itself rather than TurboQuant candidate loss: one query landed at exact candidate rank 66 and TurboQuant candidate rank 54, so both exact rerank and TurboQuant rerank correctly kept it out of top-10; one query was absent from both exact and TurboQuant top-100.

### Synthetic large-haystack benchmark

Command: `bun run test:needle`

- Corpus: 25,000 vectors
- Dimensions: 640
- Pipeline: exact direct top-10, exact candidate top-100 plus exact rerank top-10, multicore exact baselines, and TurboQuant candidate top-100 plus exact rerank top-10
- Quality: 4/4 planted needles recovered by exact direct top-10, exact+rerank, multicore exact direct, multicore exact+rerank, TurboQuant candidate top-100, and TurboQuant+rerank
- TurboQuant index build: 343.399 ms
- Exact direct top-10 latency: avg 13.458 ms, median 14.040 ms
- Exact candidate top-100 latency: avg 13.323 ms, median 13.410 ms
- Exact rerank latency: avg 0.137 ms, median 0.115 ms
- Exact candidate plus rerank total: avg 13.460 ms, median 13.516 ms
- Multicore exact direct top-10 latency: avg 33.762 ms, median 34.518 ms
- Multicore exact candidate top-100 latency: avg 36.976 ms, median 40.323 ms
- Multicore exact candidate plus rerank total: avg 37.122 ms, median 40.468 ms
- TurboQuant candidate top-100 latency: avg 17.968 ms, median 17.334 ms
- TurboQuant rerank latency: avg 0.150 ms, median 0.157 ms
- TurboQuant candidate plus rerank total: avg 18.118 ms, median 17.497 ms
- Exact candidate throughput: avg 1,886,088 docs/s
- Multicore exact candidate throughput: avg 695,886 docs/s
- TurboQuant candidate throughput: avg 1,397,003 docs/s
- Multicore exact candidate speed relative to single-thread exact candidate: avg 0.369x

### Browser synthetic benchmark

Command: `bun run test:needle:browser`

- Corpus: 8,000 vectors in Chromium
- Dimensions: 384
- Pipeline: exact direct top-10, exact candidate top-100 plus exact rerank top-10, multicore exact baselines, and TurboQuant candidate top-100 plus exact rerank top-10
- Quality: 3/3 planted needles recovered by exact direct top-10, exact+rerank, multicore exact direct, multicore exact+rerank, TurboQuant candidate top-100, and TurboQuant+rerank
- TurboQuant index build: 55.600 ms
- Exact direct top-10 latency: avg 2.467 ms, median 2.500 ms
- Exact candidate top-100 latency: avg 2.367 ms, median 2.400 ms
- Exact candidate plus rerank total: avg 2.400 ms, median 2.400 ms
- Multicore exact direct top-10 latency: avg 5.600 ms, median 5.500 ms
- Multicore exact candidate top-100 latency: avg 5.400 ms, median 5.400 ms
- Multicore exact candidate plus rerank total: avg 5.467 ms, median 5.400 ms
- TurboQuant candidate top-100 latency: avg 2.433 ms, median 2.400 ms
- TurboQuant candidate plus rerank total: avg 2.467 ms, median 2.500 ms
- Exact candidate throughput: avg 3,381,643 docs/s
- Multicore exact candidate throughput: avg 1,481,820 docs/s
- TurboQuant candidate throughput: avg 3,296,172 docs/s
- Multicore exact candidate speed relative to single-thread exact candidate: avg 0.438x
- Use this benchmark to validate whether worker overhead pays off on your browser target, because the crossover point varies noticeably by machine, runtime, and corpus layout

### Live Harrier benchmark

Command: `bun run test:needle:live`

- Query format: Harrier instructed queries using `Instruct: ...` followed by `Query: ...`
- Corpus: 512 natural-language passages per case
- Cases: 4 natural search queries against 4 planted target passages
- Exact direct top-10 hit count: 2/4
- Exact candidate top-100 hit count: 3/4
- Exact candidate plus rerank top-10 hit count: 2/4
- TurboQuant candidate top-100 hit count: 3/4
- TurboQuant candidate plus rerank top-10 hit count: 2/4
- Case snapshot: `protein-guideline` exact rank 1 and TurboQuant rank 1; `summit-definition` exact candidate rank 66 and TurboQuant candidate rank 54, but both reranked top-10 results miss; `css-center-div` exact rank 1 and TurboQuant rank 1; `python-virtualenv` is absent from both exact and TurboQuant top-100 on this run
- Query embedding latency: avg 30.365 ms, median 30.590 ms
- Exact direct top-10 latency: avg 1.441 ms, median 1.122 ms
- Exact candidate top-100 latency: avg 1.136 ms, median 1.493 ms
- Exact rerank latency: avg 0.290 ms, median 0.387 ms
- Exact candidate plus rerank total: avg 1.426 ms, median 1.881 ms
- TurboQuant candidate top-100 latency: avg 1.957 ms, median 1.336 ms
- TurboQuant rerank latency: avg 0.187 ms, median 0.152 ms
- TurboQuant candidate plus rerank total: avg 2.144 ms, median 1.487 ms
- End-to-end exact retrieval: avg 31.791 ms, median 31.143 ms
- End-to-end TurboQuant retrieval: avg 32.509 ms, median 31.736 ms

## Notes

- The model runtime uses the model file layout resolved by Transformers.js / ONNX Runtime for the selected source.
- The default model is `tss-deposium/harrier-oss-v1-270m-onnx-int8`, which ships a single `onnx/model.onnx` file containing the int8 export. Keep the default dtype unless you are targeting a different model layout.
- Retrieval queries should be embedded with an instruction prefix. Use `embedQuery()` for that flow; documents should stay unprefixed.
- Harrier uses `last_token` pooling and L2 normalization, so the runtime defaults match the model card instead of mean pooling.
- `loadModel(urlOrRepoId)` works with either a Hub repo id or a plain base URL. The shared core uses separate browser and Node cache adapters behind the existing `client.js` and `server.js` exports.
- `prefetchModel(...)` is optional and only exists to warm the same cache earlier at runtime; `loadModel(...)` and the first embedding call will also warm the cache automatically.
- Use `inspectModelCache(...)` and `clearModelCache(...)` if you want to inspect or purge cached assets explicitly.
- The `turboquant` module here is **only for vector search**, not model-weight quantization.
- For fair quality comparisons, compare `searchTopK(..., 100)` + `rerankSearchHits(..., 10)` against `searchTurboQuantIndex(..., 100)` + `rerankSearchHits(..., 10)`. Comparing direct exact top-10 against TurboQuant+rerank mixes different pipeline stages.
- Quick unit tests use injected mock extractors, while `bun run test:live` runs both a Node live suite and a browser live suite against the real Harrier model.
- `searchTopKMulticore(...)` uses worker-backed brute-force search and returns the same ranked hits as `searchTopK(...)`, but asynchronously.
- `openAICompatible` switches the runtime from local ONNX inference to an arbitrary OpenAI-compatible `/embeddings` HTTP endpoint.
- When `openAICompatible` is active, `prefetchModel(...)`, `inspectModelCache(...)`, and `clearModelCache(...)` are not applicable and will throw.
- `embedQuery()` still uses Harrier-style `Instruct: ...\nQuery: ...` formatting by default. For non-Harrier endpoint models, pass `{ instruction: "" }` or call `embedOne()` directly.
- `bun run test:needle` runs a synthetic large-haystack benchmark that verifies planted needles stay retrievable while reporting exact direct, exact+rerank, multicore exact, and TurboQuant+rerank latency.
- `bun run test:needle:browser` runs the same fair-comparison benchmark in Chromium.
- `bun run test:needle:live` runs the real Harrier model against a larger generated text corpus and reports exact+rerank versus TurboQuant+rerank quality plus end-to-end latency.

## Scripts

```bash
bun run build
bun run test:node
bun run test:browser
bun run test:needle
bun run test:needle:browser
bun run test:needle:live
bun run test:live:node
bun run test:live:browser
bun run test:live
bun run test
```
