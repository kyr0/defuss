use wasm_bindgen::prelude::*;

/// Ultra-high-performance zero-copy batch dot product that operates directly on JS memory
/// This avoids all WASM memory allocation and operates on the input buffers directly
#[wasm_bindgen]
pub fn batch_dot_product_zero_allocation(
    vectors_a_ptr: usize,  // Byte pointer
    vectors_b_ptr: usize,  // Byte pointer
    results_ptr: usize,    // Byte pointer
    vector_length: usize,
    num_pairs: usize,
) -> i32 {
    // Input validation
    if vectors_a_ptr == 0 || vectors_b_ptr == 0 || results_ptr == 0 {
        return -1; // Null pointer error
    }
    
    if vector_length == 0 || num_pairs == 0 {
        return -2; // Invalid dimensions
    }
    
    unsafe {
        // Convert byte pointers to f32 pointers
        let vectors_a_ptr = vectors_a_ptr as *const f32;
        let vectors_b_ptr = vectors_b_ptr as *const f32;
        let results_ptr = results_ptr as *mut f32;
        
        // Create slices directly from the input pointers (zero-copy)
        let vectors_a = std::slice::from_raw_parts(vectors_a_ptr, vector_length * num_pairs);
        let vectors_b = std::slice::from_raw_parts(vectors_b_ptr, vector_length * num_pairs);
        let results = std::slice::from_raw_parts_mut(results_ptr, num_pairs);
        
        // Use the most optimized dot product function for each pair
        for i in 0..num_pairs {
            let a_start = i * vector_length;
            let b_start = i * vector_length;
            let a_end = a_start + vector_length;
            let b_end = b_start + vector_length;
            
            let a_slice = &vectors_a[a_start..a_end];
            let b_slice = &vectors_b[b_start..b_end];
            
            results[i] = ultra_simd_dot_product(a_slice, b_slice);
        }
    }
    
    0 // Success
}

/// Ultra-optimized SIMD dot product with aggressive unrolling and prefetching
#[inline(always)]
fn ultra_simd_dot_product(a: &[f32], b: &[f32]) -> f32 {
    let len = a.len();
    
    #[cfg(target_arch = "wasm32")]
    {
        use std::arch::wasm32::*;
        
        // Use 8 SIMD accumulators for maximum parallelism
        let mut sum1 = f32x4_splat(0.0);
        let mut sum2 = f32x4_splat(0.0);
        let mut sum3 = f32x4_splat(0.0);
        let mut sum4 = f32x4_splat(0.0);
        let mut sum5 = f32x4_splat(0.0);
        let mut sum6 = f32x4_splat(0.0);
        let mut sum7 = f32x4_splat(0.0);
        let mut sum8 = f32x4_splat(0.0);
        
        // Process 32 elements at once using 8 SIMD registers (ultra-wide unrolling)
        let chunks_32 = len / 32;
        
        unsafe {
            let a_ptr = a.as_ptr();
            let b_ptr = b.as_ptr();
            
            for i in 0..chunks_32 {
                let base = i * 32;
                let a_base = a_ptr.add(base);
                let b_base = b_ptr.add(base);
                
                // Load and process 32 elements in parallel with 8 SIMD operations
                let a1 = v128_load(a_base as *const v128);
                let b1 = v128_load(b_base as *const v128);
                let a2 = v128_load(a_base.add(4) as *const v128);
                let b2 = v128_load(b_base.add(4) as *const v128);
                let a3 = v128_load(a_base.add(8) as *const v128);
                let b3 = v128_load(b_base.add(8) as *const v128);
                let a4 = v128_load(a_base.add(12) as *const v128);
                let b4 = v128_load(b_base.add(12) as *const v128);
                let a5 = v128_load(a_base.add(16) as *const v128);
                let b5 = v128_load(b_base.add(16) as *const v128);
                let a6 = v128_load(a_base.add(20) as *const v128);
                let b6 = v128_load(b_base.add(20) as *const v128);
                let a7 = v128_load(a_base.add(24) as *const v128);
                let b7 = v128_load(b_base.add(24) as *const v128);
                let a8 = v128_load(a_base.add(28) as *const v128);
                let b8 = v128_load(b_base.add(28) as *const v128);
                
                // Fused multiply-add for maximum throughput
                sum1 = f32x4_add(sum1, f32x4_mul(a1, b1));
                sum2 = f32x4_add(sum2, f32x4_mul(a2, b2));
                sum3 = f32x4_add(sum3, f32x4_mul(a3, b3));
                sum4 = f32x4_add(sum4, f32x4_mul(a4, b4));
                sum5 = f32x4_add(sum5, f32x4_mul(a5, b5));
                sum6 = f32x4_add(sum6, f32x4_mul(a6, b6));
                sum7 = f32x4_add(sum7, f32x4_mul(a7, b7));
                sum8 = f32x4_add(sum8, f32x4_mul(a8, b8));
            }
        }
        
        // Combine all 8 SIMD accumulators
        let combined1 = f32x4_add(f32x4_add(sum1, sum2), f32x4_add(sum3, sum4));
        let combined2 = f32x4_add(f32x4_add(sum5, sum6), f32x4_add(sum7, sum8));
        let final_sum = f32x4_add(combined1, combined2);
        
        // Extract and sum the final SIMD results
        let mut sum = f32x4_extract_lane::<0>(final_sum) +
                     f32x4_extract_lane::<1>(final_sum) +
                     f32x4_extract_lane::<2>(final_sum) +
                     f32x4_extract_lane::<3>(final_sum);
        
        // Process remaining chunks of 16
        let processed = chunks_32 * 32;
        let remaining = len - processed;
        let chunks_16 = remaining / 16;
        
        if chunks_16 > 0 {
            let mut sum1 = f32x4_splat(0.0);
            let mut sum2 = f32x4_splat(0.0);
            let mut sum3 = f32x4_splat(0.0);
            let mut sum4 = f32x4_splat(0.0);
            
            unsafe {
                for i in 0..chunks_16 {
                    let base = processed + i * 16;
                    let a_base = a.as_ptr().add(base);
                    let b_base = b.as_ptr().add(base);
                    
                    let a1 = v128_load(a_base as *const v128);
                    let b1 = v128_load(b_base as *const v128);
                    let a2 = v128_load(a_base.add(4) as *const v128);
                    let b2 = v128_load(b_base.add(4) as *const v128);
                    let a3 = v128_load(a_base.add(8) as *const v128);
                    let b3 = v128_load(b_base.add(8) as *const v128);
                    let a4 = v128_load(a_base.add(12) as *const v128);
                    let b4 = v128_load(b_base.add(12) as *const v128);
                    
                    sum1 = f32x4_add(sum1, f32x4_mul(a1, b1));
                    sum2 = f32x4_add(sum2, f32x4_mul(a2, b2));
                    sum3 = f32x4_add(sum3, f32x4_mul(a3, b3));
                    sum4 = f32x4_add(sum4, f32x4_mul(a4, b4));
                }
            }
            
            let combined = f32x4_add(f32x4_add(sum1, sum2), f32x4_add(sum3, sum4));
            sum += f32x4_extract_lane::<0>(combined) +
                   f32x4_extract_lane::<1>(combined) +
                   f32x4_extract_lane::<2>(combined) +
                   f32x4_extract_lane::<3>(combined);
        }
        
        // Process remaining chunks of 4
        let processed16 = processed + chunks_16 * 16;
        let remaining4 = len - processed16;
        let chunks_4 = remaining4 / 4;
        
        if chunks_4 > 0 {
            let mut sum_vec = f32x4_splat(0.0);
            unsafe {
                for i in 0..chunks_4 {
                    let base = processed16 + i * 4;
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
        
        // Handle final remainder elements (less than 4)
        let remainder_start = processed16 + chunks_4 * 4;
        for i in remainder_start..len {
            sum += a[i] * b[i];
        }
        
        sum
    }
    
    #[cfg(not(target_arch = "wasm32"))]
    {
        // Fallback for non-WASM targets
        a.iter().zip(b.iter()).map(|(a, b)| a * b).sum()
    }
}

/// Parallel version using Rayon with zero allocation
#[wasm_bindgen]
pub fn batch_dot_product_zero_allocation_parallel(
    vectors_a_ptr: usize,  // Byte pointer
    vectors_b_ptr: usize,  // Byte pointer
    results_ptr: usize,    // Byte pointer
    vector_length: usize,
    num_pairs: usize,
) -> i32 {
    // Input validation
    if vectors_a_ptr == 0 || vectors_b_ptr == 0 || results_ptr == 0 {
        return -1;
    }
    
    if vector_length == 0 || num_pairs == 0 {
        return -2;
    }
    
    use rayon::prelude::*;
    
    unsafe {
        // Convert byte pointers to f32 pointers
        let vectors_a_ptr = vectors_a_ptr as *const f32;
        let vectors_b_ptr = vectors_b_ptr as *const f32;
        let results_ptr = results_ptr as *mut f32;
        
        let vectors_a = std::slice::from_raw_parts(vectors_a_ptr, vector_length * num_pairs);
        let vectors_b = std::slice::from_raw_parts(vectors_b_ptr, vector_length * num_pairs);
        let results = std::slice::from_raw_parts_mut(results_ptr, num_pairs);
        
        // Use parallel iterator for maximum throughput
        results.par_iter_mut().enumerate().for_each(|(i, result)| {
            let a_start = i * vector_length;
            let a_end = a_start + vector_length;
            let b_start = i * vector_length;
            let b_end = b_start + vector_length;
            
            let a_slice = &vectors_a[a_start..a_end];
            let b_slice = &vectors_b[b_start..b_end];
            
            *result = ultra_simd_dot_product(a_slice, b_slice);
        });
    }
    
    0
}
