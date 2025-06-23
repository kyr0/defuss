use wasm_bindgen::prelude::*;
use rayon::prelude::*;
use std::sync::{Arc, Mutex, OnceLock};
use std::collections::{HashMap, BTreeMap, HashSet, VecDeque};
use lru::LruCache;
use ordered_float::OrderedFloat;
use regex::Regex;
use stop_words::{get, LANGUAGE as StopWordsLanguage};
use rust_stemmers::{Algorithm, Stemmer};

// Minimal document store stub (BSON temporarily disabled)
#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct DocumentId(String);

impl DocumentId {
    pub fn new(id: impl AsRef<str>) -> Self {
        Self(id.as_ref().to_string())
    }
}

impl From<&str> for DocumentId {
    fn from(s: &str) -> Self {
        Self(s.to_string())
    }
}

impl From<String> for DocumentId {
    fn from(s: String) -> Self {
        Self(s)
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum IndexError {
    SerializationError(String),
    CacheError(String),
    NotFound(String),
}

impl std::fmt::Display for IndexError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            IndexError::SerializationError(msg) => write!(f, "Serialization error: {}", msg),
            IndexError::CacheError(msg) => write!(f, "Cache error: {}", msg),
            IndexError::NotFound(msg) => write!(f, "Not found: {}", msg),
        }
    }
}

impl std::error::Error for IndexError {}

#[derive(Debug)]
pub struct DocumentStore {
    // Minimal stub
}

impl DocumentStore {
    pub fn new() -> Self {
        Self {}
    }
}

// =============================================================================
// CORE TYPES
// =============================================================================

/// Language support for text processing
#[derive(Debug, Clone, PartialEq)]
pub enum Language {
    English,
    German,
    French,
    Spanish,
    Italian,
    Portuguese,
    Dutch,
    Russian,
    Chinese,
    Japanese,
    Arabic,
}

/// Data type indicator for field values
#[derive(Debug, Clone, PartialEq)]
pub enum Kind {
    Text,
    Number,
    Boolean,
    DateTime,
    Vector,
}

/// Semantic meaning for enhanced processing
#[derive(Debug, Clone, PartialEq)]
pub enum SemanticKind {
    Title,
    Content,
    Description,
    Tags,
    Category,
    Metadata,
}

/// Generic value type for document attributes
#[derive(Debug, Clone)]
pub enum Value {
    Text(String),
    Number(f64),
    Boolean(bool),
    DateTime(i64),
    Vector(Vec<f32>),
    Array(Vec<Value>),
}

/// Field weight configuration for BM25FS⁺
#[derive(Debug, Clone)]
pub struct FieldWeight {
    pub boost: f32,
    pub semantic_kind: SemanticKind,
    pub language: Option<Language>,
}

impl Default for FieldWeight {
    fn default() -> Self {
        Self {
            boost: 1.0,
            semantic_kind: SemanticKind::Content,
            language: None,
        }
    }
}

/// Tokenizer configuration
#[derive(Debug, Clone)]
pub struct TokenizerConfig {
    pub language: Language,
    pub stop_words_enabled: bool,
    pub stemming_enabled: bool,
    pub min_token_length: usize,
    pub max_token_length: usize,
}

impl Default for TokenizerConfig {
    fn default() -> Self {
        Self {
            language: Language::English,
            stop_words_enabled: true,
            stemming_enabled: true,
            min_token_length: 2,
            max_token_length: 50,
        }
    }
}

/// Schema definition for hybrid search
#[derive(Debug, Clone)]
pub struct Schema {
    pub field_weights: HashMap<String, FieldWeight>,
    pub tokenizer_config: TokenizerConfig,
    pub vector_dimension: Option<usize>,
}

impl Schema {
    pub fn builder() -> SchemaBuilder {
        SchemaBuilder::new()
    }
}

/// Schema builder for fluent configuration
#[derive(Debug, Clone)]
pub struct SchemaBuilder {
    field_weights: HashMap<String, FieldWeight>,
    tokenizer_config: TokenizerConfig,
    vector_dimension: Option<usize>,
}

impl SchemaBuilder {
    pub fn new() -> Self {
        Self {
            field_weights: HashMap::new(),
            tokenizer_config: TokenizerConfig::default(),
            vector_dimension: None,
        }
    }

    pub fn build(self) -> Schema {
        Schema {
            field_weights: self.field_weights,
            tokenizer_config: self.tokenizer_config,
            vector_dimension: self.vector_dimension,
        }
    }
}

// =============================================================================
// INDEX TYPES
// =============================================================================

/// Strong-typed document identifier
pub type EntryIndex = u32;

/// Strong-typed attribute identifier
pub type AttributeIndex = u32;

/// Strong-typed value identifier
pub type ValueIndex = u32;

/// Position in text for highlighting
pub type Position = usize;

/// Strong-typed token identifier
pub type TokenIndex = u32;

// =============================================================================
// DOCUMENT TYPES
// =============================================================================

/// Document representation for indexing
#[derive(Debug, Clone)]
pub struct Document {
    pub id: DocumentId,
    pub attributes: HashMap<String, Vec<Value>>,
    pub vector: Option<Vec<f32>>,
}

impl Document {
    pub fn new(id: impl Into<DocumentId>) -> Self {
        Self {
            id: id.into(),
            attributes: HashMap::new(),
            vector: None,
        }
    }
}

/// Document entry in collection
#[derive(Debug, Clone)]
pub struct DocumentEntry {
    pub index: EntryIndex,
    pub document: Document,
}

/// Text document entry for BM25 scoring
#[derive(Debug, Clone)]
pub struct TextDocumentEntry {
    pub entry: DocumentEntry,
    pub text_content: HashMap<String, String>,
    pub token_counts: HashMap<String, u32>,
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/// Vector operation errors
#[derive(Debug, Clone, PartialEq)]
pub enum VectorError {
    DimensionMismatch,
    NotNormalized,
    CapacityExceeded,
}

impl std::fmt::Display for VectorError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            VectorError::DimensionMismatch => write!(f, "Vector dimension mismatch"),
            VectorError::NotNormalized => write!(f, "Vector is not normalized"),
            VectorError::CapacityExceeded => write!(f, "Vector capacity exceeded"),
        }
    }
}

impl std::error::Error for VectorError {}

// =============================================================================
// BM25FS⁺ CONFIGURATION AND SCORING
// =============================================================================

/// BM25FS⁺ parameters for consistent scoring with dynamic field weights
#[derive(Debug, Clone)]
pub struct BM25Config {
    /// TF saturation parameter (default: 1.2)
    pub k1: f32,
    /// Lower bound shift parameter (default: 0.5)
    pub delta: f32,
    /// Field weights from schema
    pub field_weights: HashMap<String, FieldWeight>,
    /// Tokenizer configuration
    pub tokenizer_config: TokenizerConfig,
}

impl BM25Config {
    pub fn new(schema: &Schema) -> Self {
        Self {
            k1: 1.2,
            delta: 0.5,
            field_weights: schema.field_weights.clone(),
            tokenizer_config: schema.tokenizer_config.clone(),
        }
    }
}

impl Default for BM25Config {
    fn default() -> Self {
        Self {
            k1: 1.2,
            delta: 0.5,
            field_weights: HashMap::new(),
            tokenizer_config: TokenizerConfig::default(),
        }
    }
}

/// BM25FS⁺ scorer for text search results
#[derive(Debug)]
pub struct BM25Scorer {
    pub config: BM25Config,
    pub term_frequencies: HashMap<String, u32>,
}

impl BM25Scorer {
    pub fn new() -> Self {
        Self {
            config: BM25Config::default(),
            term_frequencies: HashMap::new(),
        }
    }

    pub fn with_config(config: BM25Config) -> Self {
        Self {
            config,
            term_frequencies: HashMap::new(),
        }
    }
}

// =============================================================================
// TEXT PROCESSING
// =============================================================================

/// Token representation
#[derive(Debug, Clone, PartialEq)]
pub struct Token {
    pub text: String,
    pub position: Position,
    pub stemmed: Option<String>,
}

/// Text processor for tokenization and normalization
pub struct TextProcessor {
    pub config: TokenizerConfig,
    stemmer: Option<Stemmer>,
    stop_words: HashSet<String>,
}

impl std::fmt::Debug for TextProcessor {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("TextProcessor")
            .field("config", &self.config)
            .field("stop_words", &self.stop_words)
            .finish()
    }
}

impl TextProcessor {
    pub fn new() -> Self {
        Self::with_config(TokenizerConfig::default())
    }

    pub fn with_config(config: TokenizerConfig) -> Self {
        let stemmer = if config.stemming_enabled {
            Some(Stemmer::create(Algorithm::English))
        } else {
            None
        };

        let stop_words = if config.stop_words_enabled {
            get(StopWordsLanguage::English).into_iter().map(|s| s.to_string()).collect()
        } else {
            HashSet::new()
        };

        Self {
            config,
            stemmer,
            stop_words,
        }
    }

    pub fn process_text(&self, text: &str) -> Vec<Token> {
        // Simple tokenization - split on whitespace and punctuation
        let words: Vec<&str> = text.split_whitespace().collect();
        let mut tokens = Vec::new();

        for (pos, word) in words.iter().enumerate() {
            let clean_word = word.trim_matches(|c: char| !c.is_alphanumeric()).to_lowercase();
            
            if clean_word.len() < self.config.min_token_length 
                || clean_word.len() > self.config.max_token_length {
                continue;
            }

            if self.config.stop_words_enabled && self.stop_words.contains(&clean_word) {
                continue;
            }

            let stemmed = if let Some(ref stemmer) = self.stemmer {
                Some(stemmer.stem(&clean_word).to_string())
            } else {
                None
            };

            tokens.push(Token {
                text: clean_word,
                position: pos,
                stemmed,
            });
        }

        tokens
    }
}

// =============================================================================
// INDEX IMPLEMENTATIONS
// =============================================================================

/// Vector index for semantic search
#[derive(Debug)]
pub struct VectorIndex {
    pub vectors: Vec<f32>,
    pub doc_mapping: Vec<EntryIndex>,
    pub dimension: usize,
    pub enabled: bool,
}

impl VectorIndex {
    pub fn new() -> Self {
        Self {
            vectors: Vec::new(),
            doc_mapping: Vec::new(),
            dimension: 1024,
            enabled: false,
        }
    }

    pub fn with_dimension(dimension: usize) -> Self {
        Self {
            vectors: Vec::new(),
            doc_mapping: Vec::new(),
            dimension,
            enabled: true,
        }
    }

    pub fn add_vector(&mut self, doc: EntryIndex, vector: Vec<f32>) -> Result<(), VectorError> {
        // Auto-enable and set dimension on first vector
        if !self.enabled && !vector.is_empty() {
            self.dimension = vector.len();
            self.enabled = true;
            web_sys::console::log_1(&format!("🎯 Vector index auto-enabled with dimension {}", self.dimension).into());
        }
        
        if !self.enabled {
            return Ok(());
        }

        if vector.len() != self.dimension {
            return Err(VectorError::DimensionMismatch);
        }

        self.vectors.extend_from_slice(&vector);
        self.doc_mapping.push(doc);
        Ok(())
    }

    pub fn search_vector(&self, query: &[f32], top_k: usize) -> Vec<(EntryIndex, f32)> {
        web_sys::console::log_1(&format!("🧮 Vector search with query length {} for top {}", query.len(), top_k).into());
        
        if !self.enabled || query.len() != self.dimension {
            web_sys::console::log_1(&format!("❌ Vector search failed: enabled={}, query_len={}, dimension={}", 
                self.enabled, query.len(), self.dimension).into());
            return Vec::new();
        }

        let num_vectors = self.doc_mapping.len();
        web_sys::console::log_1(&format!("📊 Vector index has {} stored vectors", num_vectors).into());
        
        if num_vectors == 0 {
            web_sys::console::log_1(&"❌ No vectors stored in index".into());
            return Vec::new();
        }

        let mut similarities = Vec::with_capacity(num_vectors);

        // Calculate cosine similarity for each stored vector
        for i in 0..num_vectors {
            let start_idx = i * self.dimension;
            let end_idx = start_idx + self.dimension;
            let stored_vector = &self.vectors[start_idx..end_idx];

            // Dot product
            let mut dot_product = 0.0;
            for j in 0..self.dimension {
                dot_product += query[j] * stored_vector[j];
            }

            // Magnitude of stored vector (assuming query is normalized)
            let mut magnitude = 0.0;
            for j in 0..self.dimension {
                magnitude += stored_vector[j] * stored_vector[j];
            }
            magnitude = magnitude.sqrt();

            let similarity = if magnitude > 0.0 {
                dot_product / magnitude
            } else {
                0.0
            };

            web_sys::console::log_1(&format!("  🎯 Vector {}: doc={}, similarity={:.3}", 
                i, self.doc_mapping[i], similarity).into());
            similarities.push((self.doc_mapping[i], similarity));
        }

        // Sort by similarity (descending) and return top_k
        similarities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        similarities.truncate(top_k);
        
        web_sys::console::log_1(&format!("✅ Vector search returning {} results", similarities.len()).into());
        similarities
    }
}

/// Text index for BM25FS⁺ search
#[derive(Debug)]
pub struct TextIndex {
    pub config: BM25Config,
    pub term_stats: HashMap<String, u32>,
    pub inverted_index: HashMap<String, Vec<(EntryIndex, Vec<Position>)>>,
    pub processor: TextProcessor,
}

impl TextIndex {
    pub fn new() -> Self {
        Self {
            config: BM25Config::default(),
            term_stats: HashMap::new(),
            inverted_index: HashMap::new(),
            processor: TextProcessor::new(),
        }
    }

    pub fn with_config(config: BM25Config) -> Self {
        let processor = TextProcessor::with_config(config.tokenizer_config.clone());
        Self {
            config,
            term_stats: HashMap::new(),
            inverted_index: HashMap::new(),
            processor,
        }
    }
}

/// Document collection management
#[derive(Debug)]
pub struct Collection {
    documents: Vec<DocumentEntry>,
    doc_store: DocumentStore,
    next_index: EntryIndex,
}

impl Collection {
    pub fn new() -> Self {
        Self {
            documents: Vec::new(),
            doc_store: DocumentStore::new(),
            next_index: 0,
        }
    }
}

// =============================================================================
// FUSION STRATEGIES
// =============================================================================

/// Fusion strategy for combining text and vector search results
#[derive(Debug, Clone, PartialEq)]
pub enum FusionStrategy {
    RRF, // Reciprocal Rank Fusion
    CombSUM, // Combined sum
    WeightedSum(f32), // Weighted combination
}

// =============================================================================
// MAIN SEARCH ENGINE
// =============================================================================

/// Main hybrid search engine combining text and vector search
#[derive(Debug)]
pub struct SearchEngine {
    pub collection: Collection,
    pub text_index: TextIndex,
    pub vector_index: VectorIndex,
    pub schema: Schema,
}

impl SearchEngine {
    pub fn new() -> Self {
        Self {
            collection: Collection::new(),
            text_index: TextIndex::new(),
            vector_index: VectorIndex::new(),
            schema: Schema::builder().build(),
        }
    }

    pub fn with_schema(schema: Schema) -> Self {
        let config = BM25Config::new(&schema);
        let vector_index = if let Some(dim) = schema.vector_dimension {
            VectorIndex::with_dimension(dim)
        } else {
            VectorIndex::new()
        };
        
        Self {
            collection: Collection::new(),
            text_index: TextIndex::with_config(config),
            vector_index,
            schema,
        }
    }

    /// Add a document to the search index
    pub fn add_document(&mut self, document: Document) -> Result<EntryIndex, IndexError> {
        let entry_index = self.collection.next_index;
        self.collection.next_index += 1;

        web_sys::console::log_1(&format!("🔧 Processing document {:?} with {} attributes", document.id, document.attributes.len()).into());

        // Add to vector index if vector is present
        if let Some(ref vector) = document.vector {
            web_sys::console::log_1(&format!("  🧮 Adding vector with {} dimensions", vector.len()).into());
            self.vector_index.add_vector(entry_index, vector.clone())
                .map_err(|e| IndexError::SerializationError(format!("Vector index error: {}", e)))?;
        }

        // Add to text index
        let mut total_tokens = 0;
        for (field_name, values) in &document.attributes {
            web_sys::console::log_1(&format!("  📝 Processing field '{}' with {} values", field_name, values.len()).into());
            for value in values {
                if let Value::Text(text) = value {
                    web_sys::console::log_1(&format!("    📄 Text: '{}'", text).into());
                    let tokens = self.text_index.processor.process_text(text);
                    web_sys::console::log_1(&format!("    🔤 Generated {} tokens", tokens.len()).into());
                    
                    for token in tokens {
                        let positions = self.text_index.inverted_index
                            .entry(token.text.clone())
                            .or_insert_with(Vec::new);
                        
                        // Check if this document is already in the posting list
                        if let Some(existing) = positions.iter_mut().find(|(idx, _)| *idx == entry_index) {
                            existing.1.push(token.position);
                        } else {
                            positions.push((entry_index, vec![token.position]));
                        }

                        // Update term stats
                        *self.text_index.term_stats.entry(token.text.clone()).or_insert(0) += 1;
                        total_tokens += 1;
                    }
                }
            }
        }

        web_sys::console::log_1(&format!("  ✅ Indexed {} total tokens", total_tokens).into());

        // Store document in collection
        let doc_entry = DocumentEntry {
            index: entry_index,
            document,
        };
        self.collection.documents.push(doc_entry);

        Ok(entry_index)
    }

    /// Perform text-only search using BM25FS⁺
    pub fn search_text(&self, query: &str, top_k: usize) -> Vec<(EntryIndex, f32)> {
        web_sys::console::log_1(&format!("🔍 Text search for: '{}'", query).into());
        
        let query_tokens = self.text_index.processor.process_text(query);
        web_sys::console::log_1(&format!("  🔤 Query tokens: {} ({:?})", query_tokens.len(), 
            query_tokens.iter().map(|t| &t.text).collect::<Vec<_>>()).into());
        
        if query_tokens.is_empty() {
            web_sys::console::log_1(&"  ❌ No valid query tokens".into());
            return Vec::new();
        }

        let mut scores: HashMap<EntryIndex, f32> = HashMap::new();

        for token in query_tokens {
            web_sys::console::log_1(&format!("    🔍 Looking for token: '{}'", token.text).into());
            
            if let Some(postings) = self.text_index.inverted_index.get(&token.text) {
                let doc_freq = postings.len() as f32;
                let total_docs = self.collection.documents.len() as f32;
                let idf = (total_docs / doc_freq).ln();
                
                web_sys::console::log_1(&format!("      📊 Found in {} docs, IDF: {:.3}", doc_freq, idf).into());

                for (doc_idx, positions) in postings {
                    let tf = positions.len() as f32;
                    let score = tf * idf;
                    *scores.entry(*doc_idx).or_insert(0.0) += score;
                    web_sys::console::log_1(&format!("        📈 Doc {}: TF={}, Score={:.3}", doc_idx, tf, score).into());
                }
            } else {
                web_sys::console::log_1(&format!("      ❌ Token '{}' not found in index", token.text).into());
            }
        }

        web_sys::console::log_1(&format!("  📊 Total matching documents: {}", scores.len()).into());

        let mut results: Vec<(EntryIndex, f32)> = scores.into_iter().collect();
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(top_k);
        
        web_sys::console::log_1(&format!("  ✅ Returning {} results", results.len()).into());
        results
    }

    /// Perform vector-only search
    pub fn search_vector(&self, query: &[f32], top_k: usize) -> Vec<(EntryIndex, f32)> {
        self.vector_index.search_vector(query, top_k)
    }

    /// Perform hybrid search combining text and vector results
    pub fn search_hybrid(&self, text_query: Option<&str>, vector_query: Option<&[f32]>, 
                        top_k: usize, strategy: FusionStrategy) -> Vec<(EntryIndex, f32)> {
        let text_results = if let Some(query) = text_query {
            self.search_text(query, top_k * 2) // Get more candidates for fusion
        } else {
            Vec::new()
        };

        let vector_results = if let Some(query) = vector_query {
            self.search_vector(query, top_k * 2) // Get more candidates for fusion
        } else {
            Vec::new()
        };

        // Apply fusion strategy
        match strategy {
            FusionStrategy::RRF => self.reciprocal_rank_fusion(&text_results, &vector_results, top_k),
            FusionStrategy::CombSUM => self.combine_sum(&text_results, &vector_results, top_k, 0.5),
            FusionStrategy::WeightedSum(alpha) => self.combine_sum(&text_results, &vector_results, top_k, alpha),
        }
    }

    /// Reciprocal Rank Fusion implementation
    fn reciprocal_rank_fusion(&self, text_results: &[(EntryIndex, f32)], 
                             vector_results: &[(EntryIndex, f32)], top_k: usize) -> Vec<(EntryIndex, f32)> {
        let k = 60.0; // RRF parameter
        let mut scores: HashMap<EntryIndex, f32> = HashMap::new();

        // Add text scores
        for (rank, (doc_id, _)) in text_results.iter().enumerate() {
            let rrf_score = 1.0 / (k + (rank + 1) as f32);
            *scores.entry(*doc_id).or_insert(0.0) += rrf_score;
        }

        // Add vector scores
        for (rank, (doc_id, _)) in vector_results.iter().enumerate() {
            let rrf_score = 1.0 / (k + (rank + 1) as f32);
            *scores.entry(*doc_id).or_insert(0.0) += rrf_score;
        }

        let mut results: Vec<(EntryIndex, f32)> = scores.into_iter().collect();
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(top_k);
        results
    }

    /// Combined sum fusion with weight parameter
    fn combine_sum(&self, text_results: &[(EntryIndex, f32)], 
                  vector_results: &[(EntryIndex, f32)], top_k: usize, alpha: f32) -> Vec<(EntryIndex, f32)> {
        let mut scores: HashMap<EntryIndex, f32> = HashMap::new();

        // Normalize and add text scores
        if !text_results.is_empty() {
            let max_text_score = text_results[0].1;
            for (doc_id, score) in text_results {
                let normalized_score = score / max_text_score;
                *scores.entry(*doc_id).or_insert(0.0) += (1.0 - alpha) * normalized_score;
            }
        }

        // Normalize and add vector scores
        if !vector_results.is_empty() {
            let max_vector_score = vector_results[0].1;
            for (doc_id, score) in vector_results {
                let normalized_score = score / max_vector_score;
                *scores.entry(*doc_id).or_insert(0.0) += alpha * normalized_score;
            }
        }

        let mut results: Vec<(EntryIndex, f32)> = scores.into_iter().collect();
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(top_k);
        results
    }

    /// Get search engine statistics
    pub fn get_stats(&self) -> (usize, usize) {
        (self.collection.documents.len(), self.text_index.term_stats.len())
    }
}

// =============================================================================
// HIGH-PERFORMANCE VECTOR FUNCTIONS (PLACEHOLDER)
// =============================================================================

/// Workload analysis for adaptive optimization
#[derive(Debug, Clone)]
pub struct WorkloadProfile {
    pub vector_length: usize,
    pub num_pairs: usize,
}

impl WorkloadProfile {
    pub fn new(vector_length: usize, num_pairs: usize) -> Self {
        Self {
            vector_length,
            num_pairs,
        }
    }
}

/// High-performance batch dot product (placeholder)
#[no_mangle]
pub unsafe extern "C" fn batch_dot_product_ultimate(
    _a_ptr: *const f32,
    _b_ptr: *const f32,
    _results_ptr: *mut f32,
    _vector_length: usize,
    _num_pairs: usize,
) -> f64 {
    // Placeholder implementation
    0.0
}

/// WASM-bindgen wrapper for external calls
#[wasm_bindgen]
pub fn batch_dot_product_ultimate_external(
    _a_data: Vec<f32>,
    _b_data: Vec<f32>,
    _vector_length: usize,
    _num_pairs: usize,
) -> js_sys::Array {
    // Placeholder implementation
    js_sys::Array::new()
}

// =============================================================================
// WASM BINDINGS FOR HYBRID SEARCH
// =============================================================================

/// WASM-compatible document representation
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct WasmDocument {
    id: String,
    text_fields: js_sys::Map,
    vector: Option<Vec<f32>>,
}

#[wasm_bindgen]
impl WasmDocument {
    #[wasm_bindgen(constructor)]
    pub fn new(id: String) -> Self {
        Self {
            id,
            text_fields: js_sys::Map::new(),
            vector: None,
        }
    }

    #[wasm_bindgen]
    pub fn add_text_field(&mut self, name: &str, value: &str) {
        web_sys::console::log_1(&format!("🔧 WASM: Adding text field '{}' = '{}'", name, value).into());
        self.text_fields.set(&js_sys::JsString::from(name), &js_sys::JsString::from(value));
        web_sys::console::log_1(&format!("📊 WASM: text_fields now has {} entries", self.text_fields.size()).into());
    }

    #[wasm_bindgen]
    pub fn set_vector(&mut self, vector: Vec<f32>) {
        self.vector = Some(vector);
    }
}

/// WASM-compatible search result
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct WasmSearchResult {
    document_id: String,
    score: f32,
}

#[wasm_bindgen]
impl WasmSearchResult {
    #[wasm_bindgen(getter)]
    pub fn document_id(&self) -> String {
        self.document_id.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn score(&self) -> f32 {
        self.score
    }
}

/// WASM-compatible hybrid search engine
#[wasm_bindgen]
pub struct WasmSearchEngine {
    engine: SearchEngine,
    doc_id_mapping: HashMap<EntryIndex, String>,
}

#[wasm_bindgen]
impl WasmSearchEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            engine: SearchEngine::new(),
            doc_id_mapping: HashMap::new(),
        }
    }

    #[wasm_bindgen]
    pub fn add_document(&mut self, doc: WasmDocument) -> Result<(), js_sys::Error> {
        // Convert WASM document to internal document
        let mut document = Document::new(doc.id.clone());
        
        // Add text fields using Map iterator
        web_sys::console::log_1(&format!("🔍 Adding document {} with {} fields", doc.id, doc.text_fields.size()).into());
        
        // Iterate over Map entries
        let entries = doc.text_fields.entries();
        
        loop {
            let next = entries.next().unwrap();
            if next.done() {
                break;
            }
            
            let entry = next.value();
            let key_value_array: js_sys::Array = entry.dyn_into().unwrap();
            let field_name = key_value_array.get(0).as_string().unwrap();
            let field_value = key_value_array.get(1).as_string().unwrap();
            
            web_sys::console::log_1(&format!("  📝 Field '{}': '{}'", field_name, field_value).into());
            document.attributes.insert(field_name, vec![Value::Text(field_value)]);
        }

        // Add vector if present
        document.vector = doc.vector.clone();
        if let Some(ref vector) = doc.vector {
            web_sys::console::log_1(&format!("  🧮 Vector: {} dimensions", vector.len()).into());
        }

        // Add to engine
        match self.engine.add_document(document) {
            Ok(entry_index) => {
                web_sys::console::log_1(&format!("  ✅ Document added with index {}", entry_index).into());
                self.doc_id_mapping.insert(entry_index, doc.id);
                Ok(())
            }
            Err(e) => Err(js_sys::Error::new(&format!("Failed to add document: {}", e)))
        }
    }

    #[wasm_bindgen]
    pub fn search_text(&self, query: &str, top_k: usize) -> Vec<WasmSearchResult> {
        let results = self.engine.search_text(query, top_k);
        self.convert_results(results)
    }

    #[wasm_bindgen]
    pub fn search_vector(&self, query: Vec<f32>, top_k: usize) -> Vec<WasmSearchResult> {
        let results = self.engine.search_vector(&query, top_k);
        self.convert_results(results)
    }

    #[wasm_bindgen]
    pub fn search_hybrid(&self, text_query: Option<String>, vector_query: Option<Vec<f32>>, 
                        top_k: usize, strategy: &str) -> Vec<WasmSearchResult> {
        let fusion_strategy = match strategy {
            "rrf" => FusionStrategy::RRF,
            "combsum" => FusionStrategy::CombSUM,
            _ => FusionStrategy::RRF,
        };

        let text_ref = text_query.as_ref().map(|s| s.as_str());
        let vector_ref = vector_query.as_ref().map(|v| v.as_slice());

        let results = self.engine.search_hybrid(text_ref, vector_ref, top_k, fusion_strategy);
        self.convert_results(results)
    }

    #[wasm_bindgen]
    pub fn get_stats(&self) -> js_sys::Array {
        let (doc_count, term_count) = self.engine.get_stats();
        let stats = js_sys::Array::new();
        stats.push(&js_sys::Number::from(doc_count as f64));
        stats.push(&js_sys::Number::from(term_count as f64));
        stats
    }

    // Helper method to convert results
    fn convert_results(&self, results: Vec<(EntryIndex, f32)>) -> Vec<WasmSearchResult> {
        results.into_iter()
            .filter_map(|(entry_index, score)| {
                self.doc_id_mapping.get(&entry_index).map(|doc_id| {
                    WasmSearchResult {
                        document_id: doc_id.clone(),
                        score,
                    }
                })
            })
            .collect()
    }
}
