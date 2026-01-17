import { $ } from "defuss";
// @ts-ignore: TS cannot resolve ?url imports, remove it and see that it works just fine
import { initWasm, dotProduct, dotProductFlat } from "../wasm_rust.js";
import {
  shuffle,
  size,
  vectorsA,
  vectorsAFlat,
  vectorsBFlat,
} from "./sample_data.js";

export const WasmRust = () => {
  $(async () => {
    await initWasm();
  });

  const compute = async () => {
    shuffle();
    console.log("Input vectorsA[0][0]", vectorsA[0][0]);
    const now = performance.now();
    console.log("WASM Rust: computing dot product...");

    const results = await dotProductFlat(
      vectorsAFlat,
      vectorsBFlat,
      1024,
      size,
    );

    const elapsed = performance.now() - now;
    console.log(
      `WASM Rust: ${elapsed.toFixed(2)} ms, result length: ${results.results.length}`,
    );
    console.log(results); // log first 10
  };

  return (
    <>
      <button type="button" onClick={compute}>
        🐰 Run
      </button>
    </>
  );
};
