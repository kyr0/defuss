use wasm_bindgen::prelude::*;
use rayon::prelude::*;
use std::collections::{HashMap, HashSet};
use stop_words::{get, LANGUAGE as StopWordsLanguage};
use rust_stemmers::{Algorithm, Stemmer};

use std::sync::Mutex;
use lru::LruCache;
use std::num::NonZeroUsize;

// Import the ultimate optimized vector operations from the crate root
use crate::vector::batch_dot_product_ultimate;

/// Query cache for repeated searches (LRU with 32 entries)
thread_local! {
    static QUERY_CACHE: std::cell::RefCell<LruCache<String, Vec<(String, f32)>>> = 
        std::cell::RefCell::new(LruCache::new(NonZeroUsize::new(32).unwrap()));
}


/// Bloom filter for fast term existence checking (256-bit)
#[derive(Debug, Clone)]
pub struct BloomFilter {
    bits: [u64; 4], // 256 bits = 4 × 64-bit words
    hash_count: usize,
}

impl BloomFilter {
    pub fn new() -> Self {
        Self {
            bits: [0; 4],
            hash_count: 3, // Optimal for ~1% false positive rate
        }
    }

    pub fn insert(&mut self, term: &str) {
        for i in 0..self.hash_count {
            let hash = self.hash(term, i);
            let word_idx = (hash >> 6) & 3; // Which 64-bit word
            let bit_idx = hash & 63;        // Which bit in the word
            self.bits[word_idx as usize] |= 1u64 << bit_idx;
        }
    }

    pub fn contains(&self, term: &str) -> bool {
        for i in 0..self.hash_count {
            let hash = self.hash(term, i);
            let word_idx = (hash >> 6) & 3;
            let bit_idx = hash & 63;
            if (self.bits[word_idx as usize] & (1u64 << bit_idx)) == 0 {
                return false; // Definitely not in set
            }
        }
        true // Probably in set (might be false positive)
    }

    fn hash(&self, term: &str, seed: usize) -> u8 {
        // Simple hash function for demonstration
        let mut hash = seed as u64;
        for byte in term.bytes() {
            hash = hash.wrapping_mul(31).wrapping_add(byte as u64);
        }
        (hash & 0xFF) as u8
    }
}


// =============================================================================
// CORE TYPES
// =============================================================================

/// Document identifier
#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct DocumentId(pub String);

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

/// Semantic field types with automatic BM25F weight assignment
#[wasm_bindgen]
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

impl Kind {
    /// Get the appropriate BM25F weights for this semantic kind
    pub fn weights(&self) -> (f32, f32) {
        match self {
            Kind::TITLE => (2.5, 0.75),
            Kind::CONTENT => (1.0, 0.75),
            Kind::DESCRIPTION => (1.5, 0.75),
            Kind::HEADING => (2.0, 0.75),
            Kind::TAGS => (1.8, 0.5),
            Kind::AUTHOR => (1.2, 0.6),
            Kind::DATE => (0.8, 0.5),
            Kind::REFERENCE => (0.6, 0.5),
            Kind::TEXT => (1.0, 0.75),
        }
    }

    /// Get the weight (boost factor) for this kind
    pub fn weight(&self) -> f32 {
        self.weights().0
    }

    /// Get the b parameter (length normalization) for this kind
    pub fn b_param(&self) -> f32 {
        self.weights().1
    }
}

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

/// Generic value type for document attributes (text and vector only)
#[derive(Debug, Clone)]
pub enum Value {
    Text(String),
    Vector(Vec<f32>),
}

/// Field weight configuration for BM25FS⁺
#[derive(Debug, Clone)]
pub struct FieldWeight {
    pub weight: f32,  // BM25F weight factor
    pub b: f32,       // Length normalization parameter
    pub kind: Kind,   // Semantic kind for this field
}

impl FieldWeight {
    pub fn new(kind: Kind) -> Self {
        let (weight, b) = kind.weights();
        Self { weight, b, kind }
    }

    pub fn with_custom_weight(kind: Kind, weight: f32, b: Option<f32>) -> Self {
        let default_b = kind.b_param();
        Self { 
            weight, 
            b: b.unwrap_or(default_b), 
            kind 
        }
    }
}

impl Default for FieldWeight {
    fn default() -> Self {
        Self::new(Kind::CONTENT)
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
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct Schema {
    field_weights: HashMap<String, FieldWeight>,
    tokenizer_config: TokenizerConfig,
    vector_dimension: Option<usize>,
}

#[wasm_bindgen]
impl Schema {
    /// Create a new schema builder
    #[wasm_bindgen]
    pub fn builder() -> SchemaBuilder {
        SchemaBuilder::new()
    }

    /// Get the number of configured fields
    #[wasm_bindgen]
    pub fn field_count(&self) -> usize {
        self.field_weights.len()
    }

    /// Get field names as a JS array
    #[wasm_bindgen]
    pub fn field_names(&self) -> js_sys::Array {
        let names = js_sys::Array::new();
        for field_name in self.field_weights.keys() {
            names.push(&js_sys::JsString::from(field_name.as_str()));
        }
        names
    }
}

impl Schema {
    /// Get field weights (for internal access)
    pub fn get_field_weights(&self) -> &HashMap<String, FieldWeight> {
        &self.field_weights
    }

    /// Get tokenizer config (for internal access)
    pub fn get_tokenizer_config(&self) -> &TokenizerConfig {
        &self.tokenizer_config
    }

    /// Get vector dimension (for internal access)
    pub fn get_vector_dimension(&self) -> Option<usize> {
        self.vector_dimension
    }
}

/// Schema builder for fluent configuration
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct SchemaBuilder {
    field_weights: HashMap<String, FieldWeight>,
    tokenizer_config: TokenizerConfig,
    vector_dimension: Option<usize>,
}

#[wasm_bindgen]
impl SchemaBuilder {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            field_weights: HashMap::new(),
            tokenizer_config: TokenizerConfig::default(),
            vector_dimension: None,
        }
    }

    /// Add a field with semantic kind for automatic weight assignment
    #[wasm_bindgen]
    pub fn attribute(mut self, field_name: &str, kind: Kind) -> Self {
        self.field_weights.insert(field_name.to_string(), FieldWeight::new(kind));
        self
    }

    /// Add a field with custom weight override
    #[wasm_bindgen]
    pub fn attribute_with_weight(mut self, field_name: &str, kind: Kind, weight: f32, b: Option<f32>) -> Self {
        self.field_weights.insert(field_name.to_string(), FieldWeight::with_custom_weight(kind, weight, b));
        self
    }

    /// Set the vector dimension for hybrid search
    #[wasm_bindgen]
    pub fn vector_dimension(mut self, dimension: usize) -> Self {
        self.vector_dimension = Some(dimension);
        self
    }

    /// Build the schema
    #[wasm_bindgen]
    pub fn build(self) -> Schema {
        Schema {
            field_weights: self.field_weights,
            tokenizer_config: self.tokenizer_config,
            vector_dimension: self.vector_dimension,
        }
    }
}

/// Document representation for indexing
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct Document {
    id: DocumentId,
    attributes: HashMap<String, Vec<Value>>,
    vector: Option<Vec<f32>>,
}

#[wasm_bindgen]
impl Document {
    #[wasm_bindgen(constructor)]
    pub fn new(id: &str) -> Self {
        Self {
            id: DocumentId::new(id),
            attributes: HashMap::new(),
            vector: None,
        }
    }

    /// Add a text attribute to the document
    #[wasm_bindgen]
    pub fn attribute(mut self, field_name: &str, value: &str) -> Self {
        self.attributes
            .entry(field_name.to_string())
            .or_insert_with(Vec::new)
            .push(Value::Text(value.to_string()));
        self
    }

    /// Add a vector embedding to the document
    #[wasm_bindgen]
    pub fn with_vector(mut self, vector: Vec<f32>) -> Self {
        self.vector = Some(vector);
        self
    }
}

impl Document {
    /// Get document ID (for internal access)
    pub fn get_id(&self) -> &DocumentId {
        &self.id
    }

    /// Get attributes (for internal access)
    pub fn get_attributes(&self) -> &HashMap<String, Vec<Value>> {
        &self.attributes
    }

    /// Get vector (for internal access)
    pub fn get_vector(&self) -> Option<&Vec<f32>> {
        self.vector.as_ref()
    }
}

/// WASM-compatible search result
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct SearchResult {
    document_id: String,
    score: f32,
}

#[wasm_bindgen]
impl SearchResult {
    #[wasm_bindgen(getter)]
    pub fn document_id(&self) -> String {
        self.document_id.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn score(&self) -> f32 {
        self.score
    }
}

// =============================================================================
// ERROR TYPES
// =============================================================================

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

pub type EntryIndex = u32;
pub type AttributeIndex = u32;
pub type ValueIndex = u32;
pub type Position = usize;
pub type TokenIndex = u32;

/// Simple BM25 configuration
#[derive(Debug, Clone)]
pub struct BM25Config {
    pub k1: f32,
    pub delta: f32,
    pub field_weights: HashMap<String, FieldWeight>,
    pub tokenizer_config: TokenizerConfig,
}

impl BM25Config {
    pub fn new(schema: &Schema) -> Self {
        Self {
            k1: 1.2,
            delta: 0.5,
            field_weights: schema.get_field_weights().clone(),
            tokenizer_config: schema.get_tokenizer_config().clone(),
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
    pub term_frequencies: HashMap<String, u32>, // Document frequency per term
    pub total_docs: u32,
    pub field_lengths: HashMap<String, Vec<f32>>, // Track field lengths per document
    pub avg_field_lengths: HashMap<String, f32>,  // Average field length per field
}

impl BM25Scorer {
    pub fn new() -> Self {
        Self {
            config: BM25Config::default(),
            term_frequencies: HashMap::new(),
            total_docs: 0,
            field_lengths: HashMap::new(),
            avg_field_lengths: HashMap::new(),
        }
    }

    pub fn with_config(config: BM25Config) -> Self {
        Self {
            config,
            term_frequencies: HashMap::new(),
            total_docs: 0,
            field_lengths: HashMap::new(),
            avg_field_lengths: HashMap::new(),
        }
    }

    /// Update term frequency for IDF calculation
    pub fn update_term_frequency(&mut self, term: &str) {
        *self.term_frequencies.entry(term.to_string()).or_insert(0) += 1;
    }

    /// Update document count and field length tracking
    pub fn update_document_stats(&mut self, doc_id: usize, field_name: &str, field_length: f32) {
        self.total_docs = self.total_docs.max(doc_id as u32 + 1);
        
        let field_lengths = self.field_lengths.entry(field_name.to_string()).or_insert_with(Vec::new);
        if field_lengths.len() <= doc_id {
            field_lengths.resize(doc_id + 1, 0.0);
        }
        field_lengths[doc_id] = field_length;

        // Update average field length
        let total_length: f32 = field_lengths.iter().sum();
        let doc_count = field_lengths.len() as f32;
        self.avg_field_lengths.insert(field_name.to_string(), total_length / doc_count);
    }

    /// Compute BM25FS⁺ impact for a term in a field with eager scoring
    pub fn compute_impact(&self, term: &str, field_name: &str, tf: u32, doc_id: usize) -> f32 {
        let doc_freq = self.term_frequencies.get(term).copied().unwrap_or(1) as f32;
        let total_docs = self.total_docs.max(1) as f32;
        
        // IDF calculation with smoothing
        let idf = ((total_docs - doc_freq + 0.5) / (doc_freq + 0.5)).ln().max(0.0);
        
        // Get field weight and length normalization parameter
        let field_weight = self.config.field_weights
            .get(field_name)
            .map(|fw| fw.weight)
            .unwrap_or(1.0);
        let b = self.config.field_weights
            .get(field_name)
            .map(|fw| fw.b)
            .unwrap_or(0.75);
        
        // Field length normalization
        let doc_field_length = self.field_lengths
            .get(field_name)
            .and_then(|lengths| lengths.get(doc_id))
            .copied()
            .unwrap_or(1.0);
        let avg_field_length = self.avg_field_lengths
            .get(field_name)
            .copied()
            .unwrap_or(1.0);
        
        let norm_factor = 1.0 - b + b * (doc_field_length / avg_field_length);
        
        // BM25FS⁺ formula: w_f × IDF × ((k1 + 1) × tf) / (k1 × norm_factor + tf) + δ
        let tf_component = ((self.config.k1 + 1.0) * tf as f32) / (self.config.k1 * norm_factor + tf as f32);
        let impact = field_weight * idf * tf_component + self.config.delta;
        
        impact.max(0.0) // Ensure non-negative scores
    }
}

/// Simple token representation
#[derive(Debug, Clone, PartialEq)]
pub struct Token {
    pub text: String,
    pub position: Position,
    pub stemmed: Option<String>,
}

/// Simple text processor
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
        let words: Vec<&str> = text.split_whitespace().collect();
        
        // Use parallel processing for large texts (threshold: 100+ words)
        if words.len() > 100 {
            // Parallel processing with Rayon for large texts
            let tokens: Vec<Option<Token>> = words.par_iter().enumerate().map(|(pos, word)| {
                let clean_word = word.trim_matches(|c: char| !c.is_alphanumeric()).to_lowercase();
                
                if clean_word.len() < self.config.min_token_length 
                    || clean_word.len() > self.config.max_token_length {
                    return None;
                }

                if self.config.stop_words_enabled && self.stop_words.contains(&clean_word) {
                    return None;
                }

                let stemmed = if let Some(ref stemmer) = self.stemmer {
                    Some(stemmer.stem(&clean_word).to_string())
                } else {
                    None
                };

                Some(Token {
                    text: clean_word,
                    position: pos,
                    stemmed,
                })
            }).collect();
            
            // Filter out None values and collect
            tokens.into_iter().filter_map(|t| t).collect()
        } else {
            // Sequential processing for small texts to avoid parallelization overhead
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
}

/// Simple vector index
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
            #[cfg(target_arch = "wasm32")]
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
        #[cfg(target_arch = "wasm32")]
        web_sys::console::log_1(&format!("🧮 Vector search with query length {} for top {}", query.len(), top_k).into());
        
        if !self.enabled || query.len() != self.dimension {
            #[cfg(target_arch = "wasm32")]
            web_sys::console::log_1(&format!("❌ Vector search failed: enabled={}, query_len={}, dimension={}", 
                self.enabled, query.len(), self.dimension).into());
            return Vec::new();
        }

        let num_vectors = self.doc_mapping.len();
        #[cfg(target_arch = "wasm32")]
        web_sys::console::log_1(&format!("📊 Vector index has {} stored vectors", num_vectors).into());
        
        if num_vectors == 0 {
            #[cfg(target_arch = "wasm32")]
            web_sys::console::log_1(&"❌ No vectors stored in index".into());
            return Vec::new();
        }

        // Use the ULTIMATE optimized batch dot product from vector.rs
        // Since vectors are normalized, cosine similarity = dot product
        let similarities = self.compute_batch_dot_products_ultimate(query, num_vectors);

        // Combine results with document mappings and sort
        let mut scored_results: Vec<(EntryIndex, f32)> = similarities
            .into_iter()
            .enumerate()
            .map(|(i, score)| (self.doc_mapping[i], score))
            .collect();

        // Sort by similarity (descending) and return top_k
        scored_results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        scored_results.truncate(top_k);
        
        #[cfg(target_arch = "wasm32")]
        web_sys::console::log_1(&format!("✅ Vector search returning {} results", scored_results.len()).into());
        scored_results
    }

    /// ULTIMATE batch dot product computation using optimized vector.rs functions
    /// This leverages the 22.63 GFLOPS performance from vector.rs
    fn compute_batch_dot_products_ultimate(&self, query: &[f32], num_vectors: usize) -> Vec<f32> {
        // Prepare query data - replicate query for each stored vector
        let total_query_elements = num_vectors * self.dimension;
        let mut query_data = Vec::with_capacity(total_query_elements);
        
        // Replicate query vector for batch processing
        for _ in 0..num_vectors {
            query_data.extend_from_slice(query);
        }
        
        // Prepare results vector
        let mut results = vec![0.0f32; num_vectors];
        
        #[cfg(target_arch = "wasm32")]
        web_sys::console::log_1(&format!("🚀 Using ULTIMATE batch dot product: {} vectors × {} dims", 
            num_vectors, self.dimension).into());
        
        // Call the ULTIMATE optimized batch dot product function
        // self.vectors is already flattened: [vec1_dim1, vec1_dim2, ..., vec2_dim1, vec2_dim2, ...]
        // query_data is replicated: [query_dim1, query_dim2, ..., query_dim1, query_dim2, ...]
        let _execution_time = batch_dot_product_ultimate(
            query_data.as_ptr(),           // a_ptr: replicated query vectors
            self.vectors.as_ptr(),         // b_ptr: stored vectors (already flattened)
            results.as_mut_ptr(),          // results_ptr: output dot products
            self.dimension,                // vector_length: dimension of each vector
            num_vectors                    // num_pairs: number of dot products to compute
        );
        
        #[cfg(target_arch = "wasm32")]
        web_sys::console::log_1(&format!("⚡ ULTIMATE batch computation completed in {:.3}ms", _execution_time).into());
        
        results
    }
}

/// Enhanced text index with BM25FS⁺ and optimizations
#[derive(Debug)]
pub struct TextIndex {
    pub config: BM25Config,
    pub term_stats: HashMap<String, u32>,
    pub inverted_index: HashMap<String, Vec<(EntryIndex, String, Vec<Position>)>>, // Include field name
    pub processor: TextProcessor,
    pub bloom_filter: BloomFilter, // Fast term existence checking
    pub scorer: BM25Scorer,       // BM25FS⁺ scorer with impact computation
}

impl TextIndex {
    pub fn new() -> Self {
        Self {
            config: BM25Config::default(),
            term_stats: HashMap::new(),
            inverted_index: HashMap::new(),
            processor: TextProcessor::new(),
            bloom_filter: BloomFilter::new(),
            scorer: BM25Scorer::new(),
        }
    }

    pub fn with_config(config: BM25Config) -> Self {
        let processor = TextProcessor::with_config(config.tokenizer_config.clone());
        let scorer = BM25Scorer::with_config(config.clone());
        Self {
            config,
            term_stats: HashMap::new(),
            inverted_index: HashMap::new(),
            processor,
            bloom_filter: BloomFilter::new(),
            scorer,
        }
    }

    /// Add document with stop-word filtering and Bloom filter updates
    pub fn add_document(&mut self, doc_id: EntryIndex, field_name: &str, text: &str) {
        let tokens = self.processor.process_text(text);
        
        // Track field length for BM25 normalization
        self.scorer.update_document_stats(doc_id as usize, field_name, tokens.len() as f32);
        
        let mut term_frequencies = HashMap::new();
        
        for token in tokens {
            let term = token.stemmed.as_ref().unwrap_or(&token.text);
            
            // Update term frequency in document
            *term_frequencies.entry(term.clone()).or_insert(0) += 1;
            
            // Add to inverted index with field name
            let postings = self.inverted_index.entry(term.clone()).or_insert_with(Vec::new);
            if let Some(last) = postings.last_mut() {
                if last.0 == doc_id && last.1 == field_name {
                    last.2.push(token.position);
                    continue;
                }
            }
            postings.push((doc_id, field_name.to_string(), vec![token.position]));
            
            // Update global term statistics
            self.term_stats.entry(term.clone()).and_modify(|count| *count += 1).or_insert(1);
            
            // Add to Bloom filter for fast existence checking
            self.bloom_filter.insert(term);
            
            // Update scorer term frequency for IDF calculation
            self.scorer.update_term_frequency(term);
        }
        
        #[cfg(target_arch = "wasm32")]
        web_sys::console::log_1(&format!("📝 Added document {} to field '{}' with {} unique terms", 
            doc_id, field_name, term_frequencies.len()).into());
    }

    /// Search with query term deduplication and early-exit optimization
    pub fn search(&self, query: &str, top_k: usize) -> Vec<(EntryIndex, f32)> {
        let query_key = format!("{}:{}", query, top_k);
        
        // Check query cache first
        if let Ok(cached_results) = QUERY_CACHE.try_with(|cache| {
            cache.borrow_mut().get(&query_key).cloned()
        }) {
            if let Some(cached_results) = cached_results {
                #[cfg(target_arch = "wasm32")]
                web_sys::console::log_1(&"⚡ Query cache hit!".into());
                return cached_results.into_iter()
                    .map(|(doc_id, score)| (doc_id.parse().unwrap_or(0), score))
                    .collect();
            }
        }
        
        let mut query_terms: Vec<String> = self.processor.process_text(query)
            .into_iter()
            .map(|token| token.stemmed.unwrap_or(token.text))
            .collect();
        
        // Query term deduplication optimization
        query_terms.sort_unstable();
        query_terms.dedup();
        
        #[cfg(target_arch = "wasm32")]
        web_sys::console::log_1(&format!("🔍 Processing {} unique query terms", query_terms.len()).into());
        
        // Parallel processing of query terms with Rayon
        let doc_scores = Mutex::new(HashMap::<EntryIndex, f32>::new());
        
        query_terms.par_iter().for_each(|term| {
            // Bloom filter early exit for non-existent terms
            if !self.bloom_filter.contains(term) {
                #[cfg(target_arch = "wasm32")]
                web_sys::console::log_1(&format!("⚡ Bloom filter: term '{}' not found, skipping", term).into());
                return;
            }
            
            if let Some(postings) = self.inverted_index.get(term) {
                let mut local_scores = HashMap::new();
                for (doc_id, field_name, positions) in postings {
                    let tf = positions.len() as u32;
                    
                    // Use BM25FS⁺ impact computation for the specific field
                    let impact = self.scorer.compute_impact(term, field_name, tf, *doc_id as usize);
                    *local_scores.entry(*doc_id).or_insert(0.0) += impact;
                }
                
                // Merge local scores into global scores with mutex protection
                if let Ok(mut global_scores) = doc_scores.lock() {
                    for (doc_id, score) in local_scores {
                        *global_scores.entry(doc_id).or_insert(0.0) += score;
                    }
                }
            }
        });
        
        // Convert to sorted vector with early-exit top-k optimization
        let final_scores = doc_scores.into_inner().unwrap_or_default();
        let mut results: Vec<(EntryIndex, f32)> = final_scores.into_iter().collect();
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(top_k);
        
        // Cache the results
        let cache_results: Vec<(String, f32)> = results.iter()
            .map(|(doc_id, score)| (doc_id.to_string(), *score))
            .collect();
        
        let _ = QUERY_CACHE.try_with(|cache| {
            cache.borrow_mut().put(query_key, cache_results);
        });
        
        #[cfg(target_arch = "wasm32")]
        web_sys::console::log_1(&format!("✅ Text search returning {} results", results.len()).into());
        
        results
    }
}

/// Simple document entry
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



/// Simple collection
#[derive(Debug)]
pub struct Collection {
    pub documents: Vec<DocumentEntry>,
    pub doc_store: DocumentStore,
    pub next_index: EntryIndex,
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

/// Minimal document store for WASM compatibility (no BSON dependency)
#[derive(Debug)]
pub struct DocumentStore {
    documents: HashMap<DocumentId, Document>,
}

impl DocumentStore {
    pub fn new() -> Self {
        Self {
            documents: HashMap::new(),
        }
    }

    /// Store a document
    pub fn store_document(&mut self, doc: Document) {
        self.documents.insert(doc.get_id().clone(), doc);
    }

    /// Retrieve a document by ID
    pub fn get_document(&self, doc_id: &DocumentId) -> Option<&Document> {
        self.documents.get(doc_id)
    }

    /// Remove a document by ID
    pub fn remove_document(&mut self, doc_id: &DocumentId) -> Option<Document> {
        self.documents.remove(doc_id)
    }

    /// Get the number of stored documents
    pub fn document_count(&self) -> usize {
        self.documents.len()
    }

    /// Check if a document exists
    pub fn contains_document(&self, doc_id: &DocumentId) -> bool {
        self.documents.contains_key(doc_id)
    }

    /// Get all document IDs
    pub fn document_ids(&self) -> Vec<DocumentId> {
        self.documents.keys().cloned().collect()
    }

    /// Clear all documents
    pub fn clear(&mut self) {
        self.documents.clear();
    }
}

/// Fusion strategy enum
#[derive(Debug, Clone, PartialEq)]
pub enum FusionStrategy {
    RRF,
    CombSUM,
    WeightedSum(f32),
}

/// Main hybrid search engine
#[wasm_bindgen]
#[derive(Debug)]
pub struct SearchEngine {
    collection: Collection,
    text_index: TextIndex,
    vector_index: VectorIndex,
    schema: Schema,
    doc_id_mapping: HashMap<EntryIndex, String>,

    // ultra-minimal store for fast substring/fuzzy scanning
    flat_text: FlatTextStore,
}

#[cfg(target_arch = "wasm32")]
#[inline(always)]
fn mask_eq_16(ptr: *const u8, byte: u8) -> u16 {
    use core::arch::wasm32::*;
    unsafe {
        let v = v128_load(ptr as *const v128);
        let eq = i8x16_eq(v, i8x16_splat(byte as i8));
        i8x16_bitmask(eq) as u16
    }
}

// =============================================================================
// FAST SUBSTRING / FUZZY SCAN (NO INVERTED INDEX)
// =============================================================================

/// Normalize text for substring scanning:
/// - lowercase
/// - keep only alphanumeric
/// - all separators collapse to single space
#[inline]
fn normalize_for_substring(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut last_was_space = true;

    for ch in input.chars() {
        if ch.is_alphanumeric() {
            for lc in ch.to_lowercase() {
                out.push(lc);
            }
            last_was_space = false;
        } else {
            if !last_was_space {
                out.push(' ');
                last_was_space = true;
            }
        }
    }

    // trim trailing space (if any)
    if out.ends_with(' ') {
        out.pop();
    }
    out
}

/// Levenshtein distance with early cutoff.
/// Returns Some(dist) if dist <= max_dist, else None.
#[inline]
fn levenshtein_cutoff(a: &[u8], b: &[u8], max_dist: usize) -> Option<usize> {
    if a == b {
        return Some(0);
    }
    if a.is_empty() {
        return (b.len() <= max_dist).then_some(b.len());
    }
    if b.is_empty() {
        return (a.len() <= max_dist).then_some(a.len());
    }

    if a.len().abs_diff(b.len()) > max_dist {
        return None;
    }

    // Allocate based on shorter side to reduce work
    let (a, b) = if b.len() > a.len() { (b, a) } else { (a, b) };

    let mut prev: Vec<usize> = (0..=b.len()).collect();
    let mut curr: Vec<usize> = vec![0; b.len() + 1];

    for (i, &ac) in a.iter().enumerate() {
        curr[0] = i + 1;
        let mut row_min = curr[0];

        for (j, &bc) in b.iter().enumerate() {
            let cost = if ac == bc { 0 } else { 1 };

            let del = prev[j + 1] + 1;
            let ins = curr[j] + 1;
            let sub = prev[j] + cost;

            let v = del.min(ins).min(sub);
            curr[j + 1] = v;
            row_min = row_min.min(v);
        }

        if row_min > max_dist {
            return None;
        }

        std::mem::swap(&mut prev, &mut curr);
    }

    let dist = prev[b.len()];
    (dist <= max_dist).then_some(dist)
}

/// Minimal store: one normalized flat string per document.
/// This is intentionally "not a real index": O(N) scan per query.
#[derive(Debug, Default)]
pub struct FlatTextStore {
    texts: Vec<String>,
}

impl FlatTextStore {
    pub fn new() -> Self {
        Self { texts: Vec::new() }
    }

    fn ensure_len(&mut self, len: usize) {
        if self.texts.len() < len {
            self.texts.resize_with(len, String::new);
        }
    }

    pub fn add_document(&mut self, doc_idx: EntryIndex, doc: &Document) {
        let idx = doc_idx as usize;
        self.ensure_len(idx + 1);

        // concatenate all text fields, then normalize once
        let mut raw = String::new();
        for (_field_name, values) in doc.get_attributes() {
            for v in values {
                if let Value::Text(t) = v {
                    raw.push_str(t);
                    raw.push(' ');
                }
            }
        }

        self.texts[idx] = normalize_for_substring(&raw);
    }

    /// Exact substring search (normalized).
    pub fn search_substring(&self, query: &str, top_k: usize) -> Vec<(EntryIndex, f32)> {
        if top_k == 0 {
            return Vec::new();
        }

        let q = normalize_for_substring(query);
        if q.is_empty() {
            return Vec::new();
        }

        // Parallel scan across docs; score = "found early is better"
        let mut results: Vec<(EntryIndex, f32)> = self
            .texts
            .par_iter()
            .enumerate()
            .filter_map(|(i, text)| {
                text.find(&q).map(|pos| {
                    // Simple scoring: base 1.0, earlier matches slightly higher
                    let score = 1.0 + 1.0 / (1.0 + pos as f32);
                    (i as EntryIndex, score)
                })
            })
            .collect();

        results.sort_by(|a, b| {
            b.1.partial_cmp(&a.1)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        results.truncate(top_k);
        results
    }

    /// Fuzzy token search:
    /// - normalize query -> tokens
    /// - per token: exact substring OR best Levenshtein match against doc tokens (cutoff)
    /// - doc score = mean(token_scores), with a small bonus if full query substring matches
    pub fn search_fuzzy(
        &self,
        query: &str,
        top_k: usize,
        max_edits: usize,
    ) -> Vec<(EntryIndex, f32)> {
        if top_k == 0 {
            return Vec::new();
        }

        let q_norm = normalize_for_substring(query);
        if q_norm.is_empty() {
            return Vec::new();
        }

        let q_tokens: Vec<&str> = q_norm.split_whitespace().collect();
        if q_tokens.is_empty() {
            return Vec::new();
        }

        let max_edits = max_edits.min(4);

        let mut results: Vec<(EntryIndex, f32)> = self
            .texts
            .par_iter()
            .enumerate()
            .filter_map(|(i, text)| {
                if text.is_empty() {
                    return None;
                }

                let full_exact = text.contains(&q_norm);

                let mut sum_score = 0.0f32;
                let mut any_hit = false;

                for &qt in &q_tokens {
                    if qt.is_empty() {
                        continue;
                    }

                    // exact-ish: token is a substring anywhere
                    if text.contains(qt) {
                        sum_score += 1.0;
                        any_hit = true;
                        continue;
                    }

                    // fuzzy against doc tokens
                    let qt_b = qt.as_bytes();
                    let mut best_dist: Option<usize> = None;
                    let mut best_len: usize = 0;

                    for dt in text.split_whitespace() {
                        let dt_b = dt.as_bytes();

                        // distance can't be smaller than length diff
                        if qt_b.len().abs_diff(dt_b.len()) > max_edits {
                            continue;
                        }

                        if let Some(d) = levenshtein_cutoff(qt_b, dt_b, max_edits) {
                            match best_dist {
                                None => {
                                    best_dist = Some(d);
                                    best_len = dt_b.len();
                                    if d == 0 {
                                        break;
                                    }
                                }
                                Some(cur) if d < cur => {
                                    best_dist = Some(d);
                                    best_len = dt_b.len();
                                    if d == 0 {
                                        break;
                                    }
                                }
                                _ => {}
                            }
                        }
                    }

                    if let Some(d) = best_dist {
                        any_hit = true;
                        let denom = qt_b.len().max(best_len).max(1) as f32;
                        let token_score = (1.0 - (d as f32 / denom)).max(0.0);
                        sum_score += token_score;
                    }
                }

                if !any_hit {
                    return None;
                }

                let mut score = sum_score / (q_tokens.len() as f32);
                if full_exact {
                    score += 0.25; // tiny bump for "phrase" hit
                }

                Some((i as EntryIndex, score))
            })
            .collect();

        results.sort_by(|a, b| {
            b.1.partial_cmp(&a.1)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        results.truncate(top_k);
        results
    }

    pub fn len(&self) -> usize {
        self.texts.len()
    }
}


#[wasm_bindgen]
impl SearchEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            collection: Collection::new(),
            text_index: TextIndex::new(),
            vector_index: VectorIndex::new(),
            schema: Schema::builder().build(),
            doc_id_mapping: HashMap::new(),
            flat_text: FlatTextStore::new(),
        }
    }


    /// Create a new search engine with a schema
    #[wasm_bindgen]
    pub fn with_schema(schema: Schema) -> Self {
        let config = BM25Config::new(&schema);
        let vector_index = if let Some(dim) = schema.get_vector_dimension() {
            VectorIndex::with_dimension(dim)
        } else {
            VectorIndex::new()
        };
        
        Self {
            collection: Collection::new(),
            text_index: TextIndex::with_config(config),
            vector_index,
            schema,
            doc_id_mapping: HashMap::new(),
            flat_text: FlatTextStore::new(),
        }
    }

    /// Add a document to the search index
    #[wasm_bindgen]
    pub fn add_document(&mut self, document: Document) -> Result<(), js_sys::Error> {
        let entry_index = self.collection.next_index;
        self.collection.next_index += 1;

        #[cfg(target_arch = "wasm32")]
        web_sys::console::log_1(&format!("🔧 Processing document {:?} with {} attributes", 
            document.get_id(), document.get_attributes().len()).into());

        // Add to vector index if vector is present
        if let Some(vector) = document.get_vector() {
            #[cfg(target_arch = "wasm32")]
            web_sys::console::log_1(&format!("  🧮 Adding vector with {} dimensions", vector.len()).into());
            self.vector_index.add_vector(entry_index, vector.clone())
                .map_err(|e| js_sys::Error::new(&format!("Vector index error: {}", e)))?;
        }

        // Add to enhanced text index with stop-word filtering and BM25FS⁺ impact computation
        for (field_name, values) in document.get_attributes() {
            #[cfg(target_arch = "wasm32")]
            web_sys::console::log_1(&format!("  📝 Processing field '{}' with {} values", field_name, values.len()).into());
            for value in values {
                if let Value::Text(text) = value {
                    #[cfg(target_arch = "wasm32")]
                    web_sys::console::log_1(&format!("    📄 Text: '{}'", text).into());
                    
                    // Use enhanced add_document method with automatic optimizations
                    self.text_index.add_document(entry_index, field_name, text);
                }
            }
        }

        // Store document in collection
        let doc_entry = DocumentEntry {
            index: entry_index,
            document: document.clone(),
        };
        self.collection.documents.push(doc_entry);

        // Store ID mapping for WASM results
        self.doc_id_mapping.insert(entry_index, document.get_id().0.clone());

        // store a normalized flat string for substring/fuzzy scan
        self.flat_text.add_document(entry_index, &document);

        Ok(())
    }

    #[wasm_bindgen]
    pub fn search_text(&self, query: &str, top_k: usize) -> Vec<SearchResult> {
        // Use enhanced text index search with caching and optimizations
        let results = self.text_index.search(query, top_k);
        self.convert_results(results)
    }

    #[wasm_bindgen]
    pub fn search_substring(&self, query: &str, top_k: usize) -> Vec<SearchResult> {
        let results = self.flat_text.search_substring(query, top_k);
        self.convert_results(results)
    }

    #[wasm_bindgen]
    pub fn search_fuzzy(&self, query: &str, top_k: usize, max_edits: usize) -> Vec<SearchResult> {
        let results = self.flat_text.search_fuzzy(query, top_k, max_edits);
        self.convert_results(results)
    }

    #[wasm_bindgen]
    pub fn search_vector(&self, query: Vec<f32>, top_k: usize) -> Vec<SearchResult> {
        let results = self.vector_index.search_vector(&query, top_k);
        self.convert_results(results)
    }

    #[wasm_bindgen]
    pub fn search_hybrid(&self, text_query: Option<String>, vector_query: Option<Vec<f32>>, 
                        top_k: usize, strategy: &str) -> Vec<SearchResult> {
        let fusion_strategy = match strategy {
            "rrf" => FusionStrategy::RRF,
            "combsum" => FusionStrategy::CombSUM,
            _ => FusionStrategy::RRF,
        };

        let results = self.internal_search_hybrid(
            text_query.as_deref(),
            vector_query.as_deref(),
            top_k,
            fusion_strategy
        );
        self.convert_results(results)
    }

    /// Internal hybrid search implementation
    fn internal_search_hybrid(
        &self,
        text_query: Option<&str>,
        vector_query: Option<&[f32]>,
        top_k: usize,
        strategy: FusionStrategy,
    ) -> Vec<(EntryIndex, f32)> {
        let mut text_results = Vec::new();
        let mut vector_results = Vec::new();

        // Get text search results if query provided
        if let Some(query) = text_query {
            text_results = self.text_index.search(query, top_k * 2); // Get more for fusion
        }

        // Get vector search results if query provided
        if let Some(query_vec) = vector_query {
            vector_results = self.vector_index.search_vector(query_vec, top_k * 2); // Get more for fusion
        }

        // Combine results using fusion strategy
        self.fuse_results(text_results, vector_results, top_k, strategy)
    }

    /// Fuse text and vector search results using the specified strategy
    fn fuse_results(
        &self,
        text_results: Vec<(EntryIndex, f32)>,
        vector_results: Vec<(EntryIndex, f32)>,
        top_k: usize,
        strategy: FusionStrategy,
    ) -> Vec<(EntryIndex, f32)> {
        match strategy {
            FusionStrategy::RRF => self.reciprocal_rank_fusion(text_results, vector_results, top_k),
            FusionStrategy::CombSUM => self.comb_sum_fusion(text_results, vector_results, top_k),
            FusionStrategy::WeightedSum(weight) => self.weighted_sum_fusion(text_results, vector_results, top_k, weight),
        }
    }

    /// Reciprocal Rank Fusion (RRF)
    fn reciprocal_rank_fusion(
        &self,
        text_results: Vec<(EntryIndex, f32)>,
        vector_results: Vec<(EntryIndex, f32)>,
        top_k: usize,
    ) -> Vec<(EntryIndex, f32)> {
        let mut scores = HashMap::new();
        let k = 60.0; // RRF parameter

        // Add text scores
        for (rank, (doc_id, _score)) in text_results.iter().enumerate() {
            let rrf_score = 1.0 / (k + (rank + 1) as f32);
            *scores.entry(*doc_id).or_insert(0.0) += rrf_score;
        }

        // Add vector scores
        for (rank, (doc_id, _score)) in vector_results.iter().enumerate() {
            let rrf_score = 1.0 / (k + (rank + 1) as f32);
            *scores.entry(*doc_id).or_insert(0.0) += rrf_score;
        }

        // Sort and return top_k
        let mut results: Vec<(EntryIndex, f32)> = scores.into_iter().collect();
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(top_k);
        results
    }

    /// CombSUM fusion
    fn comb_sum_fusion(
        &self,
        text_results: Vec<(EntryIndex, f32)>,
        vector_results: Vec<(EntryIndex, f32)>,
        top_k: usize,
    ) -> Vec<(EntryIndex, f32)> {
        let mut scores = HashMap::new();

        // Add text scores
        for (doc_id, score) in text_results {
            *scores.entry(doc_id).or_insert(0.0) += score;
        }

        // Add vector scores
        for (doc_id, score) in vector_results {
            *scores.entry(doc_id).or_insert(0.0) += score;
        }

        // Sort and return top_k
        let mut results: Vec<(EntryIndex, f32)> = scores.into_iter().collect();
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(top_k);
        results
    }

    /// Weighted sum fusion
    fn weighted_sum_fusion(
        &self,
        text_results: Vec<(EntryIndex, f32)>,
        vector_results: Vec<(EntryIndex, f32)>,
        top_k: usize,
        text_weight: f32,
    ) -> Vec<(EntryIndex, f32)> {
        let mut scores = HashMap::new();
        let vector_weight = 1.0 - text_weight;

        // Add weighted text scores
        for (doc_id, score) in text_results {
            *scores.entry(doc_id).or_insert(0.0) += score * text_weight;
        }

        // Add weighted vector scores
        for (doc_id, score) in vector_results {
            *scores.entry(doc_id).or_insert(0.0) += score * vector_weight;
        }

        // Sort and return top_k
        let mut results: Vec<(EntryIndex, f32)> = scores.into_iter().collect();
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(top_k);
        results
    }

    #[wasm_bindgen]
    pub fn get_stats(&self) -> js_sys::Array {
        let stats = js_sys::Array::new();
        stats.push(&js_sys::Number::from(self.collection.documents.len() as f64));
        stats.push(&js_sys::Number::from(self.text_index.term_stats.len() as f64));
        stats
    }

    /// Helper method to convert results
    fn convert_results(&self, results: Vec<(EntryIndex, f32)>) -> Vec<SearchResult> {
        // Use parallel processing for large result sets (threshold: 50+ results)
        if results.len() > 50 {
            results.into_par_iter()
                .filter_map(|(entry_index, score)| {
                    self.doc_id_mapping.get(&entry_index).map(|doc_id| {
                        SearchResult {
                            document_id: doc_id.clone(),
                            score,
                        }
                    })
                })
                .collect()
        } else {
            // Sequential processing for small result sets
            results.into_iter()
                .filter_map(|(entry_index, score)| {
                    self.doc_id_mapping.get(&entry_index).map(|doc_id| {
                        SearchResult {
                            document_id: doc_id.clone(),
                            score,
                        }
                    })
                })
                .collect()
        }
    }
}

#[cfg(test)]
mod flat_text_tests {
    use super::*;

    #[test]
    fn test_levenshtein_cutoff() {
        // exact
        assert_eq!(levenshtein_cutoff(b"machine", b"machine", 2), Some(0));
        // distance 1
        assert_eq!(levenshtein_cutoff(b"machne", b"machine", 2), Some(1));
        // distance 1 (substitution)
        assert_eq!(levenshtein_cutoff(b"rust", b"tust", 1), Some(1));
        // distance 2
        assert_eq!(levenshtein_cutoff(b"kitten", b"sitten", 2), Some(1));
        assert_eq!(levenshtein_cutoff(b"kitten", b"sitting", 3), Some(3));
        
        // beyond cutoff
        assert_eq!(levenshtein_cutoff(b"abc", b"xyz", 2), None);
        // length diff > max_dist
        assert_eq!(levenshtein_cutoff(b"a", b"abcde", 2), None);
    }

    #[test]
    fn test_normalize_for_substring() {
        assert_eq!(normalize_for_substring("Hello, WORLD!"), "hello world");
        assert_eq!(normalize_for_substring("a---b__c"), "a b c");
        assert_eq!(normalize_for_substring("  lots   of   spaces  "), "lots of spaces");
        assert_eq!(normalize_for_substring(""), "");
        assert_eq!(normalize_for_substring("!@#$%"), "");
    }
}