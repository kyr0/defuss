import { dot_product_js_serial } from "../js.js";
import { shuffle, vectorsA, vectorsB } from "./sample_data.js";

export const Js = () => {
  const compute = () => {
    shuffle();
    console.log("Input vectorsA[0][0]", vectorsA[0][0]);
    const now = performance.now();
    const resultArray: Float32Array = dot_product_js_serial(vectorsA, vectorsB);
    const elapsed = performance.now() - now;
    console.log(
      `Pure JS: ${elapsed.toFixed(2)} ms, result length: ${resultArray.length}`,
    );
    console.log(resultArray.slice(0, 10)); // log first 10
  };

  return (
    <>
      <button type="button" onClick={compute}>
        🐌 Run
      </button>
    </>
  );
};
