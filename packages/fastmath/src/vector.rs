use wasm_bindgen::prelude::*;
use rayon::prelude::*;

// Threshold for switching to parallel processing
// Below this size, single-threaded is faster due to overhead
const PARALLEL_THRESHOLD: usize = 500; // Reduced for better parallelization
const SIMD_THRESHOLD: usize = 32; // Reduced threshold for earlier SIMD usage

// SIMD-optimized dot product using explicit SIMD intrinsics
#[cfg(target_arch = "wasm32")]
use std::arch::wasm32::*;

/// Ultra-optimized SIMD dot product with aggressive 16-wide processing and loop unrolling
#[inline]
fn simd_dot_product_ultra(a: &[f32], b: &[f32]) -> f32 {
    assert_eq!(a.len(), b.len(), "Vector lengths must match");
    
    #[cfg(target_arch = "wasm32")]
    {
        let len = a.len();
        
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
        let combined1 = f32x4_add(sum1, sum2);
        let combined2 = f32x4_add(sum3, sum4);
        let final_sum = f32x4_add(combined1, combined2);
        
        let mut result = f32x4_extract_lane::<0>(final_sum) + 
                        f32x4_extract_lane::<1>(final_sum) + 
                        f32x4_extract_lane::<2>(final_sum) + 
                        f32x4_extract_lane::<3>(final_sum);
        
        // Process remaining elements in chunks of 4
        let remaining_start = chunks_16 * 16;
        let chunks_4 = (len - remaining_start) / 4;
        
        unsafe {
            for i in 0..chunks_4 {
                let base = remaining_start + i * 4;
                let a_vec = v128_load(a.as_ptr().add(base) as *const v128);
                let b_vec = v128_load(b.as_ptr().add(base) as *const v128);
                let prod = f32x4_mul(a_vec, b_vec);
                
                result += f32x4_extract_lane::<0>(prod) + 
                         f32x4_extract_lane::<1>(prod) + 
                         f32x4_extract_lane::<2>(prod) + 
                         f32x4_extract_lane::<3>(prod);
            }
        }
        
        // Handle final remaining elements
        let final_start = remaining_start + chunks_4 * 4;
        for i in final_start..len {
            result += a[i] * b[i];
        }
        
        result
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        // Fallback for non-WASM targets
        a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
    }
}

/// Legacy SIMD dot product (kept for compatibility)
#[inline]
fn simd_dot_product(a: &[f32], b: &[f32]) -> f32 {
    simd_dot_product_ultra(a, b)
}

/// Parallel vector addition: result[i] = a[i] + b[i]
#[wasm_bindgen]
pub fn vector_add(a: &[f32], b: &[f32], result: &mut [f32]) {
    assert_eq!(a.len(), b.len(), "Vector lengths must match");
    assert_eq!(a.len(), result.len(), "Result vector length must match input");

    if a.len() < PARALLEL_THRESHOLD {
        // Fallback to single-threaded execution for small vectors
        for i in 0..a.len() {
            result[i] = a[i] + b[i];
        }
    } else {
        result
            .par_iter_mut()
            .zip(a.par_iter().zip(b.par_iter()))
            .for_each(|(r, (a_val, b_val))| {
                *r = a_val + b_val;
            });
    }
}

/// Parallel vector multiplication: result[i] = a[i] * b[i]
#[wasm_bindgen]
pub fn vector_multiply(a: &[f32], b: &[f32], result: &mut [f32]) {
    assert_eq!(a.len(), b.len(), "Vector lengths must match");
    assert_eq!(a.len(), result.len(), "Result vector length must match input");

    if a.len() < PARALLEL_THRESHOLD {
        // Fallback to single-threaded execution for small vectors
        for i in 0..a.len() {
            result[i] = a[i] * b[i];
        }
    } else {
        result
            .par_iter_mut()
            .zip(a.par_iter().zip(b.par_iter()))
            .for_each(|(r, (a_val, b_val))| {
                *r = a_val * b_val;
            });
    }
}

/// Parallel scalar multiplication: result[i] = a[i] * scalar
#[wasm_bindgen]
pub fn vector_scale(a: &[f32], scalar: f32, result: &mut [f32]) {
    assert_eq!(a.len(), result.len(), "Vector lengths must match");

    if a.len() < PARALLEL_THRESHOLD {
        // Fallback to single-threaded execution for small vectors
        for i in 0..a.len() {
            result[i] = a[i] * scalar;
        }
    } else {
        result
            .par_iter_mut()
            .zip(a.par_iter())
            .for_each(|(r, a_val)| {
                *r = a_val * scalar;
            });
    }
}

/// Parallel dot product: sum of a[i] * b[i]
#[wasm_bindgen]
pub fn vector_dot_product(a: &[f32], b: &[f32]) -> f32 {
    assert_eq!(a.len(), b.len(), "Vector lengths must match");

    if a.len() < PARALLEL_THRESHOLD {
        // Use SIMD for single-threaded execution if vector is large enough
        if a.len() >= SIMD_THRESHOLD {
            simd_dot_product(a, b)
        } else {
            let mut sum = 0.0;
            for i in 0..a.len() {
                sum += a[i] * b[i];
            }
            sum
        }
    } else {
        a.par_iter()
            .zip(b.par_iter())
            .map(|(a_val, b_val)| a_val * b_val)
            .sum()
    }
}

/// Single-threaded dot product for small vectors or when forcing single-threaded execution
#[wasm_bindgen]
pub fn vector_dot_product_single(a: &[f32], b: &[f32]) -> f32 {
    assert_eq!(a.len(), b.len(), "Vector lengths must match");
    
    if a.len() >= SIMD_THRESHOLD {
        simd_dot_product(a, b)
    } else {
        let mut sum = 0.0;
        for i in 0..a.len() {
            sum += a[i] * b[i];
        }
        sum
    }
}

/// Parallel dot product for large vectors or when forcing parallel execution
#[wasm_bindgen]
pub fn vector_dot_product_parallel(a: &[f32], b: &[f32]) -> f32 {
    assert_eq!(a.len(), b.len(), "Vector lengths must match");

    a.par_iter()
        .zip(b.par_iter())
        .map(|(a_val, b_val)| a_val * b_val)
        .sum()
}

/// Parallel vector normalization: result[i] = a[i] / ||a||
#[wasm_bindgen]
pub fn vector_normalize(a: &[f32], result: &mut [f32]) {
    assert_eq!(a.len(), result.len(), "Vector lengths must match");

    // Calculate magnitude
    let magnitude = a.par_iter()
        .map(|x| x * x)
        .sum::<f32>()
        .sqrt();

    if magnitude > 0.0 {
        result
            .par_iter_mut()
            .zip(a.par_iter())
            .for_each(|(r, a_val)| {
                *r = a_val / magnitude;
            });
    } else {
        result.par_iter_mut().for_each(|r| *r = 0.0);
    }
}

/// Parallel vector subtraction: result[i] = a[i] - b[i]
#[wasm_bindgen]
pub fn vector_subtract(a: &[f32], b: &[f32], result: &mut [f32]) {
    assert_eq!(a.len(), b.len(), "Vector lengths must match");
    assert_eq!(a.len(), result.len(), "Result vector length must match input");

    if a.len() < PARALLEL_THRESHOLD {
        // Fallback to single-threaded execution for small vectors
        for i in 0..a.len() {
            result[i] = a[i] - b[i];
        }
    } else {
        result
            .par_iter_mut()
            .zip(a.par_iter().zip(b.par_iter()))
            .for_each(|(r, (a_val, b_val))| {
                *r = a_val - b_val;
            });
    }
}

/// Parallel vector magnitude calculation: sqrt(sum(a[i]^2))
#[wasm_bindgen]
pub fn vector_magnitude(a: &[f32]) -> f32 {
    if a.len() < PARALLEL_THRESHOLD {
        // Fallback to single-threaded execution for small vectors
        let mut sum = 0.0;
        for &x in a.iter() {
            sum += x * x;
        }
        sum.sqrt()
    } else {
        a.par_iter()
            .map(|x| x * x)
            .sum::<f32>()
            .sqrt()
    }
}

/// Batch dot product computation - processes multiple vector pairs in one WASM call
/// Input: flat array containing pairs of vectors: [a1_0, a1_1, ..., a1_n, b1_0, b1_1, ..., b1_n, a2_0, ...]
/// Returns: array of dot products
#[wasm_bindgen]
pub fn vector_batch_dot_product(data: &[f32], vector_length: usize, num_pairs: usize) -> Vec<f32> {
    assert_eq!(data.len(), vector_length * 2 * num_pairs, "Data length must match vector_length * 2 * num_pairs");
    
    let mut results = Vec::with_capacity(num_pairs);
    
    if num_pairs < 100 || vector_length < SIMD_THRESHOLD {
        // Single-threaded processing for small batches
        for i in 0..num_pairs {
            let base = i * vector_length * 2;
            let a = &data[base..base + vector_length];
            let b = &data[base + vector_length..base + vector_length * 2];
            
            if vector_length >= SIMD_THRESHOLD {
                results.push(simd_dot_product(a, b));
            } else {
                let mut sum = 0.0;
                for j in 0..vector_length {
                    sum += a[j] * b[j];
                }
                results.push(sum);
            }
        }
    } else {
        // Parallel processing for large batches
        results = (0..num_pairs).into_par_iter().map(|i| {
            let base = i * vector_length * 2;
            let a = &data[base..base + vector_length];
            let b = &data[base + vector_length..base + vector_length * 2];
            
            if vector_length >= SIMD_THRESHOLD {
                simd_dot_product(a, b)
            } else {
                let mut sum = 0.0;
                for j in 0..vector_length {
                    sum += a[j] * b[j];
                }
                sum
            }
        }).collect();
    }
    
    results
}

/// Optimized batch dot product for pre-separated vector arrays
/// a_vectors: flat array of all 'a' vectors [a1_0, a1_1, ..., a1_n, a2_0, a2_1, ...]
/// b_vectors: flat array of all 'b' vectors [b1_0, b1_1, ..., b1_n, b2_0, b2_1, ...]
#[wasm_bindgen]
pub fn vector_batch_dot_product_separated(
    a_vectors: &[f32], 
    b_vectors: &[f32], 
    vector_length: usize, 
    num_pairs: usize
) -> Vec<f32> {
    assert_eq!(a_vectors.len(), vector_length * num_pairs, "a_vectors length must match vector_length * num_pairs");
    assert_eq!(b_vectors.len(), vector_length * num_pairs, "b_vectors length must match vector_length * num_pairs");
    
    let mut results = Vec::with_capacity(num_pairs);
    
    if num_pairs < 100 || vector_length < SIMD_THRESHOLD {
        // Single-threaded processing
        for i in 0..num_pairs {
            let base = i * vector_length;
            let a = &a_vectors[base..base + vector_length];
            let b = &b_vectors[base..base + vector_length];
            
            if vector_length >= SIMD_THRESHOLD {
                results.push(simd_dot_product(a, b));
            } else {
                let mut sum = 0.0;
                for j in 0..vector_length {
                    sum += a[j] * b[j];
                }
                results.push(sum);
            }
        }
    } else {
        // Parallel processing
        results = (0..num_pairs).into_par_iter().map(|i| {
            let base = i * vector_length;
            let a = &a_vectors[base..base + vector_length];
            let b = &b_vectors[base..base + vector_length];
            
            if vector_length >= SIMD_THRESHOLD {
                simd_dot_product(a, b)
            } else {
                let mut sum = 0.0;
                for j in 0..vector_length {
                    sum += a[j] * b[j];
                }
                sum
            }
        }).collect();
    }
    
    results
}

/// Simplified batch processing using WASM linear memory
/// Instead of complex memory management, we'll use a more direct approach
/// This function processes vectors in-place in WASM memory
#[wasm_bindgen]
pub fn process_vectors_in_memory(
    data_offset: usize,
    vector_length: usize,
    num_pairs: usize,
    results_offset: usize
) {
    unsafe {
        // Get pointers to data in WASM linear memory
        let memory_start = 0 as *mut u8; // WASM linear memory starts at 0
        let data_ptr = memory_start.add(data_offset) as *const f32;
        let results_ptr = memory_start.add(results_offset) as *mut f32;
        
        // Process vector pairs
        for i in 0..num_pairs {
            let a_base = i * vector_length * 2;
            let b_base = a_base + vector_length;
            
            let mut sum = 0.0;
            
            if vector_length >= SIMD_THRESHOLD {
                // SIMD processing
                let chunks = vector_length / 4;
                let mut simd_sum = f32x4_splat(0.0);
                
                for j in 0..chunks {
                    let simd_base = j * 4;
                    let a_vec = v128_load(data_ptr.add(a_base + simd_base) as *const v128);
                    let b_vec = v128_load(data_ptr.add(b_base + simd_base) as *const v128);
                    let prod = f32x4_mul(a_vec, b_vec);
                    simd_sum = f32x4_add(simd_sum, prod);
                }
                
                // Extract scalar sum from SIMD register
                sum = f32x4_extract_lane::<0>(simd_sum) + 
                      f32x4_extract_lane::<1>(simd_sum) + 
                      f32x4_extract_lane::<2>(simd_sum) + 
                      f32x4_extract_lane::<3>(simd_sum);
                
                // Handle remaining elements
                for j in (chunks * 4)..vector_length {
                    sum += (*data_ptr.add(a_base + j)) * (*data_ptr.add(b_base + j));
                }
            } else {
                // Scalar processing
                for j in 0..vector_length {
                    sum += (*data_ptr.add(a_base + j)) * (*data_ptr.add(b_base + j));
                }
            }
            
            *results_ptr.add(i) = sum;
        }
    }
}

/// Zero-copy batch dot product that works directly with JS TypedArray pointers
/// This function takes pointers to two flat arrays containing vectors and
/// computes dot products without any memory copying
#[wasm_bindgen]
pub fn batch_dot_product_zero_copy(
    a_ptr: *const f32,
    b_ptr: *const f32,
    results_ptr: *mut f32,
    vector_length: usize,
    num_pairs: usize
) {
    unsafe {
        for i in 0..num_pairs {
            let a_offset = i * vector_length;
            let b_offset = i * vector_length;
            
            let a_slice = std::slice::from_raw_parts(a_ptr.add(a_offset), vector_length);
            let b_slice = std::slice::from_raw_parts(b_ptr.add(b_offset), vector_length);
            
            let result = if vector_length >= SIMD_THRESHOLD {
                simd_dot_product(a_slice, b_slice)
            } else {
                let mut sum = 0.0;
                for j in 0..vector_length {
                    sum += a_slice[j] * b_slice[j];
                }
                sum
            };
            
            *results_ptr.add(i) = result;
        }
    }
}

/// Zero-copy batch dot product with parallel processing for large datasets
/// Uses Rayon for multi-threading when beneficial
#[wasm_bindgen]
pub fn batch_dot_product_zero_copy_parallel(
    a_ptr: *const f32,
    b_ptr: *const f32,
    results_ptr: *mut f32,
    vector_length: usize,
    num_pairs: usize
) {
    unsafe {
        // Convert raw pointers to slices for safe parallel access
        let a_data = std::slice::from_raw_parts(a_ptr, num_pairs * vector_length);
        let b_data = std::slice::from_raw_parts(b_ptr, num_pairs * vector_length);
        let results = std::slice::from_raw_parts_mut(results_ptr, num_pairs);
        
        if num_pairs >= PARALLEL_THRESHOLD {
            // Use Rayon's parallel processing - simpler and more reliable approach
            results.par_iter_mut().enumerate().for_each(|(i, result)| {
                let a_start = i * vector_length;
                let a_slice = &a_data[a_start..a_start + vector_length];
                let b_slice = &b_data[a_start..a_start + vector_length];
                
                // Use the same ultra-simple SIMD logic as the ultra_simple function
                #[cfg(target_arch = "wasm32")]
                {
                    let mut sum = f32x4_splat(0.0);
                    
                    // Process in chunks of 4 - memory/instruction alignment
                    let mut j = 0;
                    while j + 4 <= vector_length {
                        let a_vec = v128_load(a_slice.as_ptr().add(j) as *const v128);
                        let b_vec = v128_load(b_slice.as_ptr().add(j) as *const v128);
                        sum = f32x4_add(sum, f32x4_mul(a_vec, b_vec));
                        j += 4;
                    }
                    
                    // Extract from SIMD register and sum up directly
                    let mut dot_result = f32x4_extract_lane::<0>(sum) + 
                                       f32x4_extract_lane::<1>(sum) + 
                                       f32x4_extract_lane::<2>(sum) + 
                                       f32x4_extract_lane::<3>(sum);
                    
                    // Handle remaining elements
                    while j < vector_length {
                        dot_result += a_slice[j] * b_slice[j];
                        j += 1;
                    }
                    
                    *result = dot_result;
                }
                
                #[cfg(not(target_arch = "wasm32"))]
                {
                    let mut sum = 0.0;
                    for j in 0..vector_length {
                        sum += a_slice[j] * b_slice[j];
                    }
                    *result = sum;
                }
            });
        } else {
            // Sequential processing using the same ultra-simple logic
            for i in 0..num_pairs {
                let a_start = i * vector_length;
                let a_slice = &a_data[a_start..a_start + vector_length];
                let b_slice = &b_data[a_start..a_start + vector_length];
                
                #[cfg(target_arch = "wasm32")]
                {
                    let mut sum = f32x4_splat(0.0);
                    
                    let mut j = 0;
                    while j + 4 <= vector_length {
                        let a_vec = v128_load(a_slice.as_ptr().add(j) as *const v128);
                        let b_vec = v128_load(b_slice.as_ptr().add(j) as *const v128);
                        sum = f32x4_add(sum, f32x4_mul(a_vec, b_vec));
                        j += 4;
                    }
                    
                    let mut dot_result = f32x4_extract_lane::<0>(sum) + 
                                       f32x4_extract_lane::<1>(sum) + 
                                       f32x4_extract_lane::<2>(sum) + 
                                       f32x4_extract_lane::<3>(sum);
                    
                    while j < vector_length {
                        dot_result += a_slice[j] * b_slice[j];
                        j += 1;
                    }
                    
                    results[i] = dot_result;
                }
                
                #[cfg(not(target_arch = "wasm32"))]
                {
                    let mut sum = 0.0;
                    for j in 0..vector_length {
                        sum += a_slice[j] * b_slice[j];
                    }
                    results[i] = sum;
                }
            }
        }
    }
}

/// Ultra-fast random number generation in WASM
#[wasm_bindgen]
pub fn generate_test_vectors_wasm(
    num_vectors: usize,
    vector_length: usize,
    seed: u32,
    a_ptr: *mut f32,
    b_ptr: *mut f32
) {
    unsafe {
        let total_size = num_vectors * vector_length;
        let a_slice = std::slice::from_raw_parts_mut(a_ptr, total_size);
        let b_slice = std::slice::from_raw_parts_mut(b_ptr, total_size);
        
        let mut current_seed = seed;
        
        // Ultra-fast WASM random number generation with loop unrolling
        for i in (0..total_size).step_by(8) {
            // Generate 8 random numbers at once
            current_seed = (current_seed.wrapping_mul(9301).wrapping_add(49297)) % 233280;
            a_slice[i] = (current_seed as f32 / 233280.0) * 2.0 - 1.0;
            current_seed = (current_seed.wrapping_mul(9301).wrapping_add(49297)) % 233280;
            b_slice[i] = (current_seed as f32 / 233280.0) * 2.0 - 1.0;
            
            if i + 1 < total_size {
                current_seed = (current_seed.wrapping_mul(9301).wrapping_add(49297)) % 233280;
                a_slice[i + 1] = (current_seed as f32 / 233280.0) * 2.0 - 1.0;
                current_seed = (current_seed.wrapping_mul(9301).wrapping_add(49297)) % 233280;
                b_slice[i + 1] = (current_seed as f32 / 233280.0) * 2.0 - 1.0;
            }
            
            if i + 2 < total_size {
                current_seed = (current_seed.wrapping_mul(9301).wrapping_add(49297)) % 233280;
                a_slice[i + 2] = (current_seed as f32 / 233280.0) * 2.0 - 1.0;
                current_seed = (current_seed.wrapping_mul(9301).wrapping_add(49297)) % 233280;
                b_slice[i + 2] = (current_seed as f32 / 233280.0) * 2.0 - 1.0;
            }
            
            if i + 3 < total_size {
                current_seed = (current_seed.wrapping_mul(9301).wrapping_add(49297)) % 233280;
                a_slice[i + 3] = (current_seed as f32 / 233280.0) * 2.0 - 1.0;
                current_seed = (current_seed.wrapping_mul(9301).wrapping_add(49297)) % 233280;
                b_slice[i + 3] = (current_seed as f32 / 233280.0) * 2.0 - 1.0;
            }
            
            if i + 4 < total_size {
                current_seed = (current_seed.wrapping_mul(9301).wrapping_add(49297)) % 233280;
                a_slice[i + 4] = (current_seed as f32 / 233280.0) * 2.0 - 1.0;
                current_seed = (current_seed.wrapping_mul(9301).wrapping_add(49297)) % 233280;
                b_slice[i + 4] = (current_seed as f32 / 233280.0) * 2.0 - 1.0;
            }
            
            if i + 5 < total_size {
                current_seed = (current_seed.wrapping_mul(9301).wrapping_add(49297)) % 233280;
                a_slice[i + 5] = (current_seed as f32 / 233280.0) * 2.0 - 1.0;
                current_seed = (current_seed.wrapping_mul(9301).wrapping_add(49297)) % 233280;
                b_slice[i + 5] = (current_seed as f32 / 233280.0) * 2.0 - 1.0;
            }
            
            if i + 6 < total_size {
                current_seed = (current_seed.wrapping_mul(9301).wrapping_add(49297)) % 233280;
                a_slice[i + 6] = (current_seed as f32 / 233280.0) * 2.0 - 1.0;
                current_seed = (current_seed.wrapping_mul(9301).wrapping_add(49297)) % 233280;
                b_slice[i + 6] = (current_seed as f32 / 233280.0) * 2.0 - 1.0;
            }
            
            if i + 7 < total_size {
                current_seed = (current_seed.wrapping_mul(9301).wrapping_add(49297)) % 233280;
                a_slice[i + 7] = (current_seed as f32 / 233280.0) * 2.0 - 1.0;
                current_seed = (current_seed.wrapping_mul(9301).wrapping_add(49297)) % 233280;
                b_slice[i + 7] = (current_seed as f32 / 233280.0) * 2.0 - 1.0;
            }
        }
    }
}

/// Hyper-optimized batch dot product with perfect SIMD alignment
#[wasm_bindgen]
pub fn batch_dot_product_hyper_optimized(
    a_ptr: *const f32,
    b_ptr: *const f32,
    results_ptr: *mut f32,
    vector_length: usize,
    num_pairs: usize
) {
    unsafe {
        for i in 0..num_pairs {
            let a_offset = i * vector_length;
            let b_offset = i * vector_length;
            
            let a_slice = std::slice::from_raw_parts(a_ptr.add(a_offset), vector_length);
            let b_slice = std::slice::from_raw_parts(b_ptr.add(b_offset), vector_length);
            
            // Use hyper-optimized SIMD for all vector sizes
            #[cfg(target_arch = "wasm32")]
            {
                if vector_length >= 16 {
                    // Process 16 elements at once using 4 SIMD registers
                    let mut sum1 = f32x4_splat(0.0);
                    let mut sum2 = f32x4_splat(0.0);
                    let mut sum3 = f32x4_splat(0.0);
                    let mut sum4 = f32x4_splat(0.0);
                    
                    let chunks = vector_length / 16;
                    
                    for j in 0..chunks {
                        let base = j * 16;
                        
                        let a_vec1 = v128_load(a_slice.as_ptr().add(base) as *const v128);
                        let b_vec1 = v128_load(b_slice.as_ptr().add(base) as *const v128);
                        let prod1 = f32x4_mul(a_vec1, b_vec1);
                        sum1 = f32x4_add(sum1, prod1);
                        
                        let a_vec2 = v128_load(a_slice.as_ptr().add(base + 4) as *const v128);
                        let b_vec2 = v128_load(b_slice.as_ptr().add(base + 4) as *const v128);
                        let prod2 = f32x4_mul(a_vec2, b_vec2);
                        sum2 = f32x4_add(sum2, prod2);
                        
                        let a_vec3 = v128_load(a_slice.as_ptr().add(base + 8) as *const v128);
                        let b_vec3 = v128_load(b_slice.as_ptr().add(base + 8) as *const v128);
                        let prod3 = f32x4_mul(a_vec3, b_vec3);
                        sum3 = f32x4_add(sum3, prod3);
                        
                        let a_vec4 = v128_load(a_slice.as_ptr().add(base + 12) as *const v128);
                        let b_vec4 = v128_load(b_slice.as_ptr().add(base + 12) as *const v128);
                        let prod4 = f32x4_mul(a_vec4, b_vec4);
                        sum4 = f32x4_add(sum4, prod4);
                    }
                    
                    // Combine all SIMD sums
                    let combined1 = f32x4_add(sum1, sum2);
                    let combined2 = f32x4_add(sum3, sum4);
                    let final_sum = f32x4_add(combined1, combined2);
                    
                    let mut result = f32x4_extract_lane::<0>(final_sum) + 
                                   f32x4_extract_lane::<1>(final_sum) + 
                                   f32x4_extract_lane::<2>(final_sum) + 
                                   f32x4_extract_lane::<3>(final_sum);
                    
                    // Handle remaining elements
                    for j in (chunks * 16)..vector_length {
                        result += a_slice[j] * b_slice[j];
                    }
                    
                    *results_ptr.add(i) = result;
                } else {
                    // Fallback to regular SIMD for smaller vectors
                    let result = simd_dot_product(a_slice, b_slice);
                    *results_ptr.add(i) = result;
                }
            }
            
            #[cfg(not(target_arch = "wasm32"))]
            {
                let mut sum = 0.0;
                for j in 0..vector_length {
                    sum += a_slice[j] * b_slice[j];
                }
                *results_ptr.add(i) = sum;
            }
        }
    }
}

/// Parallel version of hyper-optimized batch dot product using Rayon par_iter
#[wasm_bindgen]
pub fn batch_dot_product_hyper_optimized_parallel(
    a_ptr: *const f32,
    b_ptr: *const f32,
    results_ptr: *mut f32,
    vector_length: usize,
    num_pairs: usize
) {
    unsafe {
        // Convert raw pointers to slices for safe parallel access
        let a_data = std::slice::from_raw_parts(a_ptr, num_pairs * vector_length);
        let b_data = std::slice::from_raw_parts(b_ptr, num_pairs * vector_length);
        let results = std::slice::from_raw_parts_mut(results_ptr, num_pairs);
        
        // Simple parallel iteration - let Rayon handle chunking automatically
        results
            .par_iter_mut()
            .enumerate()
            .for_each(|(i, result)| {
                let a_offset = i * vector_length;
                let b_offset = i * vector_length;
                
                // Use scalar dot product for now to avoid alignment issues
                let mut sum = 0.0_f32;
                for j in 0..vector_length {
                    sum += a_data[a_offset + j] * b_data[b_offset + j];
                }
                *result = sum;
            });
    }
}

/// Ultra-simple batch dot product matching the optimized C implementation pattern
/// Direct translation of the 35ms/100k C code for maximum performance
#[wasm_bindgen]
pub fn batch_dot_product_ultra_simple(
    a_ptr: *const f32,
    b_ptr: *const f32,
    results_ptr: *mut f32,
    vector_length: usize,
    num_pairs: usize
) {
    unsafe {
        for i in 0..num_pairs {
            let a_offset = i * vector_length;
            let b_offset = i * vector_length;
            
            let a_slice = std::slice::from_raw_parts(a_ptr.add(a_offset), vector_length);
            let b_slice = std::slice::from_raw_parts(b_ptr.add(b_offset), vector_length);
            
            #[cfg(target_arch = "wasm32")]
            {
                // Direct translation of the C code - single accumulator, simple loop
                let mut sum = f32x4_splat(0.0);
                
                // Process in chunks of 4, memory/instruction alignment
                let mut j = 0;
                while j + 4 <= vector_length {
                    let a_vec = v128_load(a_slice.as_ptr().add(j) as *const v128);
                    let b_vec = v128_load(b_slice.as_ptr().add(j) as *const v128);
                    sum = f32x4_add(sum, f32x4_mul(a_vec, b_vec));
                    j += 4;
                }
                
                // Extract from the SIMD register and sum up directly
                let mut result = f32x4_extract_lane::<0>(sum) + 
                               f32x4_extract_lane::<1>(sum) + 
                               f32x4_extract_lane::<2>(sum) + 
                               f32x4_extract_lane::<3>(sum);
                
                // Handle remaining elements
                while j < vector_length {
                    result += a_slice[j] * b_slice[j];
                    j += 1;
                }
                
                *results_ptr.add(i) = result;
            }
            
            #[cfg(not(target_arch = "wasm32"))]
            {
                let mut sum = 0.0;
                for j in 0..vector_length {
                    sum += a_slice[j] * b_slice[j];
                }
                *results_ptr.add(i) = sum;
            }
        }
    }
}

/// WASM-optimized parallel SIMD batch dot product with controlled chunking  
#[wasm_bindgen]
pub fn batch_dot_product_rayon_chunked(
    a_ptr: *const f32,
    b_ptr: *const f32,
    results_ptr: *mut f32,
    vector_length: usize,
    num_pairs: usize
) {
    unsafe {
        // Convert raw pointers to slices with explicit bounds checking
        let a_data = std::slice::from_raw_parts(a_ptr, num_pairs * vector_length);
        let b_data = std::slice::from_raw_parts(b_ptr, num_pairs * vector_length);
        let results = std::slice::from_raw_parts_mut(results_ptr, num_pairs);
        
        // Use fixed chunking strategy for WASM thread safety
        let num_threads = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(4).min(8);
        let chunk_size = std::cmp::max(num_pairs / num_threads, 100); // Minimum 100 pairs per chunk
        
        // Process in parallel chunks with explicit bounds
        results.par_chunks_mut(chunk_size)
               .enumerate()
               .for_each(|(chunk_idx, chunk)| {
                   let start_idx = chunk_idx * chunk_size;
                   
                   for (local_idx, result) in chunk.iter_mut().enumerate() {
                       let i = start_idx + local_idx;
                       
                       // Bounds check - critical for WASM
                       if i >= num_pairs {
                           break;
                       }
                       
                       let a_start = i * vector_length;
                       let a_end = a_start + vector_length;
                       
                       // Additional bounds validation
                       if a_end > a_data.len() || a_end > b_data.len() {
                           *result = 0.0; // Safe fallback
                           continue;
                       }
                       
                       let a_slice = &a_data[a_start..a_end];
                       let b_slice = &b_data[a_start..a_end];
                       
                       // SIMD implementation with WASM-safe patterns
                       #[cfg(target_arch = "wasm32")]
                       {
                           let mut sum = f32x4_splat(0.0);
                           let mut j = 0;
                           
                           // Process in SIMD chunks of 4
                           while j + 4 <= vector_length {
                               // Use safe pointer arithmetic
                               let a_ptr_j = a_slice.as_ptr().add(j);
                               let b_ptr_j = b_slice.as_ptr().add(j);
                               
                               let a_vec = v128_load(a_ptr_j as *const v128);
                               let b_vec = v128_load(b_ptr_j as *const v128);
                               sum = f32x4_add(sum, f32x4_mul(a_vec, b_vec));
                               j += 4;
                           }
                           
                           // Extract and sum SIMD lanes
                           let mut dot_result = f32x4_extract_lane::<0>(sum) + 
                                              f32x4_extract_lane::<1>(sum) + 
                                              f32x4_extract_lane::<2>(sum) + 
                                              f32x4_extract_lane::<3>(sum);
                           
                           // Handle remaining elements with bounds check
                           while j < vector_length {
                               dot_result += a_slice[j] * b_slice[j];
                               j += 1;
                           }
                           
                           *result = dot_result;
                       }
                       
                       #[cfg(not(target_arch = "wasm32"))]
                       {
                           let mut sum = 0.0;
                           for j in 0..vector_length {
                               sum += a_slice[j] * b_slice[j];
                           }
                           *result = sum;
                       }
                   }
               });
    }
}

/// Ultra-optimized batch dot product with aggressive SIMD and loop unrolling
/// Designed to match C/Emscripten performance levels (5+ GFLOPS)
#[wasm_bindgen]
pub fn batch_dot_product_ultra_optimized(
    a_ptr: *const f32,
    b_ptr: *const f32,
    results_ptr: *mut f32,
    vector_length: usize,
    num_pairs: usize
) {
    unsafe {
        let a_data = std::slice::from_raw_parts(a_ptr, num_pairs * vector_length);
        let b_data = std::slice::from_raw_parts(b_ptr, num_pairs * vector_length);
        let results = std::slice::from_raw_parts_mut(results_ptr, num_pairs);
        
        // Ultra-optimized SIMD with aggressive loop unrolling
        #[cfg(target_arch = "wasm32")]
        {
            for i in 0..num_pairs {
                let a_start = i * vector_length;
                let a_slice = &a_data[a_start..a_start + vector_length];
                let b_slice = &b_data[a_start..a_start + vector_length];
                
                let mut sum1 = f32x4_splat(0.0);
                let mut sum2 = f32x4_splat(0.0);
                let mut sum3 = f32x4_splat(0.0);
                let mut sum4 = f32x4_splat(0.0);
                
                let mut j = 0;
                let chunks = vector_length / 16; // Process 16 elements per iteration
                
                // Aggressive loop unrolling - 16 elements (4 SIMD ops) per iteration
                for _ in 0..chunks {
                    let a_ptr_j = a_slice.as_ptr().add(j);
                    let b_ptr_j = b_slice.as_ptr().add(j);
                    
                    // Load 4 SIMD vectors (16 f32 values) at once
                    let a_vec1 = v128_load(a_ptr_j as *const v128);
                    let b_vec1 = v128_load(b_ptr_j as *const v128);
                    
                    let a_vec2 = v128_load(a_ptr_j.add(4) as *const v128);
                    let b_vec2 = v128_load(b_ptr_j.add(4) as *const v128);
                    
                    let a_vec3 = v128_load(a_ptr_j.add(8) as *const v128);
                    let b_vec3 = v128_load(b_ptr_j.add(8) as *const v128);
                    
                    let a_vec4 = v128_load(a_ptr_j.add(12) as *const v128);
                    let b_vec4 = v128_load(b_ptr_j.add(12) as *const v128);
                    
                    // Parallel multiply-accumulate
                    sum1 = f32x4_add(sum1, f32x4_mul(a_vec1, b_vec1));
                    sum2 = f32x4_add(sum2, f32x4_mul(a_vec2, b_vec2));
                    sum3 = f32x4_add(sum3, f32x4_mul(a_vec3, b_vec3));
                    sum4 = f32x4_add(sum4, f32x4_mul(a_vec4, b_vec4));
                    
                    j += 16;
                }
                
                // Combine the 4 SIMD accumulators
                let sum_combined = f32x4_add(f32x4_add(sum1, sum2), f32x4_add(sum3, sum4));
                
                let mut dot_result = f32x4_extract_lane::<0>(sum_combined) + 
                                   f32x4_extract_lane::<1>(sum_combined) + 
                                   f32x4_extract_lane::<2>(sum_combined) + 
                                   f32x4_extract_lane::<3>(sum_combined);
                
                // Handle remaining elements with 4-element SIMD
                while j + 4 <= vector_length {
                    let a_vec = v128_load(a_slice.as_ptr().add(j) as *const v128);
                    let b_vec = v128_load(b_slice.as_ptr().add(j) as *const v128);
                    let prod = f32x4_mul(a_vec, b_vec);
                    
                    dot_result += f32x4_extract_lane::<0>(prod) + 
                                 f32x4_extract_lane::<1>(prod) + 
                                 f32x4_extract_lane::<2>(prod) + 
                                 f32x4_extract_lane::<3>(prod);
                    j += 4;
                }
                
                // Handle final scalar elements
                while j < vector_length {
                    dot_result += a_slice[j] * b_slice[j];
                    j += 1;
                }
                
                results[i] = dot_result;
            }
        }
        
        #[cfg(not(target_arch = "wasm32"))]
        {
            for i in 0..num_pairs {
                let a_start = i * vector_length;
                let mut sum = 0.0;
                for j in 0..vector_length {
                    sum += a_data[a_start + j] * b_data[a_start + j];
                }
                results[i] = sum;
            }
        }
    }
}

/// Memory-pool optimized parallel version with zero allocation overhead
/// Uses all available cores with optimal chunking and ultra-optimized SIMD
#[wasm_bindgen]
pub fn batch_dot_product_parallel_ultra_optimized(
    a_ptr: *const f32,
    b_ptr: *const f32,
    results_ptr: *mut f32,
    vector_length: usize,
    num_pairs: usize
) {
    unsafe {
        let a_data = std::slice::from_raw_parts(a_ptr, num_pairs * vector_length);
        let b_data = std::slice::from_raw_parts(b_ptr, num_pairs * vector_length);
        let results = std::slice::from_raw_parts_mut(results_ptr, num_pairs);
        
        // Use smaller threshold for parallel to utilize all cores
        if num_pairs < 500 {
            // For smaller workloads, use the ultra-optimized sequential version
            batch_dot_product_c_style(a_ptr, b_ptr, results_ptr, vector_length, num_pairs);
            return;
        }
        
        // Determine optimal chunk size for maximum core utilization
        // Aim for 8-16 chunks to keep all cores busy
        let num_cores = 8; // We know we have 8 cores configured
        let min_chunk_size = 64; // Minimum chunk size to avoid overhead
        let ideal_chunks = num_cores * 2; // 2x cores for better load balancing
        let chunk_size = std::cmp::max(min_chunk_size, num_pairs / ideal_chunks);
        
        // Use par_chunks for optimal parallel processing
        results.par_chunks_mut(chunk_size)
               .enumerate()
               .for_each(|(chunk_idx, chunk_results)| {
                   let chunk_start = chunk_idx * chunk_size;
                   
                   #[cfg(target_arch = "wasm32")]
                   {
                       // Ultra-optimized SIMD processing for each chunk
                       for (local_idx, result) in chunk_results.iter_mut().enumerate() {
                           let global_idx = chunk_start + local_idx;
                           if global_idx >= num_pairs { break; }
                           
                           let a_start = global_idx * vector_length;
                           let a_slice = &a_data[a_start..a_start + vector_length];
                           let b_slice = &b_data[a_start..a_start + vector_length];
                           
                           // Use same ultra-optimized SIMD as sequential version
                           let mut sum1 = f32x4_splat(0.0);
                           let mut sum2 = f32x4_splat(0.0);
                           let mut sum3 = f32x4_splat(0.0);
                           let mut sum4 = f32x4_splat(0.0);
                           
                           // Process 16 elements at once
                           let chunks_16 = vector_length / 16;
                           for j in 0..chunks_16 {
                               let base = j * 16;
                               let a_ptr_j = a_slice.as_ptr().add(base);
                               let b_ptr_j = b_slice.as_ptr().add(base);
                               
                               let a_vec1 = v128_load(a_ptr_j as *const v128);
                               let b_vec1 = v128_load(b_ptr_j as *const v128);
                               let a_vec2 = v128_load(a_ptr_j.add(4) as *const v128);
                               let b_vec2 = v128_load(b_ptr_j.add(4) as *const v128);
                               let a_vec3 = v128_load(a_ptr_j.add(8) as *const v128);
                               let b_vec3 = v128_load(b_ptr_j.add(8) as *const v128);
                               let a_vec4 = v128_load(a_ptr_j.add(12) as *const v128);
                               let b_vec4 = v128_load(b_ptr_j.add(12) as *const v128);
                               
                               sum1 = f32x4_add(sum1, f32x4_mul(a_vec1, b_vec1));
                               sum2 = f32x4_add(sum2, f32x4_mul(a_vec2, b_vec2));
                               sum3 = f32x4_add(sum3, f32x4_mul(a_vec3, b_vec3));
                               sum4 = f32x4_add(sum4, f32x4_mul(a_vec4, b_vec4));
                           }
                           
                           let combined1 = f32x4_add(sum1, sum2);
                           let combined2 = f32x4_add(sum3, sum4);
                           let final_sum = f32x4_add(combined1, combined2);
                           
                           let mut dot_result = f32x4_extract_lane::<0>(final_sum) + 
                                              f32x4_extract_lane::<1>(final_sum) + 
                                              f32x4_extract_lane::<2>(final_sum) + 
                                              f32x4_extract_lane::<3>(final_sum);
                           
                           // Process remaining elements in chunks of 4
                           let remaining_start = chunks_16 * 16;
                           let chunks_4 = (vector_length - remaining_start) / 4;
                           for j in 0..chunks_4 {
                               let idx = remaining_start + j * 4;
                               let a_vec = v128_load(a_slice.as_ptr().add(idx) as *const v128);
                               let b_vec = v128_load(b_slice.as_ptr().add(idx) as *const v128);
                               let prod = f32x4_mul(a_vec, b_vec);
                               
                               dot_result += f32x4_extract_lane::<0>(prod) + 
                                            f32x4_extract_lane::<1>(prod) + 
                                            f32x4_extract_lane::<2>(prod) + 
                                            f32x4_extract_lane::<3>(prod);
                           }
                           
                           // Handle final remaining elements
                           let final_start = remaining_start + chunks_4 * 4;
                           for j in final_start..vector_length {
                               dot_result += a_slice[j] * b_slice[j];
                           }
                           
                           *result = dot_result;
                       }
                   }
                   
                   #[cfg(not(target_arch = "wasm32"))]
                   {
                       for (local_idx, result) in chunk_results.iter_mut().enumerate() {
                           let global_idx = chunk_start + local_idx;
                           if global_idx >= num_pairs { break; }
                           
                           let a_start = global_idx * vector_length;
                           let mut sum = 0.0;
                           for j in 0..vector_length {
                               sum += a_data[a_start + j] * b_data[a_start + j];
                           }
                           *result = sum;
                       }
                   }
               });
    }
}

/// Direct C-style implementation matching the provided reference
/// Ultra-optimized for sequential performance using aggressive SIMD and loop unrolling
#[wasm_bindgen]
pub fn batch_dot_product_c_style(
    a_ptr: *const f32,
    b_ptr: *const f32,
    results_ptr: *mut f32,
    vector_length: usize,
    num_pairs: usize
) {
    unsafe {
        #[cfg(target_arch = "wasm32")]
        {
            // Ultra-optimized sequential processing with aggressive SIMD
            for i in 0..num_pairs {
                let a_start = i * vector_length;
                let b_start = i * vector_length;
                
                let a_vec_ptr = a_ptr.add(a_start);
                let b_vec_ptr = b_ptr.add(b_start);
                
                // Use 4 SIMD accumulators for maximum performance
                let mut sum1 = f32x4_splat(0.0);
                let mut sum2 = f32x4_splat(0.0);
                let mut sum3 = f32x4_splat(0.0);
                let mut sum4 = f32x4_splat(0.0);
                
                // Process 16 elements at once for ultra-wide SIMD
                let chunks_16 = vector_length / 16;
                for j in 0..chunks_16 {
                    let idx = j * 16;
                    
                    // Load and process 4 SIMD vectors in parallel
                    let a_vec1 = v128_load(a_vec_ptr.add(idx) as *const v128);
                    let b_vec1 = v128_load(b_vec_ptr.add(idx) as *const v128);
                    let a_vec2 = v128_load(a_vec_ptr.add(idx + 4) as *const v128);
                    let b_vec2 = v128_load(b_vec_ptr.add(idx + 4) as *const v128);
                    let a_vec3 = v128_load(a_vec_ptr.add(idx + 8) as *const v128);
                    let b_vec3 = v128_load(b_vec_ptr.add(idx + 8) as *const v128);
                    let a_vec4 = v128_load(a_vec_ptr.add(idx + 12) as *const v128);
                    let b_vec4 = v128_load(b_vec_ptr.add(idx + 12) as *const v128);
                    
                    // Fused multiply-add operations
                    sum1 = f32x4_add(sum1, f32x4_mul(a_vec1, b_vec1));
                    sum2 = f32x4_add(sum2, f32x4_mul(a_vec2, b_vec2));
                    sum3 = f32x4_add(sum3, f32x4_mul(a_vec3, b_vec3));
                    sum4 = f32x4_add(sum4, f32x4_mul(a_vec4, b_vec4));
                }
                
                // Combine SIMD accumulators
                let combined1 = f32x4_add(sum1, sum2);
                let combined2 = f32x4_add(sum3, sum4);
                let final_sum = f32x4_add(combined1, combined2);
                
                let mut result = f32x4_extract_lane::<0>(final_sum) + 
                               f32x4_extract_lane::<1>(final_sum) + 
                               f32x4_extract_lane::<2>(final_sum) + 
                               f32x4_extract_lane::<3>(final_sum);
                
                // Process remaining elements in chunks of 4
                let remaining_start = chunks_16 * 16;
                let chunks_4 = (vector_length - remaining_start) / 4;
                for j in 0..chunks_4 {
                    let idx = remaining_start + j * 4;
                    let a_vec = v128_load(a_vec_ptr.add(idx) as *const v128);
                    let b_vec = v128_load(b_vec_ptr.add(idx) as *const v128);
                    let prod = f32x4_mul(a_vec, b_vec);
                    
                    result += f32x4_extract_lane::<0>(prod) + 
                             f32x4_extract_lane::<1>(prod) + 
                             f32x4_extract_lane::<2>(prod) + 
                             f32x4_extract_lane::<3>(prod);
                }
                
                // Handle final remaining elements
                let final_start = remaining_start + chunks_4 * 4;
                for j in final_start..vector_length {
                    result += *a_vec_ptr.add(j) * *b_vec_ptr.add(j);
                }
                
                *results_ptr.add(i) = result;
            }
        }
        
        #[cfg(not(target_arch = "wasm32"))]
        {
            let a_data = std::slice::from_raw_parts(a_ptr, num_pairs * vector_length);
            let b_data = std::slice::from_raw_parts(b_ptr, num_pairs * vector_length);
            let results = std::slice::from_raw_parts_mut(results_ptr, num_pairs);
            
            for i in 0..num_pairs {
                let a_start = i * vector_length;
                let mut sum = 0.0;
                for j in 0..vector_length {
                    sum += a_data[a_start + j] * b_data[a_start + j];
                }
                results[i] = sum;
            }
        }
    }
}
