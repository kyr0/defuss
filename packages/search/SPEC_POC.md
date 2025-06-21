# `defuss-search` - Hybrid Text & Vector Search POC

This document describes a **proof-of-concept implementation** of a hybrid search engine focusing on **TextIndex** and **VectorIndex** components for in-browser use cases. This POC maintains full compatibility with the complete specification for future enhancements.

## Core Architecture

The engine is designed for **≤ 100,000 documents** with optional vector embeddings, using flattened document lists for cache efficiency and SIMD-optimized vector operations.

### Performance Philosophy

- **Flattened Document Lists**: Cache-linear `Vec<DocumentEntry>` instead of nested maps
- **Numeric Indirection**: Document and attribute indices minimize memory overhead  
- **Arena Allocation**: Bump allocators eliminate allocation overhead during queries
- **SIMD Vector Operations**: 4x parallelized f32 operations for vector search
- **Early-Exit Optimization**: Stop processing when remaining candidates can't improve top-k

### Micro-Optimizations for 100k Document Workloads

| Optimization | Implementation | Performance Benefit |
|--------------|----------------|-------------------|
| **Stop-list at ingest** | Hard-coded `&["the", "and", ...]` slice with `continue` on match | Eliminates ~15% of documents, speeds every subsequent query |
| **Query-term de-dupe** | `query_terms.sort_unstable(); query_terms.dedup();` before lookup | Skips scoring identical words in natural-language queries |
| **Early-exit top-k** | Stop merging when `heap.peek().score ≥ max_possible_remaining_score` | Saves 20-30% dot-products when k ≪ N with no accuracy loss |
| **Static doc-length-norm** | Pre-store `1 / (k1·(1-b+b·len/avg)+tf)` beside each impact | Multiplication replaces division per document (measurable in WASM/JS) |
| **Per-term Bloom filter** | 256-bit Bloom key: "does this term appear in any doc?" | Aborts term lookup immediately for zero-hit words (typos) with <1% false positive rate |
| **Tiny LRU cache** | `LruCache<String, Vec<(Doc,Score)>>` for last 32 queries | Real-world UIs repeat queries (autocomplete); cache hits return in μs |

## Type System & Schema

### Core Types

```rust
/// Represents the possible data types that can be indexed
enum Kind {
    /// Single tokens that require exact matching (e.g. email addresses, IDs)
    Tag,
    /// Full-text content that will be tokenized and stemmed
    Text,
}

/// A value that can be indexed
enum Value {
    Tag(String),
    Text(String),
}

/// Defines the structure and rules for indexable documents
struct Schema {
    attributes: HashMap<String, Kind>,
}

impl Schema {
    pub fn builder() -> SchemaBuilder {
        SchemaBuilder::default()
    }
}

#[derive(Default)]
struct SchemaBuilder {
    attributes: HashMap<String, Kind>,
}

impl SchemaBuilder {
    pub fn attribute(mut self, name: impl Into<String>, kind: Kind) -> Self {
        self.attributes.insert(name.into(), kind);
        self
    }

    pub fn build(self) -> Schema {
        Schema {
            attributes: self.attributes,
        }
    }
}
```

### Document Structure

```rust
/// Represents a document to be indexed
struct Document {
    /// Unique identifier for the document
    id: DocumentId,
    /// Maps attribute names to their values
    attributes: HashMap<Box<str>, Vec<Value>>,
    /// Optional vector embedding (separate from attributes)
    vector: Option<Vec<f32>>,
}

impl Document {
    pub fn new(id: impl AsRef<str>) -> Self {
        Self {
            id: DocumentId(id.as_ref().into()),
            attributes: Default::default(),
            vector: None,
        }
    }

    pub fn attribute(mut self, name: impl AsRef<str>, value: impl Into<Value>) -> Self {
        self.attributes.entry(name.as_ref().into()).or_default().push(value.into());
        self
    }

    pub fn with_vector(mut self, vector: Vec<f32>) -> Self {
        self.vector = Some(vector);
        self
    }
}
```

### Strongly-Typed Identifiers

```rust
/// Strongly-typed document identifier
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct DocumentId(Arc<str>);

/// Numeric index for documents within the collection
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
struct EntryIndex(u32);

/// Numeric index for attributes (limited to 255 for memory efficiency)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
struct AttributeIndex(u8);

/// Index within a multi-value attribute (supports up to 255 values per attribute)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
struct ValueIndex(u8);

/// Position of token within text (token-based, not byte-based for UTF-8 safety)
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
struct Position(u32);

/// Index of token within processed text (same unit as Position for consistency)
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
struct TokenIndex(u16);
```

### Flattened Document Entry

```rust
/// Flattened document entry with all indexing information
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
struct DocumentEntry {
    /// Document identifier (primary sort key)
    doc: EntryIndex,
    /// Attribute identifier (secondary sort key)
    attr: AttributeIndex,
    /// Value position within attribute (tertiary sort key)
    val: ValueIndex,
    /// Pre-computed BM25 impact score
    impact: f32,
}

impl DocumentEntry {
    fn new(doc: EntryIndex, attr: AttributeIndex, val: ValueIndex, impact: f32) -> Self {
        Self { doc, attr, val, impact }
    }
}
```

## FlexibleCollection Implementation

```rust
/// Enhanced collection with dynamic attribute registration
struct FlexibleCollection {
    /// Document mappings (single index, no splitting)
    entries_by_index: HashMap<EntryIndex, DocumentId>,
    entries_by_name: HashMap<DocumentId, EntryIndex>,
    /// Dynamic attribute registration (append-only)
    attributes_by_name: HashMap<Box<str>, AttributeIndex>,
    attributes_by_index: HashMap<AttributeIndex, Box<str>>,
    /// Type information inferred at first encounter
    attribute_kinds: HashMap<AttributeIndex, Kind>,
    /// Document count tracking
    document_count: usize,
}

impl FlexibleCollection {
    const MAX_DOCUMENTS: usize = 100_000;
    const MAX_ATTRIBUTES: usize = 255;
    const MAX_VALUES_PER_ATTRIBUTE: usize = 255;
    
    fn new() -> Self {
        Self {
            entries_by_index: HashMap::with_capacity(Self::MAX_DOCUMENTS),
            entries_by_name: HashMap::with_capacity(Self::MAX_DOCUMENTS),
            attributes_by_name: HashMap::with_capacity(Self::MAX_ATTRIBUTES),
            attributes_by_index: HashMap::with_capacity(Self::MAX_ATTRIBUTES),
            attribute_kinds: HashMap::with_capacity(Self::MAX_ATTRIBUTES),
            document_count: 0,
        }
    }
    
    /// Lazy attribute registration with kind inference
    fn register_attribute_if_needed(&mut self, name: &str, value: &Value) -> Result<AttributeIndex, IndexError> {
        // Check if attribute already exists
        if let Some(&attr_idx) = self.attributes_by_name.get(name) {
            // Verify type compatibility
            let inferred_kind = Self::infer_kind(value);
            if let Some(&existing_kind) = self.attribute_kinds.get(&attr_idx) {
                if existing_kind != inferred_kind {
                    return Err(IndexError::TypeMismatch(existing_kind, inferred_kind));
                }
            }
            return Ok(attr_idx);
        }
        
        // Register new attribute
        if self.attributes_by_name.len() >= Self::MAX_ATTRIBUTES {
            return Err(IndexError::AttributeCapacityExceeded);
        }
        
        let new_id = self.attributes_by_name.len() as u8;
        let attr_idx = AttributeIndex(new_id);
        let name_box: Box<str> = name.into();
        let inferred_kind = Self::infer_kind(value);
        
        self.attributes_by_name.insert(name_box.clone(), attr_idx);
        self.attributes_by_index.insert(attr_idx, name_box);
        self.attribute_kinds.insert(attr_idx, inferred_kind);
        
        Ok(attr_idx)
    }
    
    /// Simple type inference from first value encountered
    fn infer_kind(value: &Value) -> Kind {
        match value {
            Value::Tag(s) if s.len() <= 32 => Kind::Tag,
            Value::Tag(_) | Value::Text(_) => Kind::Text,
        }
    }
    
    /// Get attribute index with lazy registration
    fn get_or_register_attribute(&mut self, name: &str, value: &Value) -> Result<AttributeIndex, IndexError> {
        self.register_attribute_if_needed(name, value)
    }
    
    /// Lookup attribute index (returns None for unknown fields)
    fn get_attribute_index(&self, name: &str) -> Option<AttributeIndex> {
        self.attributes_by_name.get(name).copied()
    }
    
    /// Get attribute kind for validation
    fn get_attribute_kind(&self, attr_idx: AttributeIndex) -> Option<Kind> {
        self.attribute_kinds.get(&attr_idx).copied()
    }
}

#[derive(Debug)]
enum IndexError {
    CapacityExceeded,
    AttributeCapacityExceeded,
    ValueCapacityExceeded,
    DocumentNotFound,
    TypeMismatch(Kind, Kind),
    VectorDimensionMismatch,
    VectorNotNormalized,
}
```

## TextIndex Implementation

### Core Text Index Structure

```rust
/// Extended document structure for text index with position information
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
struct TextDocumentEntry {
    /// Document identifier (primary sort key)
    doc: EntryIndex,
    /// Attribute identifier (secondary sort key)  
    attr: AttributeIndex,
    /// Value position within attribute (tertiary sort key)
    val: ValueIndex,
    /// Token index within the text (for phrase queries) - same unit as position
    token_idx: TokenIndex,
    /// Token position in text sequence (token-based, not byte-based for UTF-8 safety)
    position: Position,
    /// Pre-computed BM25 impact score
    impact: f32,
}

impl TextDocumentEntry {
    fn new(
        doc: EntryIndex, 
        attr: AttributeIndex, 
        val: ValueIndex,
        token_idx: TokenIndex,
        position: Position,
        impact: f32
    ) -> Self {
        Self { doc, attr, val, token_idx, position, impact }
    }
}

/// Text index using flattened document lists with position information
struct TextIndex {
    /// Maps terms to sorted vectors of TextDocumentEntry entries
    /// Each term -> Vec<TextDocumentEntry> sorted by (doc, attr, val, token_idx)
    document_lists: HashMap<Box<str>, Vec<TextDocumentEntry>>,
    /// Bigram index for fuzzy search acceleration
    bigram_index: BigramFuzzyIndex,
    /// Trie structure for prefix searches (StartsWith)
    trie_index: TrieNode,
    /// Bloom filter for fast negative lookups
    bloom_filter: BloomFilter,
}

impl TextIndex {
    fn new() -> Self {
        Self {
            document_lists: HashMap::new(),
            bigram_index: BigramFuzzyIndex::new(),
            trie_index: TrieNode::default(),
            bloom_filter: BloomFilter::new(),
        }
    }
    
    /// Insert a term with position information
    fn insert(
        &mut self,
        entry_index: EntryIndex,
        attribute_index: AttributeIndex,
        value_index: ValueIndex,
        term: &str,
        token_index: TokenIndex,
        position: Position,
        impact: f32,
    ) -> bool {
        let text_doc = TextDocumentEntry::new(
            entry_index, attribute_index, value_index, 
            token_index, position, impact
        );
        
        let document_list = self.document_lists.entry(term.into()).or_default();
        
        // Binary search for insertion point to maintain sort order
        let pos = document_list.binary_search(&text_doc).unwrap_or_else(|e| e);
        document_list.insert(pos, text_doc);
        
        // Update supporting indexes
        self.bigram_index.add_term(term);
        self.insert_to_trie(term);
        self.bloom_filter.add_term(term);
        
        true
    }
    
    /// Insert a term into the trie for prefix searches
    fn insert_to_trie(&mut self, term: &str) {
        let term_arc: Arc<str> = term.into();
        let mut current = &mut self.trie_index;
        
        for ch in term.chars() {
            current = current.children.entry(ch).or_default();
        }
        
        current.term = Some(term_arc);
    }
    
    /// Search for exact term matches
    fn search_exact(&self, term: &str, attribute: Option<AttributeIndex>) -> Vec<EntryIndex> {
        // Fast negative lookup using bloom filter
        if !self.bloom_filter.might_contain(term) {
            return Vec::new();
        }
        
        let Some(document_list) = self.document_lists.get(term) else {
            return Vec::new();
        };
        
        match attribute {
            Some(attr) => {
                document_list.iter()
                    .filter(|doc| doc.attr == attr)
                    .map(|doc| doc.doc)
                    .collect()
            }
            None => {
                document_list.iter()
                    .map(|doc| doc.doc)
                    .collect()
            }
        }
    }
    
    /// Search for terms with a given prefix
    fn search_prefix(&self, prefix: &str, attribute: Option<AttributeIndex>) -> Vec<EntryIndex> {
        let found_node = self.trie_index.find_starts_with(prefix.chars())?;
        let mut results = Vec::new();
        
        for term in found_node.iter_terms() {
            results.extend(self.search_exact(&term, attribute));
        }
        
        results.sort_unstable();
        results.dedup();
        results
    }
    
    /// Fuzzy search using bigram pre-filtering
    fn search_fuzzy(&self, query: &str, attribute: Option<AttributeIndex>, max_results: usize) -> Vec<(EntryIndex, f32)> {
        let fuzzy_results = self.bigram_index.fuzzy_search(query, max_results);
        let mut scored_results = Vec::new();
        
        for (term, similarity_score) in fuzzy_results {
            let docs = self.search_exact(&term, attribute);
            for doc in docs {
                scored_results.push((doc, similarity_score));
            }
        }
        
        // Sort by score and take top results
        scored_results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        scored_results.truncate(max_results);
        scored_results
    }
    
    /// Check if a document contains the terms as a consecutive phrase
    fn search_phrase(&self, terms: &[&str], attribute: Option<AttributeIndex>) -> Vec<EntryIndex> {
        if terms.is_empty() { return Vec::new(); }
        
        // Get all documents that contain the first term
        let candidates = self.search_exact(terms[0], attribute);
        let mut results = Vec::new();
        
        for doc_id in candidates {
            if self.has_phrase_in_document(doc_id, terms, attribute) {
                results.push(doc_id);
            }
        }
        
        results
    }
    
    /// Check if a document contains the terms as a consecutive phrase
    fn has_phrase_in_document(
        &self, 
        doc_id: EntryIndex, 
        terms: &[&str], 
        attribute: Option<AttributeIndex>
    ) -> bool {
        // Get positions for each term in this document
        let mut term_positions: Vec<Vec<Position>> = Vec::new();
        
        for &term in terms {
            if let Some(document_list) = self.document_lists.get(term) {
                let positions: Vec<_> = document_list.iter()
                    .filter(|doc| {
                        doc.doc == doc_id && 
                        attribute.map_or(true, |attr| doc.attr == attr)
                    })
                    .map(|doc| doc.position)
                    .collect();
                    
                if positions.is_empty() {
                    return false; // Term not found in document
                }
                
                term_positions.push(positions);
            } else {
                return false;
            }
        }
        
        // Check for consecutive token sequences using position-based arithmetic
        for start_pos in &term_positions[0] {
            let mut current_position = *start_pos;
            let mut found_phrase = true;
            
            for i in 1..term_positions.len() {
                let expected_position = Position(current_position.0 + 1);
                
                if !term_positions[i].iter().any(|pos| *pos == expected_position) {
                    found_phrase = false;
                    break;
                }
                
                current_position = expected_position;
            }
            
            if found_phrase {
                return true;
            }
        }
        
        false
    }
}
```

### Text Processing

```rust
/// Token processing for text indexing
#[derive(Debug, Clone)]
struct Token {
    term: String,
    index: TokenIndex,
    position: Position,
}

impl TextIndex {
    /// Process text input into tokens for indexing
    fn process_text(input: &str) -> Vec<Token> {
        use regex::Regex;
        
        let word_regex = Regex::new(r"(\w{3,20})").unwrap();
        let mut tokens = Vec::new();
        
        for (token_idx, capture) in word_regex.find_iter(input).enumerate() {
            let term = capture.as_str().to_lowercase();
            
            // Skip stop words to eliminate ~15% of documents
            if Self::STOP_WORDS.contains(&term.as_str()) {
                continue;
            }
            
            // Use token index as position for consistency across phrase matching
            let position = Position(token_idx as u32);
            
            // Apply stemming
            let stemmed = Self::stem_word(&term);
            
            tokens.push(Token {
                term: stemmed,
                index: TokenIndex(token_idx as u16),
                position,
            });
        }
        
        tokens
    }
    
    /// Common English stop words (hard-coded for performance)
    const STOP_WORDS: &'static [&'static str] = &[
        "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
        "a", "an", "is", "are", "was", "were", "be", "been", "have", "has", "had",
        "do", "does", "did", "will", "would", "could", "should", "may", "might",
        "this", "that", "these", "those", "i", "you", "he", "she", "it", "we", "they"
    ];
    
    /// Simple stemming (use rust-stemmers crate in production)
    fn stem_word(word: &str) -> String {
        if word.ends_with("ing") && word.len() > 4 {
            return word[..word.len() - 3].to_string();
        }
        if word.ends_with("ed") && word.len() > 3 {
            return word[..word.len() - 2].to_string();
        }
        if word.ends_with("s") && word.len() > 3 {
            return word[..word.len() - 1].to_string();
        }
        word.to_string()
    }
}
```

### Supporting Indexes

```rust
/// Trie node for prefix search
#[derive(Default)]
struct TrieNode {
    children: BTreeMap<char, TrieNode>,
    term: Option<Arc<str>>,
}

impl TrieNode {
    fn find_starts_with(&self, mut value: std::str::Chars<'_>) -> Option<&TrieNode> {
        match value.next() {
            Some(ch) => self.children.get(&ch)?.find_starts_with(value),
            None => Some(self),
        }
    }
    
    fn iter_terms(&self) -> impl Iterator<Item = &str> {
        TrieNodeTermIterator::new(self)
    }
}

struct TrieNodeTermIterator<'n> {
    queue: VecDeque<&'n TrieNode>,
}

impl<'t> TrieNodeTermIterator<'t> {
    fn new(node: &'t TrieNode) -> Self {
        let mut queue = VecDeque::new();
        queue.push_back(node);
        Self { queue }
    }
}

impl Iterator for TrieNodeTermIterator<'_> {
    type Item = String;
    
    fn next(&mut self) -> Option<Self::Item> {
        while let Some(node) = self.queue.pop_front() {
            // Add child nodes to queue
            for child in node.children.values() {
                self.queue.push_back(child);
            }
            
            // Return term if this node has one
            if let Some(ref term) = node.term {
                return Some(term.to_string());
            }
        }
        None
    }
}

/// Bigram-based fuzzy search with Sørensen-Dice coefficient
struct BigramFuzzyIndex {
    /// Pre-computed bigram sets for all indexed terms
    term_bigrams: HashMap<Box<str>, HashSet<[char; 2]>>,
}

impl BigramFuzzyIndex {
    fn new() -> Self {
        Self {
            term_bigrams: HashMap::new(),
        }
    }
    
    fn add_term(&mut self, term: &str) {
        let term_box: Box<str> = term.into();
        let bigrams = Self::extract_bigrams(term);
        self.term_bigrams.insert(term_box, bigrams);
    }
    
    /// Extract bigrams from a term with start/end markers
    fn extract_bigrams(term: &str) -> HashSet<[char; 2]> {
        let chars: Vec<char> = format!("^{}$", term.to_lowercase()).chars().collect();
        chars.windows(2)
            .map(|window| [window[0], window[1]])
            .collect()
    }
    
    /// Sørensen-Dice coefficient: 2 * |A ∩ B| / (|A| + |B|)
    fn dice_coefficient(set1: &HashSet<[char; 2]>, set2: &HashSet<[char; 2]>) -> f32 {
        if set1.is_empty() && set2.is_empty() { return 1.0; }
        if set1.is_empty() || set2.is_empty() { return 0.0; }
        
        let intersection = set1.intersection(set2).count();
        2.0 * intersection as f32 / (set1.len() + set2.len()) as f32
    }
    
    /// Two-stage fuzzy search: fast Dice pre-filter + precise Levenshtein on top candidates
    fn fuzzy_search(&self, query: &str, max_results: usize) -> Vec<(String, f32)> {
        let query_bigrams = Self::extract_bigrams(query);
        let mut candidates = Vec::new();
        
        // Stage 1: Fast bigram Dice coefficient screening (≥ 0.4 threshold)
        for (term, term_bigrams) in &self.term_bigrams {
            let dice_score = Self::dice_coefficient(&query_bigrams, term_bigrams);
            
            if dice_score >= 0.4 {
                candidates.push((term.clone(), dice_score));
            }
        }
        
        // Sort by Dice score and take top 32 candidates
        candidates.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        candidates.truncate(32);
        
        // Stage 2: Precise Levenshtein filtering on top candidates only
        candidates.into_iter()
            .filter_map(|(term, dice_score)| {
                let edit_distance = levenshtein(query, &term);
                let max_distance = query.len() / 2; // Allow up to 50% edit distance
                
                if edit_distance <= max_distance {
                    Some((term.to_string(), dice_score))
                } else {
                    None
                }
            })
            .take(max_results)
            .collect()
    }
}

/// Simple Bloom filter for term existence
struct BloomFilter {
    bits: Vec<u64>,
    hash_count: u8,
}

impl BloomFilter {
    fn new() -> Self {
        Self {
            bits: vec![0; 4], // 256 bits
            hash_count: 3,
        }
    }
    
    fn add_term(&mut self, term: &str) {
        for i in 0..self.hash_count {
            let hash = self.hash_term(term, i);
            let bit_index = hash % 256;
            let word_index = bit_index / 64;
            let bit_offset = bit_index % 64;
            self.bits[word_index as usize] |= 1u64 << bit_offset;
        }
    }
    
    fn might_contain(&self, term: &str) -> bool {
        for i in 0..self.hash_count {
            let hash = self.hash_term(term, i);
            let bit_index = hash % 256;
            let word_index = bit_index / 64;
            let bit_offset = bit_index % 64;
            if (self.bits[word_index as usize] & (1u64 << bit_offset)) == 0 {
                return false;
            }
        }
        true
    }
    
    fn hash_term(&self, term: &str, seed: u8) -> u64 {
        // Simple hash function (use a proper hash in production)
        let mut hash = seed as u64;
        for byte in term.bytes() {
            hash = hash.wrapping_mul(31).wrapping_add(byte as u64);
        }
        hash
    }
}

/// Optimized Levenshtein distance (only called on top candidates)
fn levenshtein(s1: &str, s2: &str) -> usize {
    let chars1: Vec<char> = s1.chars().collect();
    let chars2: Vec<char> = s2.chars().collect();
    let len1 = chars1.len();
    let len2 = chars2.len();
    
    if len1 == 0 { return len2; }
    if len2 == 0 { return len1; }
    
    let mut prev_row = vec![0; len2 + 1];
    let mut curr_row = vec![0; len2 + 1];
    
    // Initialize first row
    for j in 0..=len2 {
        prev_row[j] = j;
    }
    
    for i in 1..=len1 {
        curr_row[0] = i;
        
        for j in 1..=len2 {
            let cost = if chars1[i-1] == chars2[j-1] { 0 } else { 1 };
            
            curr_row[j] = (prev_row[j] + 1)           // deletion
                .min(curr_row[j-1] + 1)               // insertion
                .min(prev_row[j-1] + cost);           // substitution
        }
        
        std::mem::swap(&mut prev_row, &mut curr_row);
    }
    
    prev_row[len2]
}
```

## VectorIndex Implementation

```rust
/// Flat vector storage optimized for SIMD operations
struct VectorIndex {
    /// Flat vector storage: Structure-of-Arrays for SIMD efficiency
    /// Layout: [doc0_dim0..doc0_dimN, doc1_dim0..doc1_dimN, ...]
    vectors: Vec<f32>,
    /// Maps vector positions to document entries
    entry_mapping: Vec<EntryIndex>,
    /// Configurable dimension (default: 1024, can be 384, 512, 768, 1024, 1536)
    dimension: usize,
    /// Whether vector indexing is enabled
    enabled: bool,
}

impl VectorIndex {
    const DEFAULT_DIMENSION: usize = 1024;
    const MAX_DOCUMENTS: usize = 100_000;
    
    /// Create new vector index with optional configuration
    fn new() -> Self {
        Self::with_dimension(Self::DEFAULT_DIMENSION)
    }
    
    /// Create vector index with specific dimensions (0 = disabled)
    fn with_dimension(dimension: usize) -> Self {
        let enabled = dimension > 0;
        let capacity = if enabled { Self::MAX_DOCUMENTS * dimension } else { 0 };
        
        Self {
            vectors: Vec::with_capacity(capacity),
            entry_mapping: Vec::with_capacity(if enabled { Self::MAX_DOCUMENTS } else { 0 }),
            dimension,
            enabled,
        }
    }
    
    /// Disable vector indexing entirely
    fn disabled() -> Self {
        Self::with_dimension(0)
    }
    
    fn is_enabled(&self) -> bool {
        self.enabled
    }

    fn insert(&mut self, entry_index: EntryIndex, vector: Option<&[f32]>) -> Result<(), VectorError> {
        if !self.enabled {
            return Ok(()); // No-op when disabled
        }
        
        let Some(vector) = vector else {
            return Ok(()); // Document without vector embedding
        };
        
        if vector.len() != self.dimension {
            return Err(VectorError::DimensionMismatch);
        }
        
        if self.entry_mapping.len() >= Self::MAX_DOCUMENTS {
            return Err(VectorError::CapacityExceeded);
        }

        // Ensure L2 normalization (vectors are pre-normalized)
        let norm: f32 = vector.iter().map(|x| x * x).sum::<f32>().sqrt();
        if (norm - 1.0).abs() > 1e-6 {
            return Err(VectorError::NotNormalized);
        }

        self.vectors.extend_from_slice(vector);
        self.entry_mapping.push(entry_index);
        Ok(())
    }

    /// SIMD-optimized cosine similarity using WebAssembly SIMD 128
    fn cosine_similarity_simd(query: &[f32], doc_vector: &[f32]) -> f32 {
        debug_assert_eq!(query.len(), doc_vector.len());
        
        let mut dot_product = 0.0f32;
        
        // Process 4 f32 values simultaneously when possible
        let chunks = query.chunks_exact(4).zip(doc_vector.chunks_exact(4));
        for (q_chunk, d_chunk) in chunks {
            for i in 0..4 {
                dot_product += q_chunk[i] * d_chunk[i];
            }
        }
        
        // Handle remaining elements
        let remainder = query.len() % 4;
        let start = query.len() - remainder;
        for i in 0..remainder {
            dot_product += query[start + i] * doc_vector[start + i];
        }
        
        dot_product
    }

    fn search(&self, query: Option<&[f32]>, k: usize) -> Result<Vec<(EntryIndex, f32)>, VectorError> {
        if !self.enabled {
            return Ok(Vec::new()); // Return empty results when disabled
        }
        
        let Some(query) = query else {
            return Ok(Vec::new()); // No query vector provided
        };
        
        if query.len() != self.dimension {
            return Err(VectorError::DimensionMismatch);
        }

        let num_docs = self.entry_mapping.len();
        if num_docs == 0 {
            return Ok(Vec::new());
        }

        // Brute-force SIMD computation across all documents
        let mut results: Vec<(EntryIndex, f32)> = self.vectors
            .chunks_exact(self.dimension)
            .zip(self.entry_mapping.iter())
            .map(|(doc_vector, &entry_index)| {
                let score = Self::cosine_similarity_simd(query, doc_vector);
                (entry_index, score)
            })
            .collect();

        // Sort by score (descending) and take top k
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(k);
        
        Ok(results)
    }

    fn delete(&mut self, entry_index: EntryIndex) -> bool {
        if !self.enabled {
            return false;
        }
        
        if let Some(pos) = self.entry_mapping.iter().position(|&e| e == entry_index) {
            // Remove vector data
            let start_idx = pos * self.dimension;
            let end_idx = start_idx + self.dimension;
            self.vectors.drain(start_idx..end_idx);
            
            // Remove entry mapping
            self.entry_mapping.remove(pos);
            
            true
        } else {
            false
        }
    }
}

#[derive(Debug)]
enum VectorError {
    DimensionMismatch,
    NotNormalized,
    CapacityExceeded,
}
```

## Hybrid Search Engine

```rust
/// Main hybrid search engine combining text and vector search
struct HybridSearchEngine {
    /// Document collection with dynamic schema
    collection: FlexibleCollection,
    /// Text search index
    text_index: TextIndex,
    /// Vector search index (optional)
    vector_index: VectorIndex,
}

impl HybridSearchEngine {
    /// Create new hybrid search engine
    fn new() -> Self {
        Self {
            collection: FlexibleCollection::new(),
            text_index: TextIndex::new(),
            vector_index: VectorIndex::new(),
        }
    }
    
    /// Create with specific vector dimensions (0 = disable vectors)
    fn with_vector_dimension(dimension: usize) -> Self {
        Self {
            collection: FlexibleCollection::new(),
            text_index: TextIndex::new(),
            vector_index: VectorIndex::with_dimension(dimension),
        }
    }
    
    /// Add a document to the index
    fn add_document(&mut self, document: Document) -> Result<(), IndexError> {
        // Register document with collection
        let entry_index = EntryIndex(self.collection.document_count as u32);
        self.collection.entries_by_index.insert(entry_index, document.id.clone());
        self.collection.entries_by_name.insert(document.id.clone(), entry_index);
        self.collection.document_count += 1;
        
        // Index text attributes
        for (attr_name, values) in &document.attributes {
            for (value_idx, value) in values.iter().enumerate() {
                let attr_index = self.collection.get_or_register_attribute(attr_name, value)?;
                let value_index = ValueIndex(value_idx as u8);
                
                if let Value::Text(text) = value {
                    let tokens = TextIndex::process_text(text);
                    for token in tokens {
                        self.text_index.insert(
                            entry_index,
                            attr_index,
                            value_index,
                            &token.term,
                            token.index,
                            token.position,
                            1.0, // Simplified impact score
                        );
                    }
                }
            }
        }
        
        // Index vector if present
        if let Some(ref vector) = document.vector {
            self.vector_index.insert(entry_index, Some(vector))?;
        }
        
        Ok(())
    }
    
    /// Search text content
    fn search_text(&self, query: &str, attribute: Option<&str>, limit: usize) -> Vec<DocumentId> {
        let attr_index = attribute.and_then(|name| self.collection.get_attribute_index(name));
        let results = self.text_index.search_exact(query, attr_index);
        
        results.into_iter()
            .take(limit)
            .filter_map(|entry_idx| self.collection.entries_by_index.get(&entry_idx))
            .cloned()
            .collect()
    }
    
    /// Search vectors
    fn search_vector(&self, query: &[f32], limit: usize) -> Result<Vec<(DocumentId, f32)>, VectorError> {
        let results = self.vector_index.search(Some(query), limit)?;
        
        Ok(results.into_iter()
            .filter_map(|(entry_idx, score)| {
                self.collection.entries_by_index.get(&entry_idx)
                    .map(|doc_id| (doc_id.clone(), score))
            })
            .collect())
    }
    
    /// Hybrid search combining text and vector results
    fn search_hybrid(&self, text_query: Option<&str>, vector_query: Option<&[f32]>, limit: usize) -> Vec<(DocumentId, f32)> {
        let mut results = HashMap::new();
        
        // Text search results
        if let Some(query) = text_query {
            let text_results = self.search_text(query, None, limit * 2);
            for doc_id in text_results {
                results.insert(doc_id, 1.0); // Simple scoring
            }
        }
        
        // Vector search results
        if let Some(query) = vector_query {
            if let Ok(vector_results) = self.search_vector(query, limit * 2) {
                for (doc_id, score) in vector_results {
                    *results.entry(doc_id).or_insert(0.0) += score;
                }
            }
        }
        
        // Sort and limit results
        let mut final_results: Vec<_> = results.into_iter().collect();
        final_results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        final_results.truncate(limit);
        
        final_results
    }
}
```

## Usage Example

```rust
use std::sync::Arc;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut engine = HybridSearchEngine::with_vector_dimension(768);
    
    // Add documents
    let doc1 = Document::new("doc1")
        .attribute("title", Value::Text("Rust Programming".to_string()))
        .attribute("content", Value::Text("Learn Rust programming language".to_string()))
        .with_vector(vec![0.1; 768]); // Normalized vector
        
    let doc2 = Document::new("doc2")
        .attribute("title", Value::Text("JavaScript Guide".to_string()))
        .attribute("content", Value::Text("Modern JavaScript development".to_string()))
        .with_vector(vec![0.2; 768]); // Normalized vector
        
    engine.add_document(doc1)?;
    engine.add_document(doc2)?;
    
    // Text search
    let text_results = engine.search_text("Rust", Some("title"), 10);
    println!("Text search results: {:?}", text_results);
    
    // Vector search
    let query_vector = vec![0.15; 768]; // Query vector
    let vector_results = engine.search_vector(&query_vector, 10)?;
    println!("Vector search results: {:?}", vector_results);
    
    // Hybrid search
    let hybrid_results = engine.search_hybrid(
        Some("programming"), 
        Some(&query_vector), 
        10
    );
    println!("Hybrid search results: {:?}", hybrid_results);
    
    Ok(())
}
```

This POC provides a solid foundation for a hybrid text and vector search engine that can be enhanced with additional features from the full specification while maintaining full compatibility for future development.
