use wasm_bindgen::prelude::*;

pub use wasm_bindgen_rayon::init_thread_pool;

mod wasm_rust;

#[wasm_bindgen(start)]
pub fn main() {
  std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}