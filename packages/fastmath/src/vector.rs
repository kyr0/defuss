use wasm_bindgen::prelude::*;
use rayon::prelude::*;

/// Parallel vector addition: result[i] = a[i] + b[i]
#[wasm_bindgen]
pub fn vector_add(a: &[f32], b: &[f32], result: &mut [f32]) {
    assert_eq!(a.len(), b.len(), "Vector lengths must match");
    assert_eq!(a.len(), result.len(), "Result vector length must match input");

    result
        .par_iter_mut()
        .zip(a.par_iter().zip(b.par_iter()))
        .for_each(|(r, (a_val, b_val))| {
            *r = a_val + b_val;
        });
}

/// Parallel vector multiplication: result[i] = a[i] * b[i]
#[wasm_bindgen]
pub fn vector_multiply(a: &[f32], b: &[f32], result: &mut [f32]) {
    assert_eq!(a.len(), b.len(), "Vector lengths must match");
    assert_eq!(a.len(), result.len(), "Result vector length must match input");

    result
        .par_iter_mut()
        .zip(a.par_iter().zip(b.par_iter()))
        .for_each(|(r, (a_val, b_val))| {
            *r = a_val * b_val;
        });
}

/// Parallel scalar multiplication: result[i] = a[i] * scalar
#[wasm_bindgen]
pub fn vector_scale(a: &[f32], scalar: f32, result: &mut [f32]) {
    assert_eq!(a.len(), result.len(), "Vector lengths must match");

    result
        .par_iter_mut()
        .zip(a.par_iter())
        .for_each(|(r, a_val)| {
            *r = a_val * scalar;
        });
}

/// Parallel dot product: sum of a[i] * b[i]
#[wasm_bindgen]
pub fn vector_dot_product(a: &[f32], b: &[f32]) -> f32 {
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

    result
        .par_iter_mut()
        .zip(a.par_iter().zip(b.par_iter()))
        .for_each(|(r, (a_val, b_val))| {
            *r = a_val - b_val;
        });
}

/// Parallel vector magnitude calculation: sqrt(sum(a[i]^2))
#[wasm_bindgen]
pub fn vector_magnitude(a: &[f32]) -> f32 {
    a.par_iter()
        .map(|x| x * x)
        .sum::<f32>()
        .sqrt()
}
