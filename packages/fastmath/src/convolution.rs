use wasm_bindgen::prelude::*;
use rayon::prelude::*;

/// Parallel convolution for signal processing
#[wasm_bindgen]
pub fn convolution(
    signal: &[f32],     // Input signal
    kernel: &[f32],     // Convolution kernel
    result: &mut [f32], // Output signal
) {
    let signal_len = signal.len();
    let kernel_len = kernel.len();
    let result_len = signal_len + kernel_len - 1;
    
    assert_eq!(result.len(), result_len, "Result length must be signal_len + kernel_len - 1");

    result
        .par_iter_mut()
        .enumerate()
        .for_each(|(n, output)| {
            let mut sum = 0.0;
            for m in 0..kernel_len {
                if n >= m && (n - m) < signal_len {
                    sum += signal[n - m] * kernel[m];
                }
            }
            *output = sum;
        });
}

/// Parallel cross-correlation (similar to convolution but without kernel flip)
#[wasm_bindgen]
pub fn cross_correlation(
    signal: &[f32],     // Input signal
    template: &[f32],   // Template to correlate with
    result: &mut [f32], // Output correlation
) {
    let signal_len = signal.len();
    let template_len = template.len();
    let result_len = signal_len - template_len + 1;
    
    assert!(template_len <= signal_len, "Template must be shorter than or equal to signal");
    assert_eq!(result.len(), result_len, "Result length must be signal_len - template_len + 1");

    result
        .par_iter_mut()
        .enumerate()
        .for_each(|(i, output)| {
            let mut sum = 0.0;
            for j in 0..template_len {
                sum += signal[i + j] * template[j];
            }
            *output = sum;
        });
}

/// Parallel 2D convolution for image processing
#[wasm_bindgen]
pub fn convolution_2d(
    image: &[f32],      // Input image (row-major order)
    kernel: &[f32],     // 2D convolution kernel (row-major order)
    result: &mut [f32], // Output image (row-major order)
    img_width: usize,   // Image width
    img_height: usize,  // Image height
    kernel_size: usize, // Kernel size (assuming square kernel)
) {
    assert_eq!(image.len(), img_width * img_height, "Image size mismatch");
    assert_eq!(kernel.len(), kernel_size * kernel_size, "Kernel size mismatch");
    assert_eq!(result.len(), img_width * img_height, "Result size mismatch");

    let half_kernel = kernel_size / 2;

    result
        .par_chunks_mut(img_width)
        .enumerate()
        .for_each(|(y, row)| {
            for x in 0..img_width {
                let mut sum = 0.0;
                
                for ky in 0..kernel_size {
                    for kx in 0..kernel_size {
                        let img_y = y as i32 + ky as i32 - half_kernel as i32;
                        let img_x = x as i32 + kx as i32 - half_kernel as i32;
                        
                        // Handle boundary conditions (zero padding)
                        if img_y >= 0 && img_y < img_height as i32 && 
                           img_x >= 0 && img_x < img_width as i32 {
                            let img_idx = img_y as usize * img_width + img_x as usize;
                            let kernel_idx = ky * kernel_size + kx;
                            sum += image[img_idx] * kernel[kernel_idx];
                        }
                    }
                }
                
                row[x] = sum;
            }
        });
}

/// Parallel auto-correlation (correlation of signal with itself)
#[wasm_bindgen]
pub fn auto_correlation(
    signal: &[f32],     // Input signal
    result: &mut [f32], // Output auto-correlation
    max_lag: usize,     // Maximum lag to compute
) {
    let signal_len = signal.len();
    assert!(max_lag < signal_len, "Max lag must be less than signal length");
    assert_eq!(result.len(), 2 * max_lag + 1, "Result length must be 2 * max_lag + 1");

    result
        .par_iter_mut()
        .enumerate()
        .for_each(|(i, output)| {
            let lag = i as i32 - max_lag as i32;
            let mut sum = 0.0;
            let mut count = 0;

            for j in 0..signal_len {
                let k = j as i32 + lag;
                if k >= 0 && k < signal_len as i32 {
                    sum += signal[j] * signal[k as usize];
                    count += 1;
                }
            }

            *output = if count > 0 { sum / count as f32 } else { 0.0 };
        });
}
