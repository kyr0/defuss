/**
 * @fileoverview Benchmarks for vector operations
 * Tests performance of JS vs WASM implementations across different vector sizes
 * and validates adaptive switching thresholds
 */

import { beforeAll, describe, it } from "vitest";
import { Bench } from "tinybench";
import {
  vector_dot_product,
  vector_dot_product_single,
  vector_dot_product_parallel,
  vector_add,
  vector_scale,
} from "../pkg/defuss_fastmath.js";
import {
  vector_dot_product as js_vector_dot_product,
  vector_add as js_vector_add,
  vector_scale as js_vector_scale,
} from "./vector-operations.js";
import {
  generateSampleData,
  seededRandom,
} from "./vector-test-data.js";
import { ensureWasmInit } from "./bench-util.js";

describe("Vector Operations Performance Benchmarks", () => {
  beforeAll(async () => {
    await ensureWasmInit();
  });

  it("should run comprehensive vector benchmarks", async () => {
    console.log("🚀 Starting vector operation benchmarks...");

    const allResults: Array<{
      name: string;
      dims: number;
      samples: number;
      ops: number;
      time: number;
      type: string;
    }> = [];

    // Test configurations for different vector sizes
    const testConfigs = [
      { dims: 4, samples: 10000, name: "Tiny (4D)" },
      { dims: 64, samples: 5000, name: "Small (64D)" },
      { dims: 384, samples: 1000, name: "Medium (384D)" },
      { dims: 1024, samples: 500, name: "Large (1024D)" },
      { dims: 4096, samples: 100, name: "XLarge (4096D)" },
    ];

    // Dot Product Benchmarks
    console.log("\n📊 Running Dot Product benchmarks...");
    
    for (const config of testConfigs) {
      console.log(`  Testing ${config.name} - ${config.dims} dimensions...`);
      
      // Generate test data
      const data = generateSampleData(31337, config.dims, config.samples);
      
      const bench = new Bench({ time: 1000, iterations: 5 });

      bench
        .add(`JS Batch Dot Product ${config.dims}D`, () => {
          js_vector_dot_product(data.vectorsA, data.vectorsB);
        })
        .add(`WASM Adaptive Dot Product ${config.dims}D`, () => {
          for (let i = 0; i < data.vectorsA.length; i++) {
            vector_dot_product(data.vectorsA[i], data.vectorsB[i]);
          }
        })
        .add(`WASM Single-threaded Dot Product ${config.dims}D`, () => {
          for (let i = 0; i < data.vectorsA.length; i++) {
            vector_dot_product_single(data.vectorsA[i], data.vectorsB[i]);
          }
        })
        .add(`WASM Parallel Dot Product ${config.dims}D`, () => {
          for (let i = 0; i < data.vectorsA.length; i++) {
            vector_dot_product_parallel(data.vectorsA[i], data.vectorsB[i]);
          }
        });

      await bench.run();

      // Collect results
      bench.tasks.forEach((task) => {
        if (task.result) {
          allResults.push({
            name: task.name,
            dims: config.dims,
            samples: config.samples,
            ops: task.result.hz,
            time: task.result.mean,
            type: "DotProduct",
          });
        }
      });
    }

    // Vector Addition Benchmarks
    console.log("\n📊 Running Vector Addition benchmarks...");
    
    for (const config of testConfigs) {
      console.log(`  Testing ${config.name} - ${config.dims} dimensions...`);
      
      // Generate test data
      const data = generateSampleData(42, config.dims, config.samples);
      
      // Pre-allocate result buffers for each iteration
      const jsResults = data.vectorsA.map(() => new Float32Array(config.dims));
      const wasmResults = data.vectorsA.map(() => new Float32Array(config.dims));
      
      const bench = new Bench({ time: 1000, iterations: 5 });

      bench
        .add(`JS Vector Add ${config.dims}D`, () => {
          for (let i = 0; i < data.vectorsA.length; i++) {
            js_vector_add(data.vectorsA[i], data.vectorsB[i], jsResults[i]);
          }
        })
        .add(`WASM Vector Add ${config.dims}D`, () => {
          for (let i = 0; i < data.vectorsA.length; i++) {
            vector_add(data.vectorsA[i], data.vectorsB[i], wasmResults[i]);
          }
        });

      await bench.run();

      // Collect results
      bench.tasks.forEach((task) => {
        if (task.result) {
          allResults.push({
            name: task.name,
            dims: config.dims,
            samples: config.samples,
            ops: task.result.hz,
            time: task.result.mean,
            type: "VectorAdd",
          });
        }
      });
    }

    // Vector Scaling Benchmarks
    console.log("\n📊 Running Vector Scaling benchmarks...");
    
    for (const config of testConfigs) {
      console.log(`  Testing ${config.name} - ${config.dims} dimensions...`);
      
      // Generate test data
      const data = generateSampleData(123, config.dims, config.samples);
      const scalar = 2.5;
      
      // Pre-allocate result buffers for each iteration
      const jsResults = data.vectorsA.map(() => new Float32Array(config.dims));
      const wasmResults = data.vectorsA.map(() => new Float32Array(config.dims));
      
      const bench = new Bench({ time: 1000, iterations: 5 });

      bench
        .add(`JS Vector Scale ${config.dims}D`, () => {
          for (let i = 0; i < data.vectorsA.length; i++) {
            js_vector_scale(data.vectorsA[i], scalar, jsResults[i]);
          }
        })
        .add(`WASM Vector Scale ${config.dims}D`, () => {
          for (let i = 0; i < data.vectorsA.length; i++) {
            vector_scale(data.vectorsA[i], scalar, wasmResults[i]);
          }
        });

      await bench.run();

      // Collect results
      bench.tasks.forEach((task) => {
        if (task.result) {
          allResults.push({
            name: task.name,
            dims: config.dims,
            samples: config.samples,
            ops: task.result.hz,
            time: task.result.mean,
            type: "VectorScale",
          });
        }
      });
    }

    // Intensive 1024D Vector Multiplication Benchmark (100k iterations)
    console.log("\n🔥 Running intensive 1024D vector multiplication benchmark (100k iterations)...");
    
    const intensiveDims = 1024;
    const intensiveIterations = 100000;
    
    // Generate test data for intensive benchmark
    const intensiveData = generateSampleData(42, intensiveDims, intensiveIterations);
    
    console.log(`  Testing ${intensiveIterations.toLocaleString()} dot products of ${intensiveDims}D vectors...`);
    
    const intensiveBench = new Bench({ time: 5000, iterations: 3 }); // Longer time for intensive test

    intensiveBench
      .add("JS Batch Dot Product 1024D (100k ops)", () => {
        js_vector_dot_product(intensiveData.vectorsA, intensiveData.vectorsB);
      })
      .add("WASM Adaptive Dot Product 1024D (100k ops)", () => {
        for (let i = 0; i < intensiveData.vectorsA.length; i++) {
          vector_dot_product(intensiveData.vectorsA[i], intensiveData.vectorsB[i]);
        }
      })
      .add("WASM Single-threaded Dot Product 1024D (100k ops)", () => {
        for (let i = 0; i < intensiveData.vectorsA.length; i++) {
          vector_dot_product_single(intensiveData.vectorsA[i], intensiveData.vectorsB[i]);
        }
      })
      .add("WASM Parallel Dot Product 1024D (100k ops)", () => {
        for (let i = 0; i < intensiveData.vectorsA.length; i++) {
          vector_dot_product_parallel(intensiveData.vectorsA[i], intensiveData.vectorsB[i]);
        }
      });

    await intensiveBench.run();

    // Collect intensive benchmark results with total time calculation
    console.log("\n🎯 Intensive Benchmark Results (1024D × 100k operations):");
    intensiveBench.tasks.forEach((task) => {
      if (task.result) {
        const totalTimeMs = task.result.mean * 1000; // Convert to milliseconds
        const opsPerSec = task.result.hz;
        const timePerOp = (task.result.mean * 1000 * 1000); // Microseconds per operation
        
        console.log(`${task.name}:`);
        console.log(`  • Total time: ${totalTimeMs.toFixed(2)} ms`);
        console.log(`  • Operations/sec: ${Math.round(opsPerSec).toLocaleString()}`);
        console.log(`  • Time per dot product: ${timePerOp.toFixed(3)} μs`);
        console.log(`  • Throughput: ${((intensiveIterations * intensiveDims * 2) / (totalTimeMs / 1000) / 1e9).toFixed(2)} GFLOPS`);
        console.log("");
        
        allResults.push({
          name: task.name,
          dims: intensiveDims,
          samples: intensiveIterations,
          ops: task.result.hz,
          time: task.result.mean,
          type: "IntensiveDotProduct",
        });
      }
    });

    // Generate comprehensive report
    console.log("\n📊 Generating performance report...");

    let markdown = "# Vector Operations Performance Report\n\n";
    markdown += "## Benchmark Results\n\n";

    // Group results by operation type
    const dotProductResults = allResults.filter(r => r.type === "DotProduct");
    const addResults = allResults.filter(r => r.type === "VectorAdd");
    const scaleResults = allResults.filter(r => r.type === "VectorScale");
    const intensiveResults = allResults.filter(r => r.type === "IntensiveDotProduct");

    // Dot Product Analysis
    if (dotProductResults.length > 0) {
      markdown += "### Dot Product Performance\n\n";
      markdown += "| Dimensions | JS Batch (ops/sec) | WASM Adaptive (ops/sec) | WASM Single (ops/sec) | WASM Parallel (ops/sec) | Best Implementation |\n";
      markdown += "|------------|---------------------|-------------------------|----------------------|-------------------------|--------------------|\n";

      testConfigs.forEach((config) => {
        const js = dotProductResults.find(r => r.dims === config.dims && r.name.includes("JS Batch"));
        const adaptive = dotProductResults.find(r => r.dims === config.dims && r.name.includes("WASM Adaptive"));
        const single = dotProductResults.find(r => r.dims === config.dims && r.name.includes("WASM Single-threaded"));
        const parallel = dotProductResults.find(r => r.dims === config.dims && r.name.includes("WASM Parallel"));

        if (js && adaptive && single && parallel) {
          const best = [
            { name: "JS", ops: js.ops },
            { name: "WASM Adaptive", ops: adaptive.ops },
            { name: "WASM Single", ops: single.ops },
            { name: "WASM Parallel", ops: parallel.ops }
          ].reduce((a, b) => a.ops > b.ops ? a : b).name;

          markdown += `| ${config.dims} | ${Math.round(js.ops).toLocaleString()} | ${Math.round(adaptive.ops).toLocaleString()} | ${Math.round(single.ops).toLocaleString()} | ${Math.round(parallel.ops).toLocaleString()} | ${best} |\n`;
        }
      });

      markdown += "\n";
    }

    // Vector Addition Analysis
    if (addResults.length > 0) {
      markdown += "### Vector Addition Performance\n\n";
      markdown += "| Dimensions | JS (ops/sec) | WASM (ops/sec) | Best Implementation |\n";
      markdown += "|------------|--------------|----------------|--------------------|\n";

      testConfigs.forEach((config) => {
        const js = addResults.find(r => r.dims === config.dims && r.name.includes("JS Vector Add"));
        const wasm = addResults.find(r => r.dims === config.dims && r.name.includes("WASM Vector Add"));

        if (js && wasm) {
          const best = js.ops > wasm.ops ? "JS" : "WASM";

          markdown += `| ${config.dims} | ${Math.round(js.ops).toLocaleString()} | ${Math.round(wasm.ops).toLocaleString()} | ${best} |\n`;
        }
      });

      markdown += "\n";
    }

    // Vector Scaling Analysis
    if (scaleResults.length > 0) {
      markdown += "### Vector Scaling Performance\n\n";
      markdown += "| Dimensions | JS (ops/sec) | WASM (ops/sec) | Best Implementation |\n";
      markdown += "|------------|--------------|----------------|--------------------|\n";

      testConfigs.forEach((config) => {
        const js = scaleResults.find(r => r.dims === config.dims && r.name.includes("JS Vector Scale"));
        const wasm = scaleResults.find(r => r.dims === config.dims && r.name.includes("WASM Vector Scale"));

        if (js && wasm) {
          const best = js.ops > wasm.ops ? "JS" : "WASM";

          markdown += `| ${config.dims} | ${Math.round(js.ops).toLocaleString()} | ${Math.round(wasm.ops).toLocaleString()} | ${best} |\n`;
        }
      });

      markdown += "\n";
    }

    // Intensive Benchmark Analysis
    if (intensiveResults.length > 0) {
      markdown += "### Intensive Benchmark: 1024D Vector Dot Products (100k iterations)\n\n";
      markdown += "| Implementation | Total Time (ms) | Ops/sec | Time per Op (μs) | GFLOPS |\n";
      markdown += "|----------------|-----------------|---------|------------------|--------|\n";

      intensiveResults.forEach((result) => {
        const totalTimeMs = result.time * 1000;
        const timePerOpUs = result.time * 1000 * 1000;
        const gflops = ((intensiveIterations * intensiveDims * 2) / result.time / 1e9);
        
        const implName = result.name.includes("JS Batch") 
          ? "JS Batch"
          : result.name.includes("WASM Adaptive")
            ? "WASM Adaptive"
            : result.name.includes("WASM Single-threaded")
              ? "WASM Single"
              : "WASM Parallel";

        markdown += `| ${implName} | ${totalTimeMs.toFixed(2)} | ${Math.round(result.ops).toLocaleString()} | ${timePerOpUs.toFixed(3)} | ${gflops.toFixed(2)} |\n`;
      });

      const bestIntensive = intensiveResults.reduce((a, b) => a.ops > b.ops ? a : b);
      const worstIntensive = intensiveResults.reduce((a, b) => a.ops < b.ops ? a : b);
      const speedup = bestIntensive.ops / worstIntensive.ops;

      markdown += "\n";
      markdown += "**Performance Summary:**\n";
      markdown += `- Best: ${bestIntensive.name} (${Math.round(bestIntensive.ops).toLocaleString()} ops/sec)\n`;
      markdown += `- Worst: ${worstIntensive.name} (${Math.round(worstIntensive.ops).toLocaleString()} ops/sec)\n`;
      markdown += `- Speedup: ${speedup.toFixed(2)}x faster\n\n`;
    }

    // Adaptive Algorithm Effectiveness
    const adaptiveResults = allResults.filter(r => r.name.includes("WASM Adaptive"));
    const adaptiveWins = adaptiveResults.filter((adaptive) => {
      const sameTypeResults = allResults.filter(r => r.type === adaptive.type && r.dims === adaptive.dims);
      const maxOps = Math.max(...sameTypeResults.map(r => r.ops));
      return adaptive.ops >= maxOps * 0.95; // Within 5% is considered a win
    });

    markdown += "### Implementation Comparison\n\n";
    markdown += `- **Total test cases**: ${allResults.length}\n`;
    markdown += `- **Dot product adaptive effectiveness**: ${adaptiveResults.filter(r => r.type === "DotProduct").length > 0 ? "Available" : "Not tested"}\n`;
    markdown += "- **Performance comparison**: Results show relative performance between JavaScript and WASM implementations\n";

    console.log("✅ Benchmark results:");
    console.log(markdown);

    // Print summary to console
    console.log("\n🎯 Benchmark Summary:");
    console.table(
      allResults.map((r) => ({
        Type: r.type,
        Dimensions: r.dims,
        Implementation: r.name.includes("JS") 
          ? "JS" 
          : r.name.includes("WASM")
            ? "WASM"
            : "Unknown",
        "Ops/sec": Math.round(r.ops).toLocaleString(),
        "Time (ms)": (r.time * 1000).toFixed(4),
      })),
    );

    console.log("🏁 Vector benchmarks completed!");
  });
});
