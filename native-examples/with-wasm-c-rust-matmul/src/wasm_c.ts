import type { Vectors } from "./types.js";
import getWasmModule from "./.gen/wasm_c/wasm_c";
import type { MainModule } from "./.gen/wasm_c/wasm_c.d.ts";

let Module: MainModule;

export const init_wasm_c = async (module?: MainModule): Promise<MainModule> => {
  if (module) {
    Module = module;
  }
  if (!Module) {
    Module = (await getWasmModule()) as MainModule;
  }
  return Module;
};

export const dot_product_c_flat = (
  vectorsA: Vectors,
  vectorsB: Vectors,
): Float32Array => {
  const dims = vectorsA[0].length;
  const size = vectorsA.length;
  const results = new Float32Array(size);
  const vectorByteSize = dims * Float32Array.BYTES_PER_ELEMENT;
  const totalByteSize = size * vectorByteSize;

  // allocate memory for the vectors and results in the WASM heap
  const ptrA = Module._malloc(totalByteSize);
  const ptrB = Module._malloc(totalByteSize);
  const ptrResult = Module._malloc(size * Float32Array.BYTES_PER_ELEMENT);

  // flatten and copy all vectors into WASM heap
  const flatA = new Float32Array(size * dims);
  const flatB = new Float32Array(size * dims);
  for (let i = 0; i < size; i++) {
    flatA.set(vectorsA[i], i * dims);
    flatB.set(vectorsB[i], i * dims);
  }
  Module.HEAPF32.set(flatA, ptrA / Float32Array.BYTES_PER_ELEMENT);
  Module.HEAPF32.set(flatB, ptrB / Float32Array.BYTES_PER_ELEMENT);

  // call the WASM function to compute all dot products at once
  Module._dot_product_serial_c(ptrA, ptrB, ptrResult, dims, size);

  // copy results back from WASM heap
  results.set(
    Module.HEAPF32.subarray(
      ptrResult / Float32Array.BYTES_PER_ELEMENT,
      ptrResult / Float32Array.BYTES_PER_ELEMENT + size,
    ),
  );

  // free the allocated memory in the WASM heap
  Module._free(ptrA);
  Module._free(ptrB);
  Module._free(ptrResult);

  return results;
};

export const dot_product_c = (
  vectorsA: Vectors,
  vectorsB: Vectors,
): Float32Array => {
  const dims = vectorsA[0].length;
  const size = vectorsA.length;
  const results = new Float32Array(size);
  const vectorByteSize = dims * Float32Array.BYTES_PER_ELEMENT;

  const ptrA = Module._malloc(vectorByteSize);
  const ptrB = Module._malloc(vectorByteSize);

  for (let i = 0; i < size; i++) {
    Module.HEAPF32.set(vectorsA[i], ptrA / Float32Array.BYTES_PER_ELEMENT);
    Module.HEAPF32.set(vectorsB[i], ptrB / Float32Array.BYTES_PER_ELEMENT);
    results[i] = Module._dot_product_c(ptrA, ptrB, dims);
  }
  Module._free(ptrA);
  Module._free(ptrB);
  return results;
};
