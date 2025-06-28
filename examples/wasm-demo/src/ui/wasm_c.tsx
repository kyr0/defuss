import { $ } from "defuss";
// @ts-ignore: TS cannot resolve ?url imports, remove it and see that it works just fine
import { init_wasm_c, dot_product_c, dot_product_c_flat } from "../wasm_c.js";
import { shuffle, vectorsA, vectorsB } from "./sample_data.js";

export const WasmC = () => {
  $(async () => {
    await init_wasm_c();
  });

  const compute = (type: "flat" | "serial") => () => {
    shuffle();
    console.log("Input vectorsA[0][0]", vectorsA[0][0]);
    const now = performance.now();
    console.log("WASM C: computing dot product...");

    const resultArray: Float32Array =
      type === "flat"
        ? dot_product_c_flat(vectorsA, vectorsB)
        : dot_product_c(vectorsA, vectorsB);

    const elapsed = performance.now() - now;
    console.log(
      `WASM C: ${elapsed.toFixed(2)} ms, result length: ${resultArray.length}`,
    );
    console.log(resultArray.slice(0, 10)); // log first 10
  };

  return (
    <>
      <button type="button" onClick={compute("flat")}>
        🐢 Flat, chunked
      </button>

      <button type="button" class="m-md" onClick={compute("serial")}>
        🐢 Serial
      </button>
    </>
  );
};
