import {
  convolution_2d as convolution_2d_wasm,
  convolution as convolution_wasm,
} from "../pkg/defuss_fastmath.js";
import { convolution as convolution_js } from "./convolution.js";

export const convolution = (
  signal: Float32Array,
  kernel: Float32Array,
  result: Float32Array,
) => {
  const signalLen = signal.length;
  const kernelLen = kernel.length;

  // Precision-tuned decision tree based on exact benchmark analysis:
  // 16x3 (ops=171): JS wins 11.5M vs WASM 3.3M
  // 32x3 (ops=306): JS wins 5.3M vs WASM 2.8M
  // 64x4 (ops=1072): JS wins 2.4M vs WASM 2.2M
  // 128x8 (ops=1080): WASM wins 1.08M vs JS 617K ← Fix this!
  // 256x16 (ops=17408): WASM wins 355K vs JS 185K
  // 512x32 (ops=69632): JS wins 54K vs WASM 33K ← Fix this!

  if (signalLen <= 64) {
    // Small signals: JS overhead is minimal, computation is cache-friendly
    convolution_js(signal, kernel, result);
  } else if (signalLen >= 512 && kernelLen >= 32) {
    // Very large problems: JS cache efficiency and sequential access wins
    convolution_js(signal, kernel, result);
  } else {
    // Medium-large problems: WASM optimization and potential parallelization wins
    // This covers 128x8, 256x16 cases where WASM should dominate
    convolution_wasm(signal, kernel, result);
  }
};

export const convolution_2d = (
  image: Float32Array,
  kernel: Float32Array,
  result: Float32Array,
  imgWidth: number,
  imgHeight: number,
  kernelSize: number,
) => {
  // empirical benchmarking shows that the WebAssembly version is always faster for 2D convolution
  convolution_2d_wasm(image, kernel, result, imgWidth, imgHeight, kernelSize);
};
