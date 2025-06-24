use wasm_bindgen::prelude::*;

pub use wasm_bindgen_rayon::init_thread_pool;

mod buffer;
mod dsp;
mod convolution;
mod vector;
// Re-export DSP functions
pub use dsp::{sine, saw, triangle, square};

pub use convolution::{
    convolution,
    cross_correlation,
    convolution_2d,
    auto_correlation,
};

#[wasm_bindgen(start)]
pub fn main() {
  std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}