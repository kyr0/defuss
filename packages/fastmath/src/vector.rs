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

/// Manual memory management for efficient batch processing
/// Allocates a contiguous memory buffer for vector data
#[wasm_bindgen]
pub fn allocate_vector_buffer(size: usize) -> *mut f32 {
    let layout = std::alloc::Layout::array::<f32>(size).unwrap();
    unsafe { std::alloc::alloc(layout) as *mut f32 }
}

/// Deallocates a vector buffer
#[wasm_bindgen]
pub fn deallocate_vector_buffer(ptr: *mut f32, size: usize) {
    let layout = std::alloc::Layout::array::<f32>(size).unwrap();
    unsafe { std::alloc::dealloc(ptr as *mut u8, layout) };
}

/// Efficient batch dot product using raw pointers for minimal overhead
/// ptr_a: pointer to first buffer containing all 'a' vectors
/// ptr_b: pointer to second buffer containing all 'b' vectors  
/// results_ptr: pointer to results buffer
/// vector_length: length of each vector
/// num_pairs: number of vector pairs
#[wasm_bindgen]
pub fn vector_batch_dot_product_raw(
    ptr_a: *const f32,
    ptr_b: *const f32, 
    results_ptr: *mut f32,
    vector_length: usize,
    num_pairs: usize
) {
    unsafe {
        if num_pairs < 100 || vector_length < SIMD_THRESHOLD {
            // Single-threaded processing
            for i in 0..num_pairs {
                let base = i * vector_length;
                let a_start = ptr_a.add(base);
                let b_start = ptr_b.add(base);
                
                let mut sum = 0.0;
                if vector_length >= SIMD_THRESHOLD {
                    // SIMD processing
                    let chunks = vector_length / 4;
                    let mut simd_sum = f32x4_splat(0.0);
                    
                    for j in 0..chunks {
                        let simd_base = j * 4;
                        let a_vec = v128_load(a_start.add(simd_base) as *const v128);
                        let b_vec = v128_load(b_start.add(simd_base) as *const v128);
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
                        sum += (*a_start.add(j)) * (*b_start.add(j));
                    }
                } else {
                    // Scalar processing
                    for j in 0..vector_length {
                        sum += (*a_start.add(j)) * (*b_start.add(j));
                    }
                }
                
                *results_ptr.add(i) = sum;
            }
        } else {
            // Parallel processing using Rayon
            let a_slice = std::slice::from_raw_parts(ptr_a, vector_length * num_pairs);
            let b_slice = std::slice::from_raw_parts(ptr_b, vector_length * num_pairs);
            let results_slice = std::slice::from_raw_parts_mut(results_ptr, num_pairs);
            
            results_slice.par_iter_mut().enumerate().for_each(|(i, result)| {
                let base = i * vector_length;
                let a = &a_slice[base..base + vector_length];
                let b = &b_slice[base..base + vector_length];
                
                if vector_length >= SIMD_THRESHOLD {
                    *result = simd_dot_product(a, b);
                } else {
                    let mut sum = 0.0;
                    for j in 0..vector_length {
                        sum += a[j] * b[j];
                    }
                    *result = sum;
                }
            });
        }
    }
}

/// Get the raw pointer to WASM memory for direct access
#[wasm_bindgen]
pub fn get_memory_ptr() -> *mut u8 {
    wasm_bindgen::memory().data_ptr()
}

/// Get the size of WASM memory in bytes
#[wasm_bindgen]
pub fn get_memory_size() -> usize {
    wasm_bindgen::memory().data().len()
}

/// Copy data from JavaScript Float32Array to WASM memory at specified offset
#[wasm_bindgen]
pub fn copy_to_memory(data: &[f32], offset: usize) {
    let memory = wasm_bindgen::memory();
    let mem_slice = unsafe {
        std::slice::from_raw_parts_mut(
            memory.data_ptr().add(offset) as *mut f32,
            data.len()
        )
    };
    mem_slice.copy_from_slice(data);
}

/// Copy data from WASM memory at specified offset to JavaScript Float32Array
#[wasm_bindgen]
pub fn copy_from_memory(offset: usize, length: usize) -> Vec<f32> {
    let memory = wasm_bindgen::memory();
    let mem_slice = unsafe {
        std::slice::from_raw_parts(
            memory.data_ptr().add(offset) as *const f32,
            length
        )
    };
    mem_slice.to_vec()
}
