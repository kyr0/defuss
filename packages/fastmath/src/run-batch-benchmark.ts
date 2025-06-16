/**
 * Test runner for the batch benchmark
 */

import { runBatchBenchmark } from "./batch-benchmark.js";

console.log("Starting batch benchmark test...\n");

runBatchBenchmark()
  .then((results) => {
    console.log("\n✅ Benchmark completed successfully");
    console.log(`Tested ${results.length} different implementations`);
  })
  .catch((error) => {
    console.error("❌ Benchmark failed:", error);
    process.exit(1);
  });
