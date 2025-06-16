extern crate console_error_panic_hook;

use wasm_bindgen::prelude::*;

pub use wasm_bindgen_rayon::init_thread_pool;

mod buffer;
mod dsp;
mod vector;
mod matrix;
mod convolution;

// Re-export DSP functions
pub use dsp::{sine, saw, triangle, square};

// Re-export math functions
pub use vector::{
    vector_add,
    vector_subtract,
    vector_scale,
    vector_dot_product,
    vector_dot_product_single,
    vector_dot_product_parallel,
    vector_batch_dot_product,
    vector_batch_dot_product_separated,
    process_vectors_in_memory,
    batch_dot_product_zero_copy,
    batch_dot_product_zero_copy_parallel,
    vector_normalize,
    vector_magnitude,
};

pub use matrix::{
    matrix_multiply,
    matrix_multiply_single,
    matrix_multiply_parallel,
    matrix_add,
    matrix_subtract,
    matrix_transpose,
    matrix_scale,
};

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