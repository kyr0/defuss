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

### Synthetic large-haystack benchmark

Command: `bun run test:needle`

- Corpus: 25,000 vectors
- Dimensions: 640
- Pipeline: single-thread exact top-10 vs multicore exact top-10 vs approximate top-100 plus rerank to top-10
- Needle recall: 4/4 planted needles recovered by single-thread exact search, multicore exact search, approximate top-100, and reranked top-10
- TurboQuant index build: 834.276 ms
- Single-thread exact latency: avg 32.286 ms, median 35.194 ms
- Multicore exact latency: avg 115.032 ms, median 132.950 ms
- Approximate top-100 latency: avg 40.696 ms, median 39.141 ms
- Rerank latency: avg 0.445 ms, median 0.412 ms
- Approximate plus rerank total: avg 41.140 ms, median 39.553 ms
- Single-thread exact throughput: avg 796,640 docs/s
- Multicore exact throughput: avg 232,583 docs/s
- Approximate throughput: avg 673,194 docs/s
- Multicore speed relative to single-thread exact: avg 0.304x

### Browser synthetic benchmark

Command: `bun run test:needle:browser`

- Corpus: 8,000 vectors in Chromium
- Dimensions: 384
- Pipeline: single-thread exact top-k vs multicore exact top-k vs approximate top-100 plus rerank
- Outcome check: multicore exact results matched the single-thread exact baseline for all 3 planted needles before timings were reported
- TurboQuant index build: 100.300 ms
- Single-thread exact latency: avg 5.233 ms, median 5.300 ms
- Multicore exact latency: avg 21.000 ms, median 16.100 ms
- Approximate top-100 latency: avg 4.033 ms, median 4.100 ms
- Approximate plus rerank total: avg 4.233 ms, median 4.400 ms
- Single-thread exact throughput: avg 1,534,891 docs/s
- Multicore exact throughput: avg 433,911 docs/s
- Approximate throughput: avg 1,987,082 docs/s
- Multicore speed relative to single-thread exact: avg 0.279x
- Use this benchmark to validate whether worker overhead pays off on your browser target, because the crossover point varies noticeably by machine, runtime, and corpus layout

### Live Harrier benchmark

Command: `bun run test:needle:live`

- Query format: Harrier instructed queries using `Instruct: ...` followed by `Query: ...`
- Corpus: 512 natural-language passages per case
- Cases: 4 natural search queries against 4 planted target passages
- Exact top-100 hit count: 3/4
- Approximate top-100 hit count: 3/4
- Reranked top-10 hit count: 2/4
- Exact rank snapshot: `protein-guideline` rank 1, `summit-definition` rank 66, `css-center-div` rank 1, `python-virtualenv` not returned in top-100 on that run
- Query embedding latency: avg 40.703 ms, median 36.237 ms
- Exact search latency: avg 1.629 ms, median 1.240 ms
- Approximate top-100 latency: avg 2.856 ms, median 3.116 ms
- Rerank latency: avg 0.297 ms, median 0.315 ms
- Approximate plus rerank total: avg 3.153 ms, median 3.431 ms
- End-to-end approximate retrieval: avg 43.857 ms, median 37.328 ms

## Notes

- The model runtime uses the model file layout resolved by Transformers.js / ONNX Runtime for the selected source.
- The default model is `tss-deposium/harrier-oss-v1-270m-onnx-int8`, which ships a single `onnx/model.onnx` file containing the int8 export. Keep the default dtype unless you are targeting a different model layout.
- Retrieval queries should be embedded with an instruction prefix. Use `embedQuery()` for that flow; documents should stay unprefixed.
- Harrier uses `last_token` pooling and L2 normalization, so the runtime defaults match the model card instead of mean pooling.
- `loadModel(urlOrRepoId)` works with either a Hub repo id or a plain base URL. The shared core uses separate browser and Node cache adapters behind the existing `client.js` and `server.js` exports.
- `prefetchModel(...)` is optional and only exists to warm the same cache earlier at runtime; `loadModel(...)` and the first embedding call will also warm the cache automatically.
- Use `inspectModelCache(...)` and `clearModelCache(...)` if you want to inspect or purge cached assets explicitly.
- The `turboquant` module here is **only for vector search**, not model-weight quantization.
- Quick unit tests use injected mock extractors, while `bun run test:live` runs both a Node live suite and a browser live suite against the real Harrier model.
- `searchTopKMulticore(...)` uses worker-backed brute-force search and returns the same ranked hits as `searchTopK(...)`, but asynchronously.
- `openAICompatible` switches the runtime from local ONNX inference to an arbitrary OpenAI-compatible `/embeddings` HTTP endpoint.
- When `openAICompatible` is active, `prefetchModel(...)`, `inspectModelCache(...)`, and `clearModelCache(...)` are not applicable and will throw.
- `embedQuery()` still uses Harrier-style `Instruct: ...\nQuery: ...` formatting by default. For non-Harrier endpoint models, pass `{ instruction: "" }` or call `embedOne()` directly.
- `bun run test:needle` runs a synthetic large-haystack benchmark that verifies planted needles stay retrievable while reporting single-thread exact, multicore exact, approximate-search, and rerank latency.
- `bun run test:needle:browser` runs a Chromium benchmark for the same comparison on the browser worker runtime.
- `bun run test:needle:live` runs the real Harrier model against a larger generated text corpus and reports query-embedding plus retrieval latency.

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
