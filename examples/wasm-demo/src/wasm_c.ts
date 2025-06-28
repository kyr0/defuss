import type { Vectors } from "./types.js";

import getWasmModule from "./.gen/wasm_c/wasm_c";
import type { WasmModule } from "./.gen/wasm_c/wasm_c.js";

export interface DotProductModule extends WasmModule {
  HEAPF32: {
    set: (data: Float32Array, offset: number) => void;
    subarray: (start: number, end: number) => Float32Array;
  };
}

let Module: DotProductModule;

export const init_wasm_c = async (
  module?: DotProductModule,
): Promise<DotProductModule> => {
  if (module) {
    Module = module;
  }
  if (!Module) {
    Module = (await getWasmModule()) as DotProductModule;
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
  const chunkSize = Math.ceil(size / 10); // split workload into 10 chunks

  for (let chunkStart = 0; chunkStart < size; chunkStart += chunkSize) {
    const chunkEnd = Math.min(chunkStart + chunkSize, size);
    const chunkLen = chunkEnd - chunkStart;
    const chunkTotalByteSize = chunkLen * vectorByteSize;

    // allocate memory for the chunk
    const ptrA = Module._malloc(chunkTotalByteSize);
    const ptrB = Module._malloc(chunkTotalByteSize);
    const ptrResult = Module._malloc(chunkLen * Float32Array.BYTES_PER_ELEMENT);

    // flatten and copy chunk vectors into WASM heap
    const flatA = new Float32Array(chunkLen * dims);
    const flatB = new Float32Array(chunkLen * dims);
    for (let i = 0; i < chunkLen; i++) {
      flatA.set(vectorsA[chunkStart + i], i * dims);
      flatB.set(vectorsB[chunkStart + i], i * dims);
    }
    Module.HEAPF32.set(flatA, ptrA / Float32Array.BYTES_PER_ELEMENT);
    Module.HEAPF32.set(flatB, ptrB / Float32Array.BYTES_PER_ELEMENT);

    // call the WASM function for this chunk
    Module._dot_product_serial_c(ptrA, ptrB, ptrResult, dims, chunkLen);

    // copy results back from WASM heap
    results.set(
      Module.HEAPF32.subarray(
        ptrResult / Float32Array.BYTES_PER_ELEMENT,
        ptrResult / Float32Array.BYTES_PER_ELEMENT + chunkLen,
      ),
      chunkStart,
    );

    // free the allocated memory in the WASM heap
    Module._free(ptrA);
    Module._free(ptrB);
    Module._free(ptrResult);
  }

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
