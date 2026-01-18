
export interface MainModule {
  _malloc(size: number): number;
  _free(ptr: number): void;
  _dot_product_c(a: number, b: number, dims: number): number;
  _dot_product_serial_c(a: number, b: number, results: number, dims: number, size: number): void;
  _dot_product_serial_c_plain(a: number, b: number, results: number, dims: number, size: number): void;
  HEAPF32: Float32Array;
}
export default function getWasmModule(): Promise<MainModule>;
