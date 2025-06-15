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
  const resultLength = signal.length + kernel.length - 1;
  if (resultLength > 32) {
    convolution_wasm(signal, kernel, result);
  } else {
    convolution_js(signal, kernel, result);
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
