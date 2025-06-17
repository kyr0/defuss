use wasm_bindgen::prelude::*;
use rayon::prelude::*;

/// Single vector dot product with SIMD optimization
/// This is the core high-performance function that operates on individual vectors
#[wasm_bindgen]
pub fn dot_product_simd(
    a_ptr: *const f32,
    b_ptr: *const f32,
    dims: usize
) -> f32 {
    if a_ptr.is_null() || b_ptr.is_null() || dims == 0 {
        return 0.0;
    }
    
    unsafe {
        let a_slice = std::slice::from_raw_parts(a_ptr, dims);
        let b_slice = std::slice::from_raw_parts(b_ptr, dims);
        
        simd_dot_product_optimized(a_slice, b_slice)
    }
}

/// Optimized SIMD dot product implementation using v128 instructions
#[inline(always)]
fn simd_dot_product_optimized(a: &[f32], b: &[f32]) -> f32 {
    let len = a.len().min(b.len());
    
    #[cfg(target_arch = "wasm32")]
    {
        use std::arch::wasm32::*;
        
        // Use 4 SIMD accumulators for better parallelism and reduced latency
        let mut sum1 = f32x4_splat(0.0);
        let mut sum2 = f32x4_splat(0.0);
        let mut sum3 = f32x4_splat(0.0);
        let mut sum4 = f32x4_splat(0.0);
        
        // Process 16 elements at once using 4 SIMD registers (ultra-wide SIMD)
        let chunks_16 = len / 16;
        
        unsafe {
            for i in 0..chunks_16 {
                let base = i * 16;
                let a_ptr = a.as_ptr().add(base);
                let b_ptr = b.as_ptr().add(base);
                
                // Load and multiply 16 elements in parallel
                let a_vec1 = v128_load(a_ptr as *const v128);
                let b_vec1 = v128_load(b_ptr as *const v128);
                let a_vec2 = v128_load(a_ptr.add(4) as *const v128);
                let b_vec2 = v128_load(b_ptr.add(4) as *const v128);
                let a_vec3 = v128_load(a_ptr.add(8) as *const v128);
                let b_vec3 = v128_load(b_ptr.add(8) as *const v128);
                let a_vec4 = v128_load(a_ptr.add(12) as *const v128);
                let b_vec4 = v128_load(b_ptr.add(12) as *const v128);
                
                // Fused multiply-add for better performance
                sum1 = f32x4_add(sum1, f32x4_mul(a_vec1, b_vec1));
                sum2 = f32x4_add(sum2, f32x4_mul(a_vec2, b_vec2));
                sum3 = f32x4_add(sum3, f32x4_mul(a_vec3, b_vec3));
                sum4 = f32x4_add(sum4, f32x4_mul(a_vec4, b_vec4));
            }
        }
        
        // Combine the 4 SIMD accumulators
        let combined_sum = f32x4_add(f32x4_add(sum1, sum2), f32x4_add(sum3, sum4));
        
        // Extract and sum the SIMD results
        let mut sum = f32x4_extract_lane::<0>(combined_sum) +
                     f32x4_extract_lane::<1>(combined_sum) +
                     f32x4_extract_lane::<2>(combined_sum) +
                     f32x4_extract_lane::<3>(combined_sum);
        
        // Process remaining chunks of 4
        let processed = chunks_16 * 16;
        let remaining = len - processed;
        let chunks_4 = remaining / 4;
        
        if chunks_4 > 0 {
            let mut sum_vec = f32x4_splat(0.0);
            unsafe {
                for i in 0..chunks_4 {
                    let base = processed + i * 4;
                    let a_vec = v128_load(a.as_ptr().add(base) as *const v128);
                    let b_vec = v128_load(b.as_ptr().add(base) as *const v128);
                    sum_vec = f32x4_add(sum_vec, f32x4_mul(a_vec, b_vec));
                }
            }
            sum += f32x4_extract_lane::<0>(sum_vec) +
                   f32x4_extract_lane::<1>(sum_vec) +
                   f32x4_extract_lane::<2>(sum_vec) +
                   f32x4_extract_lane::<3>(sum_vec);
        }
        
        // Handle remainder elements (less than 4)
        let remainder_start = processed + chunks_4 * 4;
        for i in remainder_start..len {
            sum += a[i] * b[i];
        }
        
        sum
    }
    
    #[cfg(not(target_arch = "wasm32"))]
    {
        // Fallback implementation for non-WASM targets
        let mut sum = 0.0f32;
        
        // Process in chunks of 4 for better performance
        let chunks = len / 4;
        let remainder = len % 4;
        
        for i in 0..chunks {
            let base = i * 4;
            sum += a[base] * b[base] + 
                   a[base + 1] * b[base + 1] + 
                   a[base + 2] * b[base + 2] + 
                   a[base + 3] * b[base + 3];
        }
        
        // Handle remainder
        for i in (len - remainder)..len {
            sum += a[i] * b[i];
        }
        
        sum
    }
}

/// Batch dot product using efficient chunking strategy
/// Processes workloads in chunks of up to 4096 operations with parallel processing
#[wasm_bindgen]
pub fn batch_dot_product_efficient(
    vectors_a_ptr: *const f32,
    vectors_b_ptr: *const f32,
    results_ptr: *mut f32,
    vector_dims: usize,
    num_vectors: usize,
    chunk_size: usize
) -> f64 {
    if vectors_a_ptr.is_null() || vectors_b_ptr.is_null() || results_ptr.is_null() {
        return -1.0; // Error: null pointer
    }
    
    if vector_dims == 0 || num_vectors == 0 {
        return -2.0; // Error: invalid dimensions
    }
    
    // Validate chunk size
    let effective_chunk_size = if chunk_size == 0 || chunk_size > 4096 {
        4096 // Default to max efficient chunk size
    } else {
        chunk_size
    };
    
    unsafe {
        let total_elements = num_vectors * vector_dims;
        let vectors_a = std::slice::from_raw_parts(vectors_a_ptr, total_elements);
        let vectors_b = std::slice::from_raw_parts(vectors_b_ptr, total_elements);
        let results = std::slice::from_raw_parts_mut(results_ptr, num_vectors);
        
        // Process in parallel chunks
        process_chunks_parallel(
            vectors_a, 
            vectors_b, 
            results, 
            vector_dims, 
            num_vectors, 
            effective_chunk_size
        );
    }
    
    0.0 // Success
}

/// Parallel chunk processing with optimal work distribution
fn process_chunks_parallel(
    vectors_a: &[f32],
    vectors_b: &[f32], 
    results: &mut [f32],
    vector_dims: usize,
    num_vectors: usize,
    chunk_size: usize
) {
    // For small workloads, use sequential processing
    if num_vectors <= 1000 {
        for i in 0..num_vectors {
            let a_start = i * vector_dims;
            let b_start = i * vector_dims;
            let a_vector = &vectors_a[a_start..a_start + vector_dims];
            let b_vector = &vectors_b[b_start..b_start + vector_dims];
            results[i] = simd_dot_product_optimized(a_vector, b_vector);
        }
        return;
    }
    
    // Parallel processing for larger workloads using chunk-based approach
    results.par_chunks_mut(chunk_size)
        .enumerate()
        .for_each(|(chunk_idx, chunk_results)| {
            let start_vector = chunk_idx * chunk_size;
            
            for (local_idx, result) in chunk_results.iter_mut().enumerate() {
                let vector_idx = start_vector + local_idx;
                if vector_idx >= num_vectors { break; }
                
                let a_start = vector_idx * vector_dims;
                let b_start = vector_idx * vector_dims;
                let a_vector = &vectors_a[a_start..a_start + vector_dims];
                let b_vector = &vectors_b[b_start..b_start + vector_dims];
                
                *result = simd_dot_product_optimized(a_vector, b_vector);
            }
        });
}

/// Memory-efficient batch processing with zero-copy strategy
/// This function implements the optimal approach: small allocations, high performance
#[wasm_bindgen]
pub fn batch_dot_product_zero_copy_efficient(
    vectors_a_ptr: *const f32,
    vectors_b_ptr: *const f32,
    results_ptr: *mut f32,
    vector_dims: usize,
    num_vectors: usize
) -> f64 {
    if vectors_a_ptr.is_null() || vectors_b_ptr.is_null() || results_ptr.is_null() {
        return -1.0; // Error: null pointer
    }
    
    if vector_dims == 0 || num_vectors == 0 {
        return -2.0; // Error: invalid dimensions
    }
    
    unsafe {
        let total_elements = num_vectors * vector_dims;
        let vectors_a = std::slice::from_raw_parts(vectors_a_ptr, total_elements);
        let vectors_b = std::slice::from_raw_parts(vectors_b_ptr, total_elements);
        let results = std::slice::from_raw_parts_mut(results_ptr, num_vectors);
        
        // Choose strategy based on workload size
        if num_vectors >= 5000 {
            // Use chunked parallel processing for large workloads
            process_chunks_parallel(vectors_a, vectors_b, results, vector_dims, num_vectors, 4096);
        } else if num_vectors >= 500 {
            // Use smaller chunks for medium workloads
            process_chunks_parallel(vectors_a, vectors_b, results, vector_dims, num_vectors, 1024);
        } else {
            // Sequential processing for small workloads
            for i in 0..num_vectors {
                let a_start = i * vector_dims;
                let b_start = i * vector_dims;
                let a_vector = &vectors_a[a_start..a_start + vector_dims];
                let b_vector = &vectors_b[b_start..b_start + vector_dims];
                results[i] = simd_dot_product_optimized(a_vector, b_vector);
            }
        }
    }
    
    0.0 // Success
}

/// High-performance test function for benchmarking
#[wasm_bindgen]
pub fn test_efficient_performance(
    vector_dims: usize,
    num_vectors: usize
) -> js_sys::Array {
    // Validate inputs
    if vector_dims == 0 || num_vectors == 0 {
        let error_array = js_sys::Array::new();
        error_array.push(&wasm_bindgen::JsValue::from_f64(-1.0));
        return error_array;
    }
    
    // Check for overflow
    let total_elements = match vector_dims.checked_mul(num_vectors) {
        Some(val) => val,
        None => {
            let error_array = js_sys::Array::new();
            error_array.push(&wasm_bindgen::JsValue::from_f64(-2.0));
            return error_array;
        }
    };
    
    // Generate test data
    let mut vectors_a = vec![0.0f32; total_elements];
    let mut vectors_b = vec![0.0f32; total_elements];
    let mut results = vec![0.0f32; num_vectors];
    
    // Fill with test pattern
    for i in 0..total_elements {
        vectors_a[i] = (i as f32 + 1.0) * 0.1;
        vectors_b[i] = (i as f32 + 1.0) * 0.2;
    }
    
    // Call the efficient function
    let execution_result = batch_dot_product_zero_copy_efficient(
        vectors_a.as_ptr(),
        vectors_b.as_ptr(),
        results.as_mut_ptr(),
        vector_dims,
        num_vectors
    );
    
    // Check for errors
    if execution_result < 0.0 {
        let error_array = js_sys::Array::new();
        error_array.push(&wasm_bindgen::JsValue::from_f64(execution_result));
        return error_array;
    }
    
    let total_flops = (num_vectors * vector_dims * 2) as f64;
    let placeholder_time = 1.0; // TypeScript will provide real timing
    let gflops = total_flops / (placeholder_time * 1_000_000.0);
    
    // Return results as JS array
    let result_array = js_sys::Array::new();
    result_array.push(&wasm_bindgen::JsValue::from_f64(placeholder_time));
    result_array.push(&wasm_bindgen::JsValue::from_f64(gflops));
    result_array.push(&wasm_bindgen::JsValue::from_f64(results[0] as f64));
    result_array.push(&wasm_bindgen::JsValue::from_f64(execution_result));
    
    result_array
}
