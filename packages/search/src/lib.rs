extern crate console_error_panic_hook;

use wasm_bindgen::prelude::*;

pub use wasm_bindgen_rayon::init_thread_pool;

mod search;
mod search_engine;

// Re-export main types for both Rust and JavaScript usage
pub use search_engine::{
    SearchEngine, Schema, SchemaBuilder, Document, Kind, Language,
    DocumentId, IndexError, VectorError, BM25Config, FieldWeight,
    SearchResult,
};

#[wasm_bindgen(start)]
pub fn main() {
  std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}