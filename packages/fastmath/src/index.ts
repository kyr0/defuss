import { convolution_2d as convolution_2d_wasm } from "../pkg/defuss_fastmath.js";
// import { convolution_2d as convolution_2d_js } from "./convolution.js";

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
