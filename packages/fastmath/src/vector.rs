use wasm_bindgen::prelude::*;
use rayon::prelude::*;

// Threshold for switching to parallel processing
// Below this size, single-threaded is faster due to overhead
const PARALLEL_THRESHOLD: usize = 1000;
const SIMD_THRESHOLD: usize = 64; // Threshold for SIMD operations

// SIMD-optimized dot product using explicit SIMD intrinsics
#[cfg(target_arch = "wasm32")]
use std::arch::wasm32::*;

/// SIMD-optimized single-threaded dot product for f32 vectors
#[inline]
fn simd_dot_product(a: &[f32], b: &[f32]) -> f32 {
    assert_eq!(a.len(), b.len(), "Vector lengths must match");
    
    #[cfg(target_arch = "wasm32")]
    {
        let len = a.len();
        let mut sum = f32x4_splat(0.0);
        let chunks = len / 4;
        
        // Process 4 elements at a time using SIMD
        for i in 0..chunks {
            let base = i * 4;
            unsafe {
                let a_vec = v128_load(a.as_ptr().add(base) as *const v128);
                let b_vec = v128_load(b.as_ptr().add(base) as *const v128);
                let prod = f32x4_mul(a_vec, b_vec);
                sum = f32x4_add(sum, prod);
            }
        }
        
        // Extract scalar sum from SIMD register
        let mut result = f32x4_extract_lane::<0>(sum) + 
                        f32x4_extract_lane::<1>(sum) + 
                        f32x4_extract_lane::<2>(sum) + 
                        f32x4_extract_lane::<3>(sum);
        
        // Handle remaining elements
        for i in (chunks * 4)..len {
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
            // Parallel processing
            results.par_iter_mut().enumerate().for_each(|(i, result)| {
                let a_start = i * vector_length;
                let a_end = a_start + vector_length;
                let b_start = i * vector_length;
                let b_end = b_start + vector_length;
                
                let a_slice = &a_data[a_start..a_end];
                let b_slice = &b_data[b_start..b_end];
                
                *result = if vector_length >= SIMD_THRESHOLD {
                    simd_dot_product(a_slice, b_slice)
                } else {
                    let mut sum = 0.0;
                    for j in 0..vector_length {
                        sum += a_slice[j] * b_slice[j];
                    }
                    sum
                };
            });
        } else {
            // Sequential processing
            for i in 0..num_pairs {
                let a_start = i * vector_length;
                let a_end = a_start + vector_length;
                let b_start = i * vector_length;
                let b_end = b_start + vector_length;
                
                let a_slice = &a_data[a_start..a_end];
                let b_slice = &b_data[b_start..b_end];
                
                results[i] = if vector_length >= SIMD_THRESHOLD {
                    simd_dot_product(a_slice, b_slice)
                } else {
                    let mut sum = 0.0;
                    for j in 0..vector_length {
                        sum += a_slice[j] * b_slice[j];
                    }
                    sum
                };
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
