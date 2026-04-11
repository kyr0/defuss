# defuss-embeddings

Isomorphic text embeddings for **Node.js** and **Chrome/Web** using:

- `tss-deposium/harrier-oss-v1-270m-onnx-int8`
- `@huggingface/transformers`
- stock **int8 ONNX weights** for inference
- exact SIMD-friendly vector search utilities
- a pure TypeScript **TurboQuant-style** vector search path for normalized embeddings

## What this package does

- **Plan A encoder**: use the existing ONNX Harrier int8 export with the default `model.onnx` runtime path
- **Client runtime**: browser-first entry point with remote model loading + browser cache
- **Server runtime**: Node-first entry point with optional filesystem cache/local model loading
- **Vector search**: exact dot-product top-k and a separate TurboQuant-style compressed index

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
import { attachRecords, searchTopK } from "defuss-embeddings/vector-search.js";
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

const turboIndex = buildTurboQuantIndex(docVectors, { seed: 99 });
const { rerankedTopK } = searchTurboQuantIndexRerank(turboIndex, docVectors, query, 100, 10);

console.log(exactHits);
console.log(attachRecords(rerankedTopK, docs));
```

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
- Pipeline: exact top-10 vs approximate top-100 plus rerank to top-10
- Needle recall: 4/4 planted needles recovered by exact search, approximate top-100, and reranked top-10
- TurboQuant index build: 247.292 ms
- Exact search latency: avg 11.260 ms, median 11.716 ms
- Approximate top-100 latency: avg 12.387 ms, median 11.728 ms
- Rerank latency: avg 0.150 ms, median 0.140 ms
- Approximate plus rerank total: avg 12.538 ms, median 11.868 ms
- Exact throughput: avg 2,226,752 docs/s
- Approximate throughput: avg 2,070,969 docs/s

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
- `openAICompatible` switches the runtime from local ONNX inference to an arbitrary OpenAI-compatible `/embeddings` HTTP endpoint.
- When `openAICompatible` is active, `prefetchModel(...)`, `inspectModelCache(...)`, and `clearModelCache(...)` are not applicable and will throw.
- `embedQuery()` still uses Harrier-style `Instruct: ...\nQuery: ...` formatting by default. For non-Harrier endpoint models, pass `{ instruction: "" }` or call `embedOne()` directly.
- `bun run test:needle` runs a synthetic large-haystack benchmark that verifies planted needles stay retrievable while reporting exact-search, approximate-search, and rerank latency.
- `bun run test:needle:live` runs the real Harrier model against a larger generated text corpus and reports query-embedding plus retrieval latency.

## Scripts

```bash
bun run build
bun run test:node
bun run test:browser
bun run test:needle
bun run test:needle:live
bun run test:live:node
bun run test:live:browser
bun run test:live
bun run test
```
