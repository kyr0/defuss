use wasm_bindgen::prelude::*;
pub use wasm_bindgen_rayon::init_thread_pool;
use rayon::prelude::*;

#[inline(always)]
fn dot_product_serial(
    a_data: &[f32], 
    b_data: &[f32], 
    results: &mut [f32], 
    vector_length: usize, 
    num_pairs: usize
) {
    // bounds check to prevent panic
    let expected_data_length: usize = num_pairs * vector_length;
    if a_data.len() < expected_data_length || b_data.len() < expected_data_length || results.len() < num_pairs {
        return; // gracefully handle invalid input
    }
    
    for i in 0..num_pairs {
        let a_start = i * vector_length;
        let a_slice: &[f32] = &a_data[a_start..a_start + vector_length];
        let b_slice: &[f32] = &b_data[a_start..a_start + vector_length];
        results[i] = dot_product(a_slice, b_slice);
    }
}

#[inline(always)]
fn dot_product_parallel(
    a_data: &[f32], 
    b_data: &[f32], 
    results: &mut [f32], 
    vector_length: usize, 
    num_pairs: usize
) {
    // use smaller chunks for better parallelization - 8-core optimization
    let num_threads = rayon::current_num_threads();
    let chunk_size = std::cmp::max(16, num_pairs / (num_threads * 4));
    
    results.par_chunks_mut(chunk_size) // <-- PARALLEL SCHEDULING HAPPENS HERE (!)
        .enumerate()
        .for_each(|(chunk_idx, chunk_results)| {
            let chunk_start = chunk_idx * chunk_size;
            
            for (local_idx, result) in chunk_results.iter_mut().enumerate() {
                let global_idx = chunk_start + local_idx;
                if global_idx >= num_pairs { break; }
                
                let a_start = global_idx * vector_length;
                let a_slice: &[f32] = &a_data[a_start..a_start + vector_length];
                let b_slice: &[f32] = &b_data[a_start..a_start + vector_length];
                
                *result = dot_product(a_slice, b_slice);
            }
        });
}

/// optimized SIMD dot product with 4 accumulators to hide latency
#[inline(always)]
fn dot_product(a: &[f32], b: &[f32]) -> f32 {
    #[cfg(target_arch = "wasm32")]
    {
        use std::arch::wasm32::*;
        
        let len: usize = a.len();
        
        // use 4 accumulators to hide arithmetic latency
        let mut sum1 = f32x4_splat(0.0);
        let mut sum2 = f32x4_splat(0.0);
        let mut sum3 = f32x4_splat(0.0);
        let mut sum4 = f32x4_splat(0.0);
        
        // process 16 elements at once with full unrolling
        let chunks_16: usize = len / 16;
        
        unsafe {
            let a_ptr = a.as_ptr();
            let b_ptr = b.as_ptr();
            
            for i in 0..chunks_16 {
                let base = i * 16;
                
                // load 16 elements (4 SIMD vectors)
                let a1 = v128_load(a_ptr.add(base) as *const v128);
                let b1 = v128_load(b_ptr.add(base) as *const v128);
                let a2 = v128_load(a_ptr.add(base + 4) as *const v128);
                let b2 = v128_load(b_ptr.add(base + 4) as *const v128);
                let a3 = v128_load(a_ptr.add(base + 8) as *const v128);
                let b3 = v128_load(b_ptr.add(base + 8) as *const v128);
                let a4 = v128_load(a_ptr.add(base + 12) as *const v128);
                let b4 = v128_load(b_ptr.add(base + 12) as *const v128);
                
                // Fused multiply-add to hide latency
                sum1 = f32x4_add(sum1, f32x4_mul(a1, b1));
                sum2 = f32x4_add(sum2, f32x4_mul(a2, b2));
                sum3 = f32x4_add(sum3, f32x4_mul(a3, b3));
                sum4 = f32x4_add(sum4, f32x4_mul(a4, b4));
            }
        }
        
        // tree reduction for optimal combination
        let combined1 = f32x4_add(sum1, sum2);
        let combined2 = f32x4_add(sum3, sum4);
        let final_sum = f32x4_add(combined1, combined2);
        
        let mut result: f32 = f32x4_extract_lane::<0>(final_sum) + 
                        f32x4_extract_lane::<1>(final_sum) + 
                        f32x4_extract_lane::<2>(final_sum) + 
                        f32x4_extract_lane::<3>(final_sum);
        
        // handle remaining elements efficiently
        let remaining_start: usize = chunks_16 * 16;
        let chunks_4: usize = (len - remaining_start) / 4;
        
        if chunks_4 > 0 {
            unsafe {
                for i in 0..chunks_4 {
                    let base: usize = remaining_start + i * 4;
                    let a_vec = v128_load(a.as_ptr().add(base) as *const v128);
                    let b_vec = v128_load(b.as_ptr().add(base) as *const v128);
                    let prod = f32x4_mul(a_vec, b_vec);
                    
                    result += f32x4_extract_lane::<0>(prod) + 
                              f32x4_extract_lane::<1>(prod) + 
                              f32x4_extract_lane::<2>(prod) + 
                              f32x4_extract_lane::<3>(prod);
                }
            }
        }
        
        // final scalar elements (left-overs)
        let final_start: usize = remaining_start + chunks_4 * 4;
        for i in final_start..len {
            result += a[i] * b[i];
        }
        
        result
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
    }
}