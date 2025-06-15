use wasm_bindgen::prelude::*;
use rayon::prelude::*;

/// Parallel matrix multiplication using Rayon
/// Computes C = A * B where A is m×k, B is k×n, and C is m×n
#[wasm_bindgen]
pub fn matrix_multiply(
    a: &[f32],      // Matrix A (row-major order)
    b: &[f32],      // Matrix B (row-major order)
    c: &mut [f32],  // Output matrix C (row-major order)
    m: usize,       // Rows in A and C
    k: usize,       // Columns in A, rows in B
    n: usize,       // Columns in B and C
) {
    assert_eq!(a.len(), m * k, "Matrix A size mismatch");
    assert_eq!(b.len(), k * n, "Matrix B size mismatch");
    assert_eq!(c.len(), m * n, "Matrix C size mismatch");

    // Parallel computation over rows of the result matrix
    c.par_chunks_mut(n)
        .enumerate()
        .for_each(|(i, row)| {
            for j in 0..n {
                let mut sum = 0.0;
                for l in 0..k {
                    sum += a[i * k + l] * b[l * n + j];
                }
                row[j] = sum;
            }
        });
}

/// Parallel matrix addition: C = A + B
#[wasm_bindgen]
pub fn matrix_add(
    a: &[f32],      // Matrix A (row-major order)
    b: &[f32],      // Matrix B (row-major order)
    c: &mut [f32],  // Output matrix C (row-major order)
    rows: usize,    // Number of rows
    cols: usize,    // Number of columns
) {
    let size = rows * cols;
    assert_eq!(a.len(), size, "Matrix A size mismatch");
    assert_eq!(b.len(), size, "Matrix B size mismatch");
    assert_eq!(c.len(), size, "Matrix C size mismatch");

    c.par_iter_mut()
        .zip(a.par_iter().zip(b.par_iter()))
        .for_each(|(c_val, (a_val, b_val))| {
            *c_val = a_val + b_val;
        });
}

/// Parallel matrix subtraction: C = A - B
#[wasm_bindgen]
pub fn matrix_subtract(
    a: &[f32],      // Matrix A (row-major order)
    b: &[f32],      // Matrix B (row-major order)
    c: &mut [f32],  // Output matrix C (row-major order)
    rows: usize,    // Number of rows
    cols: usize,    // Number of columns
) {
    let size = rows * cols;
    assert_eq!(a.len(), size, "Matrix A size mismatch");
    assert_eq!(b.len(), size, "Matrix B size mismatch");
    assert_eq!(c.len(), size, "Matrix C size mismatch");

    c.par_iter_mut()
        .zip(a.par_iter().zip(b.par_iter()))
        .for_each(|(c_val, (a_val, b_val))| {
            *c_val = a_val - b_val;
        });
}

/// Parallel matrix transpose: B = A^T
#[wasm_bindgen]
pub fn matrix_transpose(
    a: &[f32],      // Input matrix A (row-major order)
    b: &mut [f32],  // Output matrix B (row-major order)
    rows: usize,    // Number of rows in A
    cols: usize,    // Number of columns in A
) {
    assert_eq!(a.len(), rows * cols, "Matrix A size mismatch");
    assert_eq!(b.len(), rows * cols, "Matrix B size mismatch");

    b.par_chunks_mut(rows)
        .enumerate()
        .for_each(|(j, col)| {
            for i in 0..rows {
                col[i] = a[i * cols + j];
            }
        });
}

/// Parallel matrix scalar multiplication: B = scalar * A
#[wasm_bindgen]
pub fn matrix_scale(
    a: &[f32],      // Input matrix A (row-major order)
    scalar: f32,    // Scalar multiplier
    b: &mut [f32],  // Output matrix B (row-major order)
    rows: usize,    // Number of rows
    cols: usize,    // Number of columns
) {
    let size = rows * cols;
    assert_eq!(a.len(), size, "Matrix A size mismatch");
    assert_eq!(b.len(), size, "Matrix B size mismatch");

    b.par_iter_mut()
        .zip(a.par_iter())
        .for_each(|(b_val, a_val)| {
            *b_val = a_val * scalar;
        });
}
