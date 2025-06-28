import { dot_product_js_jit_serial } from "../js_jit.js";
import { generateSampleData } from "../utils/math.js";

// 2 x 1024 float32 vectors with 1024 dimensions, seeded random
const sampleData20kx1024dims = generateSampleData(
  31337 /* seed */,
  1024 /* dimensions */,
  100000 /* samples */,
);

export const JsJit = () => {
  const compute = () => {
    const now = performance.now();
    const resultArray: Float32Array = dot_product_js_jit_serial(
      sampleData20kx1024dims.vectorsA,
      sampleData20kx1024dims.vectorsB,
    );
    const elapsed = performance.now() - now;
    console.log(
      `JS JIT: ${elapsed.toFixed(2)} ms, result length: ${resultArray.length}`,
    );
    console.log(resultArray.slice(0, 10)); // log first 10
  };

  return (
    <>
      <button type="button" onClick={compute}>
        🐢 Run
      </button>
    </>
  );
};
