import { $ } from "defuss";
import { generateSampleData } from "../utils/math.js";
// @ts-ignore: TS cannot resolve ?url imports, remove it and see that it works just fine
import { init_wasm_c, dot_product_c, dot_product_c_flat } from "../wasm_c.js";

// 2 x 1024 float32 vectors with 1024 dimensions, seeded random
const sampleData20kx1024dims = generateSampleData(
  31337 /* seed */,
  1024 /* dimensions */,
  100000 /* samples */,
);

export const WasmC = () => {
  $(async () => {
    await init_wasm_c();
  });

  const compute = (type: "flat" | "serial") => () => {
    const now = performance.now();
    console.log("WASM C: computing dot product...");

    const resultArray: Float32Array =
      type === "flat"
        ? dot_product_c_flat(
            sampleData20kx1024dims.vectorsA,
            sampleData20kx1024dims.vectorsB,
          )
        : dot_product_c(
            sampleData20kx1024dims.vectorsA,
            sampleData20kx1024dims.vectorsB,
          );

    const elapsed = performance.now() - now;
    console.log(
      `WASM C: ${elapsed.toFixed(2)} ms, result length: ${resultArray.length}`,
    );
    console.log(resultArray.slice(0, 10)); // log first 10
  };

  return (
    <>
      <button type="button" onClick={compute("flat")}>
        🦆 Flat, chunked
      </button>

      <button type="button" onClick={compute("serial")}>
        🦆 Serial
      </button>
    </>
  );
};
