use wasm_bindgen::prelude::*;
use std::collections::{HashMap, HashSet};
use stop_words::{get, LANGUAGE as StopWordsLanguage};
use rust_stemmers::{Algorithm, Stemmer};


use rayon::prelude::*;
use std::sync::Mutex;

/// Global memory pool for reusing allocations - INTELLIGENT REUSE
static MEMORY_POOL: Mutex<Option<Vec<f32>>> = Mutex::new(None);
const MAX_POOL_SIZE: usize = 10_000_000; // 10M f32s = 40MB max pool (reasonable size)
const MIN_POOL_SIZE: usize = 1_000_000; // 1M f32s = 4MB minimum to keep in pool

/// Static configuration for performance tuning
const L1_CACHE_SIZE: usize = 32 * 1024;  // 32KB typical L1 cache


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

            similarities.push((self.doc_mapping[i], similarity));
        }

        // Sort by similarity (descending) and return top_k
        similarities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        similarities.truncate(top_k);
        
        #[cfg(target_arch = "wasm32")]
        web_sys::console::log_1(&format!("✅ Vector search returning {} results", similarities.len()).into());
        similarities
    }
}

/// Simple text index
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

        // Add to text index
        let mut total_tokens = 0;
        for (field_name, values) in document.get_attributes() {
            #[cfg(target_arch = "wasm32")]
            web_sys::console::log_1(&format!("  📝 Processing field '{}' with {} values", field_name, values.len()).into());
            for value in values {
                if let Value::Text(text) = value {
                    #[cfg(target_arch = "wasm32")]
                    web_sys::console::log_1(&format!("    📄 Text: '{}'", text).into());
                    let tokens = self.text_index.processor.process_text(text);
                    #[cfg(target_arch = "wasm32")]
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

        #[cfg(target_arch = "wasm32")]
        web_sys::console::log_1(&format!("  ✅ Indexed {} total tokens", total_tokens).into());

        // Store document in collection
        let doc_entry = DocumentEntry {
            index: entry_index,
            document: document.clone(),
        };
        self.collection.documents.push(doc_entry);

        // Store ID mapping for WASM results
        self.doc_id_mapping.insert(entry_index, document.get_id().0.clone());

        Ok(())
    }

    #[wasm_bindgen]
    pub fn search_text(&self, query: &str, top_k: usize) -> Vec<SearchResult> {
        let results = self.internal_search_text(query, top_k);
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

        let text_ref = text_query.as_ref().map(|s| s.as_str());
        let vector_ref = vector_query.as_ref().map(|v| v.as_slice());

        let results = self.internal_search_hybrid(text_ref, vector_ref, top_k, fusion_strategy);
        self.convert_results(results)
    }

    #[wasm_bindgen]
    pub fn get_stats(&self) -> js_sys::Array {
        let stats = js_sys::Array::new();
        stats.push(&js_sys::Number::from(self.collection.documents.len() as f64));
        stats.push(&js_sys::Number::from(self.text_index.term_stats.len() as f64));
        stats
    }

    // Helper method to convert results
    fn convert_results(&self, results: Vec<(EntryIndex, f32)>) -> Vec<SearchResult> {
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

    /// Internal text-only search using BM25
    fn internal_search_text(&self, query: &str, top_k: usize) -> Vec<(EntryIndex, f32)> {
        #[cfg(target_arch = "wasm32")]
        web_sys::console::log_1(&format!("🔍 Text search for: '{}'", query).into());
        
        let query_tokens = self.text_index.processor.process_text(query);
        #[cfg(target_arch = "wasm32")]
        web_sys::console::log_1(&format!("  🔤 Query tokens: {} ({:?})", query_tokens.len(), 
            query_tokens.iter().map(|t| &t.text).collect::<Vec<_>>()).into());
        
        if query_tokens.is_empty() {
            #[cfg(target_arch = "wasm32")]
            web_sys::console::log_1(&"  ❌ No valid query tokens".into());
            return Vec::new();
        }

        let mut scores: HashMap<EntryIndex, f32> = HashMap::new();

        for token in query_tokens {
            #[cfg(target_arch = "wasm32")]
            web_sys::console::log_1(&format!("    🔍 Looking for token: '{}'", token.text).into());
            
            if let Some(postings) = self.text_index.inverted_index.get(&token.text) {
                let doc_freq = postings.len() as f32;
                let total_docs = self.collection.documents.len() as f32;
                let idf = (total_docs / doc_freq).ln();
                
                #[cfg(target_arch = "wasm32")]
                web_sys::console::log_1(&format!("      📊 Found in {} docs, IDF: {:.3}", doc_freq, idf).into());

                for (doc_idx, positions) in postings {
                    let tf = positions.len() as f32;
                    let score = tf * idf;
                    *scores.entry(*doc_idx).or_insert(0.0) += score;
                    #[cfg(target_arch = "wasm32")]
                    web_sys::console::log_1(&format!("        📈 Doc {}: TF={}, Score={:.3}", doc_idx, tf, score).into());
                }
            } else {
                #[cfg(target_arch = "wasm32")]
                web_sys::console::log_1(&format!("      ❌ Token '{}' not found in index", token.text).into());
            }
        }

        #[cfg(target_arch = "wasm32")]
        web_sys::console::log_1(&format!("  📊 Total matching documents: {}", scores.len()).into());

        let mut results: Vec<(EntryIndex, f32)> = scores.into_iter().collect();
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(top_k);
        
        #[cfg(target_arch = "wasm32")]
        web_sys::console::log_1(&format!("  ✅ Returning {} results", results.len()).into());
        results
    }

    /// Internal hybrid search combining text and vector results
    fn internal_search_hybrid(&self, text_query: Option<&str>, vector_query: Option<&[f32]>, 
                        top_k: usize, strategy: FusionStrategy) -> Vec<(EntryIndex, f32)> {
        let text_results = if let Some(query) = text_query {
            self.internal_search_text(query, top_k * 2) // Get more candidates for fusion
        } else {
            Vec::new()
        };

        let vector_results = if let Some(query) = vector_query {
            self.vector_index.search_vector(query, top_k * 2) // Get more candidates for fusion
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kind_weights() {
        assert_eq!(Kind::TITLE.weights(), (2.5, 0.75));
        assert_eq!(Kind::CONTENT.weights(), (1.0, 0.75));
        assert_eq!(Kind::DESCRIPTION.weights(), (1.5, 0.75));
        assert_eq!(Kind::HEADING.weights(), (2.0, 0.75));
        assert_eq!(Kind::TAGS.weights(), (1.8, 0.5));
        assert_eq!(Kind::AUTHOR.weights(), (1.2, 0.6));
        assert_eq!(Kind::DATE.weights(), (0.8, 0.5));
        assert_eq!(Kind::REFERENCE.weights(), (0.6, 0.5));
        assert_eq!(Kind::TEXT.weights(), (1.0, 0.75));
    }

    #[test]
    fn test_schema_builder_api() {
        let schema = Schema::builder()
            .attribute("title", Kind::TITLE)
            .attribute("content", Kind::CONTENT)
            .attribute("categories", Kind::TAGS)
            .build();

        assert_eq!(schema.field_count(), 3);

        let field_weights = schema.get_field_weights();
        
        let title_weight = field_weights.get("title").unwrap();
        assert_eq!(title_weight.weight, 2.5);
        assert_eq!(title_weight.b, 0.75);
        assert_eq!(title_weight.kind, Kind::TITLE);

        let content_weight = field_weights.get("content").unwrap();
        assert_eq!(content_weight.weight, 1.0);
        assert_eq!(content_weight.b, 0.75);
        assert_eq!(content_weight.kind, Kind::CONTENT);

        let tags_weight = field_weights.get("categories").unwrap();
        assert_eq!(tags_weight.weight, 1.8);
        assert_eq!(tags_weight.b, 0.5);
        assert_eq!(tags_weight.kind, Kind::TAGS);
    }

    #[test]
    fn test_document_builder_api() {
        let doc = Document::new("doc1")
            .attribute("title", "Machine Learning with Rust")
            .attribute("content", "Learn how to build ML models using Rust...")
            .with_vector(vec![1.0, 2.0, 3.0]);

        assert_eq!(doc.get_id().0, "doc1");
        assert_eq!(doc.get_attributes().len(), 2);
        assert!(doc.get_vector().is_some());
        assert_eq!(doc.get_vector().unwrap().len(), 3);

        let title_values = doc.get_attributes().get("title").unwrap();
        assert_eq!(title_values.len(), 1);
        if let Value::Text(text) = &title_values[0] {
            assert_eq!(text, "Machine Learning with Rust");
        } else {
            panic!("Expected text value");
        }
    }

    #[test]
    fn test_search_engine_with_schema() {
        let schema = Schema::builder()
            .attribute("title", Kind::TITLE)
            .attribute("content", Kind::CONTENT)
            .build();

        let mut engine = SearchEngine::with_schema(schema);

        assert_eq!(engine.schema.field_count(), 2);

        let doc = Document::new("test_doc")
            .attribute("title", "Test Document")
            .attribute("content", "This is test content");

        let result = engine.add_document(doc);
        assert!(result.is_ok());
        assert!(engine.collection.documents.len() > 0);
    }

    #[test]
    fn test_custom_weights() {
        let schema = Schema::builder()
            .attribute("title", Kind::TITLE)
            .attribute_with_weight("special_field", Kind::TEXT, 3.0, Some(0.8))
            .build();

        let field_weights = schema.get_field_weights();
        
        let special_weight = field_weights.get("special_field").unwrap();
        assert_eq!(special_weight.weight, 3.0);
        assert_eq!(special_weight.b, 0.8);
        assert_eq!(special_weight.kind, Kind::TEXT);
    }

    #[test]
    fn test_readme_examples() {
        // Test the exact example from README
        let schema = Schema::builder()
            .attribute("title", Kind::TITLE)        // Weight: 2.5, b: 0.75
            .attribute("content", Kind::CONTENT)    // Weight: 1.0, b: 0.75
            .attribute("categories", Kind::TAGS)    // Weight: 1.8, b: 0.5
            .build();

        // Create hybrid search engine
        let mut engine = SearchEngine::with_schema(schema);

        // Add documents with optional vector embeddings
        let embedding_vector = vec![0.1, 0.2, 0.3, 0.4, 0.5]; // Example vector
        let doc = Document::new("doc1")
            .attribute("title", "Machine Learning with Rust")
            .attribute("content", "Learn how to build ML models using Rust...")
            .with_vector(embedding_vector);

        let result = engine.add_document(doc);
        assert!(result.is_ok());

        // Add more test documents
        let doc2 = Document::new("doc2")
            .attribute("title", "Python for Data Science")
            .attribute("content", "Master data science with Python libraries...")
            .with_vector(vec![0.2, 0.1, 0.4, 0.3, 0.6]);

        engine.add_document(doc2).unwrap();

        let doc3 = Document::new("doc3")
            .attribute("title", "Rust Programming Guide")
            .attribute("content", "Complete guide to Rust programming language...")
            .with_vector(vec![0.3, 0.4, 0.1, 0.5, 0.2]);

        engine.add_document(doc3).unwrap();

        // Test text-only search
        let text_results = engine.search_text("machine learning", 10);
        assert!(!text_results.is_empty());
        assert_eq!(text_results[0].document_id, "doc1"); // Should find the ML document first

        // Test vector-only search
        let query_vector = vec![0.1, 0.2, 0.3, 0.4, 0.5]; // Similar to doc1's vector
        let vector_results = engine.search_vector(query_vector.clone(), 10);
        assert!(!vector_results.is_empty());

        // Test hybrid search
        let hybrid_results = engine.search_hybrid(
            Some("machine learning rust".to_string()),  // Text query
            Some(query_vector),                         // Vector query  
            10,                                        // Top-k results
            "rrf"                                      // Strategy
        );
        assert!(!hybrid_results.is_empty());
        
        // Should find relevant results
        let result_ids: Vec<String> = hybrid_results.iter()
            .map(|r| r.document_id.clone())
            .collect();
        assert!(result_ids.contains(&"doc1".to_string()));

        // Verify we have the expected number of documents in the engine
        assert_eq!(engine.collection.documents.len(), 3);
        assert!(engine.text_index.term_stats.len() > 0);
    }
}
