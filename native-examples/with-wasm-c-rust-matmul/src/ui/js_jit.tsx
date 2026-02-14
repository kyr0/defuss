import { dot_product_js_jit_serial } from "../js_jit.js";
import { shuffle, vectorsA, vectorsB } from "./sample_data.js";

export const JsJit = () => {
  const compute = () => {
    shuffle();
    console.log("Input vectorsA[0][0]", vectorsA[0][0]);
    const now = performance.now();
    const resultArray: Float32Array = dot_product_js_jit_serial(
      vectorsA,
      vectorsB,
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
        🦆 Run
      </button>
    </>
  );
};
