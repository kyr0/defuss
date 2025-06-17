extern crate console_error_panic_hook;

use wasm_bindgen::prelude::*;

pub use wasm_bindgen_rayon::init_thread_pool;

mod buffer;
mod dsp;
mod vector;
mod convolution;
mod ultimate_vector;
mod efficient_vector;
mod ultra_vector;

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
    batch_dot_product_rayon_chunked,
    batch_dot_product_hyper_optimized_parallel,
    batch_dot_product_ultra_optimized,
    batch_dot_product_parallel_ultra_optimized,
    batch_dot_product_hyper_parallel,
    batch_dot_product_ultimate_performance,
    generate_test_vectors_wasm,
    batch_dot_product_hyper_optimized,
    batch_dot_product_ultra_simple,
    vector_normalize,
    vector_magnitude,
};

// Re-export ultimate performance functions
pub use ultimate_vector::{
    batch_dot_product_ultimate,
    test_ultimate_performance,
    PerformanceStats,
};

// Re-export efficient zero-copy functions  
pub use efficient_vector::{
    dot_product_simd,
    batch_dot_product_efficient,
    batch_dot_product_zero_copy_efficient,
    test_efficient_performance,
};

pub use convolution::{
    convolution,
    cross_correlation,
    convolution_2d,
    auto_correlation,
};

// Export ultra high-performance functions
pub use ultra_vector::*;

#[wasm_bindgen(start)]
pub fn main() {
  std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}