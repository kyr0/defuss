
#include <stddef.h>
#include <stdint.h>
#include <wasm_simd128.h>

// Plain (non-SIMD) version for multiple dot products
// a, b: pointers to contiguous arrays of floats
// results: pointer to output array (length num_pairs)
// vector_length: number of floats per vector
// num_pairs: number of dot products to compute
void dot_product_serial_c_plain(const float *a, const float *b, float *results, size_t vector_length, size_t num_pairs) {
    if (!a || !b || !results) return;
    for (size_t i = 0; i < num_pairs; ++i) {
        float sum = 0.0f;
        size_t offset = i * vector_length;
        for (size_t j = 0; j < vector_length; ++j) {
            sum += a[offset + j] * b[offset + j];
        }
        results[i] = sum;
    }
}

/*
Memory Layout Documentation
--------------------------
The arguments `a` and `b` are pointers to contiguous arrays of 32-bit floats (float) in WASM linear memory.
- Each array contains `dims` elements, tightly packed (no padding).
- Layout example for `a` (and similarly for `b`):
  | Index | Address offset (from a) | Value (float) |
  |-------|------------------------|--------------|
  |   0   |           0            |   a[0]       |
  |   1   |           4            |   a[1]       |
  |   2   |           8            |   a[2]       |
  |   3   |          12            |   a[3]       |
  |  ...  |         ...            |    ...       |
  |dims-1 |      4*(dims-1)        | a[dims-1]    |
- Both arrays should be at least 16-byte aligned for SIMD loads (wasm_v128_load reads 16 bytes at a time).
*/

// unroll by 4 optimized
float dot_product_c(const float *a, const float *b, size_t dims) {
    v128_t sum = wasm_f32x4_splat(0.0f);

    // process in chunks of 4, memory/instruction alignment
    for (size_t i = 0; i < dims; i += 4) {
        sum = wasm_f32x4_add(sum, 
            wasm_f32x4_mul(
                wasm_v128_load(&a[i]), 
                wasm_v128_load(&b[i])
            )
        );
    }

    // extract from the SIMD register and sum up directly
    return wasm_f32x4_extract_lane(sum, 0) + 
           wasm_f32x4_extract_lane(sum, 1) + 
           wasm_f32x4_extract_lane(sum, 2) + 
           wasm_f32x4_extract_lane(sum, 3); 
}

// aggressively optimized version for multiple dot products
void dot_product_serial_c(const float *a, const float *b, float *results, size_t vector_length, size_t num_pairs) {
    if (!a || !b || !results) return;
    // Unroll inner loop for better SIMD utilization if vector_length is a multiple of 16
    size_t i = 0;
    for (; i + 3 < num_pairs; i += 4) {
        v128_t sum0 = wasm_f32x4_splat(0.0f);
        v128_t sum1 = wasm_f32x4_splat(0.0f);
        v128_t sum2 = wasm_f32x4_splat(0.0f);
        v128_t sum3 = wasm_f32x4_splat(0.0f);
        size_t j = 0;
        for (; j + 15 < vector_length; j += 16) {
            // Unroll 4x4 = 16 floats per dot product
            sum0 = wasm_f32x4_add(sum0, wasm_f32x4_mul(wasm_v128_load(&a[(i+0)*vector_length + j + 0]), wasm_v128_load(&b[(i+0)*vector_length + j + 0])));
            sum0 = wasm_f32x4_add(sum0, wasm_f32x4_mul(wasm_v128_load(&a[(i+0)*vector_length + j + 4]), wasm_v128_load(&b[(i+0)*vector_length + j + 4])));
            sum0 = wasm_f32x4_add(sum0, wasm_f32x4_mul(wasm_v128_load(&a[(i+0)*vector_length + j + 8]), wasm_v128_load(&b[(i+0)*vector_length + j + 8])));
            sum0 = wasm_f32x4_add(sum0, wasm_f32x4_mul(wasm_v128_load(&a[(i+0)*vector_length + j + 12]), wasm_v128_load(&b[(i+0)*vector_length + j + 12])));

            sum1 = wasm_f32x4_add(sum1, wasm_f32x4_mul(wasm_v128_load(&a[(i+1)*vector_length + j + 0]), wasm_v128_load(&b[(i+1)*vector_length + j + 0])));
            sum1 = wasm_f32x4_add(sum1, wasm_f32x4_mul(wasm_v128_load(&a[(i+1)*vector_length + j + 4]), wasm_v128_load(&b[(i+1)*vector_length + j + 4])));
            sum1 = wasm_f32x4_add(sum1, wasm_f32x4_mul(wasm_v128_load(&a[(i+1)*vector_length + j + 8]), wasm_v128_load(&b[(i+1)*vector_length + j + 8])));
            sum1 = wasm_f32x4_add(sum1, wasm_f32x4_mul(wasm_v128_load(&a[(i+1)*vector_length + j + 12]), wasm_v128_load(&b[(i+1)*vector_length + j + 12])));

            sum2 = wasm_f32x4_add(sum2, wasm_f32x4_mul(wasm_v128_load(&a[(i+2)*vector_length + j + 0]), wasm_v128_load(&b[(i+2)*vector_length + j + 0])));
            sum2 = wasm_f32x4_add(sum2, wasm_f32x4_mul(wasm_v128_load(&a[(i+2)*vector_length + j + 4]), wasm_v128_load(&b[(i+2)*vector_length + j + 4])));
            sum2 = wasm_f32x4_add(sum2, wasm_f32x4_mul(wasm_v128_load(&a[(i+2)*vector_length + j + 8]), wasm_v128_load(&b[(i+2)*vector_length + j + 8])));
            sum2 = wasm_f32x4_add(sum2, wasm_f32x4_mul(wasm_v128_load(&a[(i+2)*vector_length + j + 12]), wasm_v128_load(&b[(i+2)*vector_length + j + 12])));

            sum3 = wasm_f32x4_add(sum3, wasm_f32x4_mul(wasm_v128_load(&a[(i+3)*vector_length + j + 0]), wasm_v128_load(&b[(i+3)*vector_length + j + 0])));
            sum3 = wasm_f32x4_add(sum3, wasm_f32x4_mul(wasm_v128_load(&a[(i+3)*vector_length + j + 4]), wasm_v128_load(&b[(i+3)*vector_length + j + 4])));
            sum3 = wasm_f32x4_add(sum3, wasm_f32x4_mul(wasm_v128_load(&a[(i+3)*vector_length + j + 8]), wasm_v128_load(&b[(i+3)*vector_length + j + 8])));
            sum3 = wasm_f32x4_add(sum3, wasm_f32x4_mul(wasm_v128_load(&a[(i+3)*vector_length + j + 12]), wasm_v128_load(&b[(i+3)*vector_length + j + 12])));
        }
        // Handle remaining elements for this batch of 4
        for (; j < vector_length; j += 4) {
            sum0 = wasm_f32x4_add(sum0, wasm_f32x4_mul(wasm_v128_load(&a[(i+0)*vector_length + j]), wasm_v128_load(&b[(i+0)*vector_length + j])));
            sum1 = wasm_f32x4_add(sum1, wasm_f32x4_mul(wasm_v128_load(&a[(i+1)*vector_length + j]), wasm_v128_load(&b[(i+1)*vector_length + j])));
            sum2 = wasm_f32x4_add(sum2, wasm_f32x4_mul(wasm_v128_load(&a[(i+2)*vector_length + j]), wasm_v128_load(&b[(i+2)*vector_length + j])));
            sum3 = wasm_f32x4_add(sum3, wasm_f32x4_mul(wasm_v128_load(&a[(i+3)*vector_length + j]), wasm_v128_load(&b[(i+3)*vector_length + j])));
        }
        results[i+0] = wasm_f32x4_extract_lane(sum0, 0) + wasm_f32x4_extract_lane(sum0, 1) + wasm_f32x4_extract_lane(sum0, 2) + wasm_f32x4_extract_lane(sum0, 3);
        results[i+1] = wasm_f32x4_extract_lane(sum1, 0) + wasm_f32x4_extract_lane(sum1, 1) + wasm_f32x4_extract_lane(sum1, 2) + wasm_f32x4_extract_lane(sum1, 3);
        results[i+2] = wasm_f32x4_extract_lane(sum2, 0) + wasm_f32x4_extract_lane(sum2, 1) + wasm_f32x4_extract_lane(sum2, 2) + wasm_f32x4_extract_lane(sum2, 3);
        results[i+3] = wasm_f32x4_extract_lane(sum3, 0) + wasm_f32x4_extract_lane(sum3, 1) + wasm_f32x4_extract_lane(sum3, 2) + wasm_f32x4_extract_lane(sum3, 3);
    }
    // Handle remaining dot products (if num_pairs not divisible by 4)
    for (; i < num_pairs; ++i) {
        v128_t sum = wasm_f32x4_splat(0.0f);
        size_t j = 0;
        for (; j + 15 < vector_length; j += 16) {
            sum = wasm_f32x4_add(sum, wasm_f32x4_mul(wasm_v128_load(&a[i*vector_length + j + 0]), wasm_v128_load(&b[i*vector_length + j + 0])));
            sum = wasm_f32x4_add(sum, wasm_f32x4_mul(wasm_v128_load(&a[i*vector_length + j + 4]), wasm_v128_load(&b[i*vector_length + j + 4])));
            sum = wasm_f32x4_add(sum, wasm_f32x4_mul(wasm_v128_load(&a[i*vector_length + j + 8]), wasm_v128_load(&b[i*vector_length + j + 8])));
            sum = wasm_f32x4_add(sum, wasm_f32x4_mul(wasm_v128_load(&a[i*vector_length + j + 12]), wasm_v128_load(&b[i*vector_length + j + 12])));
        }
        for (; j < vector_length; j += 4) {
            sum = wasm_f32x4_add(sum, wasm_f32x4_mul(wasm_v128_load(&a[i*vector_length + j]), wasm_v128_load(&b[i*vector_length + j])));
        }
        results[i] = wasm_f32x4_extract_lane(sum, 0) + wasm_f32x4_extract_lane(sum, 1) + wasm_f32x4_extract_lane(sum, 2) + wasm_f32x4_extract_lane(sum, 3);
    }
}