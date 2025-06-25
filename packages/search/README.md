<h1 align="center">

<img src="assets/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss-search</code>
</p>

<sup align="center">

_Fast_ CPU-only Hybrid Text & Vector Search

</sup>

</h1>

`defuss-search` is a **hybrid frontend search engine** that combines BM25FS⁺ _(a novel algorithm)_ text search with vector similarity and fusion strategies for blazing-fast, high-quality search results. Built for modern web applications with WebAssembly and optimized for ≤100k documents.

## Key Features

- 🎯 **BM25FS⁺ Algorithm**: Novel fusion of BM25F (field weights) + BM25⁺ (δ-shift, smaller documents) + BM25S (eager sparse scoring) for 10-500× faster queries, better recall and precision 
- 🧠 **Hybrid Search**: Combines lexical text search with dense vector embeddings using Reciprocal Rank Fusion (RRF) and CombSUM strategies
- ⚡ **Extreme Performance**: Memory pools, SIMD operations, parallel processing with Rayon, and micro-optimizations for sub-millisecond search
- 🌐 **WebAssembly Native**: Built specifically for WASM deployment 
-  **Precise**: No HNSW, KNN - we brute force vector search for the highest precision (no loss because of KNN approximations)
- 🏗️ **Schema-Driven**: Flexible schemas paired with automatic BM25F weight assignment based on semantic field types and sensible defaults (title, body, tags, etc.)
- 🌍 **Multilingual**: Support for 15 languages with proper stop-word filtering and stemming
- 🔍 **Document Store**: Separate compressed storage for full document retrieval, supporting efficient updates and deletions
- 🏷️ **Document Attributes**: Store and search by multiple attributes (title, content, tags) with customizable weights
- ⚡ **Fast Indexing**: Efficient document ingestion with optional vector embeddings
- **Vector Embeddings**: Supports optional vector embeddings for documents, enabling semantic search capabilities (default adapter for all OpenAI-compatible `/v1/embeddings` endpoints)
- 🔄 **Query Flexibility**: Supports both text-only and hybrid vector queries
- 🛠️ **Advanced Optimization**: Fuzzy search, prefix matching, query caching, and Bloom filters

## Quick Start

```rust
use defuss_search::*;

// Create schema with semantic Kind-based field assignment
let schema = Schema::builder()
    .attribute("title", Kind::TITLE)        // Weight: 2.5, b: 0.75
    .attribute("content", Kind::CONTENT)    // Weight: 1.0, b: 0.75
    .attribute("categories", Kind::TAGS)    // Weight: 1.8, b: 0.5
    .build();

// Create hybrid search engine
let mut engine = SearchEngine::with_schema(&schema);

// Add documents with optional vector embeddings
let doc = Document::new("doc1")
    .attribute("title", "Machine Learning with Rust")
    .attribute("content", "Learn how to build ML models using Rust...")
    .attribute("categories", ["rust", "machine-learning", "tutorial"])
    .with_vector(embedding_vector);  // Optional 
    .build();

engine.add_document(doc, Language::English)?;

// Search with both text and vector similarity
let results = engine.search_hybrid_rrf(
    Some("machine learning rust"),  // Text query
    Some(query_vector),            // Vector query  
    10                            // Top-k results
);

// Text-only search is also supported
let text_results = engine.search(
    Some("machine learning"),
    None,
    10
);
```

## Schema Configuration

### Kind Enum

The `Kind` enum defines semantic field types with automatic BM25F weight assignment:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Kind {
    TITLE,        // Weight: 2.5, b: 0.75 - Primary titles and headings
    CONTENT,      // Weight: 1.0, b: 0.75 - Main body content (baseline)
    DESCRIPTION,  // Weight: 1.5, b: 0.75 - Summaries and descriptions
    HEADING,      // Weight: 2.0, b: 0.75 - Secondary headings
    TAGS,         // Weight: 1.8, b: 0.5  - Keywords and categories
    AUTHOR,       // Weight: 1.2, b: 0.6  - Creator names
    DATE,         // Weight: 0.8, b: 0.5  - Timestamps and metadata
    REFERENCE,    // Weight: 0.6, b: 0.5  - URLs and links
    TEXT,         // Weight: 1.0, b: 0.75 - Generic text (same as CONTENT)
}
```

### Custom Weights

For fine-grained control, you can also specify custom weights:

```rust
let schema = Schema::builder()
    .attribute("title", Kind::TITLE)
    .attribute_with_weight("special_field", Kind::TEXT, 3.0, Some(0.8))
    .build();
```

## Architecture Highlights

### BM25FS⁺ Scoring Algorithm

**BM25FS⁺** is a novel algorithm that fuses three orthogonal BM25 improvements:

- **BM25F**: Field-weighted scoring (titles get higher weight than body text)
- **BM25⁺**: δ-shift parameter prevents long documents from being unfairly penalized  
- **BM25S**: Eager sparse scoring - pre-compute term impacts at index time for 10-500× faster queries

**Formula**: For term *t* in field *$f$* of document *$D$*:

$$
impact_{t,f,D} = w_f × IDF(t) × ((k1 + 1) × tf) / (k1 × (1 - b_f + b_f × |D_f| / avg_len_f) + tf) + δ
$$

### Fusion Strategies

**Reciprocal Rank Fusion (RRF)**:
- Parameter-free combination of text and vector results
- $RRF(d) = Σ[i ∈ {dense, sparse}] 1 / (k + rank_i(d))$ where k ≈ 60

**CombSUM with Min-Max Normalization**:
- `final = α × dense_norm + (1-α) × sparse_norm`
- More granular control via α parameter (typically 0.3-0.5)

### Performance Optimizations

| Optimization | Benefit |
|--------------|---------|
| **Multicore** | Leverages multiple CPU cores for parallel processing |
| **SIMD-128** | Leverages SIMD instructions for faster vector operations |
| **Stop-word filtering at ingest** | Eliminates ~15% of index entries |
| **Query-term deduplication** | Skips scoring identical words |
| **Early-exit top-k** | Stops when max possible score < current k-th result |
| **Per-term Bloom filters** | Aborts lookup for non-existent terms with <1% false positive |
| **LRU query cache** | Returns cached results in microseconds for repeated queries |
| **Memory pool reuse** | Reduces allocation overhead during search operations |


## Browser Requirements

- **WebAssembly (WASM)**: All modern browsers (Chrome 57+, Firefox 52+, Safari 11+, Edge 16+)
- **Web Workers**: For multicore parallelism via Rayon
- **SharedArrayBuffer**: Required for true parallel processing (secure contexts only)

## WebAssembly Integration

```javascript
import init, { SearchEngine, Schema } from './pkg/defuss_search.js';

async function setupSearch() {
  // Initialize the WASM module
  await init();
  
  // Initialize thread pool for multicore processing
  await init_thread_pool(navigator.hardwareConcurrency);
  
  // Create schema and search engine
  const schema = Schema.builder()
    .attribute("title", Kind.TITLE)
    .attribute("content", Kind.CONTENT)
    .build();
    
  const engine = SearchEngine.with_schema(schema);
  
  // Add documents
  const doc = Document.new("doc1")
    .attribute("title", "WebAssembly Search Engine")
    .attribute("content", "Fast hybrid search with Rust and WASM...")
    .build();
    
  engine.add_document(doc, "English");
  
  // Search
  const results = engine.search("WebAssembly search", null, 10);
}
```

**Required Server Headers** for multicore functionality:
```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

## Language Support

Supports 15 languages with proper stop-word filtering and stemming:
Arabic (`ar`), Danish (`da`), Dutch (`nl`), English (`en`), Finnish (`fi`), French (`fr`), German (`de`), Hungarian (`hu`), Italian (`it`), Norwegian (`no`), Portuguese (`pt`), Romanian (`ro`), Russian (`ru`), Spanish (`es`), Swedish (`sv`), Turkish (`tr`)

## Document Store

Separate compressed document storage for full document retrieval:

```rust
// Store original documents separately from search index
let mut store = DocumentStore::new();
store.store_document(&doc)?;

// Serialize for persistence
let serialized = store.serialize_to_bytes()?;

// Retrieve full documents by ID
let retrieved = store.get_document(&DocumentId::new("doc1"))?;
```

## Benchmarks

We're benchmarking for:

- Search speed
- Indexing speed
- Memory usage
- Code size
- Index size (on disk, in memory, in transit)
- Parallel query performance 
- Parallel indexing performance
- Hybrid search quality (precision, recall) against MIRACL dataset (RRF vs. CombSUM)
- Full-text search quality (precision, recall) against MIRACL dataset (BM25FS⁺ vs. BM25)
- Vector search quality (precision, recall) against MIRACL dataset