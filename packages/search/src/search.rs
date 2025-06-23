use wasm_bindgen::prelude::*;

// Re-export the high-performance vector functions that the benchmarks expect
pub use crate::search_engine::{batch_dot_product_ultimate_external};

// Re-export search engine types for public API
pub use crate::search_engine::{
    // Core types
    Language, Kind, SemanticKind, Value, FieldWeight, TokenizerConfig, Schema, SchemaBuilder,
    DocumentId, EntryIndex, AttributeIndex, ValueIndex, Position, TokenIndex, Document,
    DocumentEntry, TextDocumentEntry,
    
    // BM25 configuration
    BM25Config, BM25Scorer,
    
    // Errors
    IndexError, VectorError,
    
    // Text processing
    Token, TextProcessor,
    
    // Indexes
    VectorIndex, TextIndex, Collection,
    
    // Fusion strategies
    FusionStrategy,
    
    // Main search engine
    SearchEngine,
    
    // WASM bindings
    WasmSearchEngine, WasmDocument, WasmSearchResult,
    
    // High-performance vector operations
    WorkloadProfile, batch_dot_product_ultimate,
};
