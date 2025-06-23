extern crate console_error_panic_hook;

use wasm_bindgen::prelude::*;

pub use wasm_bindgen_rayon::init_thread_pool;

mod search;
pub mod vector; // Add the vector module here
//pub mod embeddings; // Removed - using TypeScript implementation instead

// Re-export main types for both Rust and JavaScript usage
pub use search::{
    SearchEngine, Schema, SchemaBuilder, Document, Kind, Language,
    DocumentId, IndexError, VectorError, BM25Config, FieldWeight,
    SearchResult,
};

// Re-export vector functions for benchmarking
pub use vector::batch_dot_product_ultimate;

#[wasm_bindgen(start)]
pub fn main() {
  std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}