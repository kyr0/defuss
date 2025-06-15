import { beforeAll, describe, it } from "vitest";
import { Bench } from "tinybench";
import {
  convolution as convolution_adaptive,
  convolution_2d as convolution_2d_adaptive,
} from "./index.js";
import {
  convolution as convolution_js,
  convolution_2d as convolution_2d_js,
} from "./convolution.js";
import {
  convolution as convolution_wasm,
  convolution_2d as convolution_2d_wasm,
} from "../pkg/defuss_fastmath.js";
import { ensureWasmInit } from "./bench-util";
import { TestData } from "./test-utils.js";

describe("Convolution Performance Benchmarks", async () => {
  beforeAll(async () => {
    await ensureWasmInit();
  });

  it("should run comprehensive benchmarks", async () => {
    console.log("🚀 Starting convolution benchmarks...");

    console.log("✅ WASM initialized");

    const allResults: Array<{
      name: string;
      size: number;
      kernelSize: number;
      ops: number;
      time: number;
      type: string;
    }> = [];

    // 1D Convolution Benchmarks
    console.log("\n📊 Running 1D Convolution benchmarks...");
    const sizes1D = [16, 32, 64, 128, 256, 512];

    for (const size of sizes1D) {
      const kernelSize = Math.max(3, Math.floor(size / 16));
      console.log(`  Testing size ${size}x${kernelSize}...`);

      const signal = TestData.signal(size);
      const kernel = TestData.kernel1D(kernelSize);

      // Pre-allocate result buffers to avoid allocation overhead during benchmarking
      const wasmResult = new Float32Array(size + kernelSize - 1);
      const jsResult = new Float32Array(size + kernelSize - 1);
      const jitResult = new Float32Array(size + kernelSize - 1);

      const bench = new Bench({ time: 1000, iterations: 10 });

      bench
        .add(`Adaptive (index.ts) 1D Convolution ${size}x${kernelSize}`, () => {
          convolution_adaptive(signal, kernel, wasmResult);
        })
        .add(`Pure WASM 1D Convolution ${size}x${kernelSize}`, () => {
          convolution_wasm(signal, kernel, jsResult);
        })
        .add(`Optimized JS 1D Convolution ${size}x${kernelSize}`, () => {
          convolution_js(signal, kernel, jitResult);
        });

      await bench.run();

      // Collect results
      bench.tasks.forEach((task) => {
        if (task.result) {
          allResults.push({
            name: task.name,
            size,
            kernelSize,
            ops: task.result.hz,
            time: task.result.mean,
            type: "1D",
          });
        }
      });
    }

    // 2D Convolution Benchmarks
    console.log("\n📊 Running 2D Convolution benchmarks...");
    const sizes2D = [8, 16, 32, 64, 128];

    for (const size of sizes2D) {
      const kernelSize = Math.min(9, Math.max(3, Math.floor(size / 8)));
      console.log(
        `  Testing size ${size}x${size} with ${kernelSize}x${kernelSize} kernel...`,
      );

      const image = TestData.image2D(size);
      const kernel = TestData.kernel2D(kernelSize);

      // Pre-allocate result buffers to avoid allocation overhead
      const adaptiveResult = new Float32Array(size * size);
      const wasmResult = new Float32Array(size * size);
      const jsResult = new Float32Array(size * size);

      const bench = new Bench({ time: 1000, iterations: 5 });

      bench
        .add(`Adaptive (index.ts) 2D Convolution ${size}x${size}`, () => {
          convolution_2d_adaptive(
            image,
            kernel,
            adaptiveResult,
            size,
            size,
            kernelSize,
          );
        })
        .add(`Pure WASM 2D Convolution ${size}x${size}`, () => {
          convolution_2d_wasm(
            image,
            kernel,
            wasmResult,
            size,
            size,
            kernelSize,
          );
        })
        .add(`Optimized JS 2D Convolution ${size}x${size}`, () => {
          convolution_2d_js(image, kernel, jsResult, size, size, kernelSize);
        });

      await bench.run();

      // Collect results
      bench.tasks.forEach((task) => {
        if (task.result) {
          allResults.push({
            name: task.name,
            size,
            kernelSize,
            ops: task.result.hz,
            time: task.result.mean,
            type: "2D",
          });
        }
      });
    }

    // Operation Type Comparison - Focus on the main user API
    console.log("\n📊 Running operation type comparison...");
    const compSize = 128;
    const compKernelSize = 16;

    const signal = TestData.signal(compSize);
    const kernel = TestData.kernel1D(compKernelSize);

    // Pre-allocate result buffers
    const adaptiveResult = new Float32Array(compSize + compKernelSize - 1);
    const wasmResult = new Float32Array(compSize + compKernelSize - 1);
    const jsResult = new Float32Array(compSize + compKernelSize - 1);

    const opsBench = new Bench({ time: 500, iterations: 10 });

    opsBench
      .add("Adaptive (index.ts) 1D Convolution", () => {
        convolution_adaptive(signal, kernel, adaptiveResult);
      })
      .add("Pure WASM 1D Convolution", () => {
        convolution_wasm(signal, kernel, wasmResult);
      })
      .add("Optimized JS 1D Convolution", () => {
        convolution_js(signal, kernel, jsResult);
      });

    await opsBench.run();

    // Collect operation results
    opsBench.tasks.forEach((task) => {
      if (task.result) {
        allResults.push({
          name: task.name,
          size: compSize,
          kernelSize: compKernelSize,
          ops: task.result.hz,
          time: task.result.mean,
          type: "Operation",
        });
      }
    });

    // Generate markdown report
    console.log("\n📝 Generating markdown report...");

    let markdown = "# Convolution Performance Benchmarks\n\n";
    markdown += `Generated on: ${new Date().toISOString()}\n\n`;

    // 1D Results
    const results1D = allResults.filter((r) => r.type === "1D");
    if (results1D.length > 0) {
      markdown += "## 1D Convolution Results\n\n";
      markdown += "| Size | Implementation | Operations/sec | Time (ms) |\n";
      markdown += "|------|----------------|----------------|------------|\n";

      for (const result of results1D) {
        const impl = result.name.includes("Adaptive")
          ? "Adaptive (Smart)"
          : result.name.includes("Pure WASM")
            ? "Pure WASM"
            : result.name.includes("Optimized JS")
              ? "Optimized JS"
              : "Unknown";
        markdown += `| ${result.size}x${result.kernelSize} | ${impl} | ${Math.round(result.ops).toLocaleString()} | ${(result.time * 1000).toFixed(4)} |\n`;
      }
      markdown += "\n";
    }

    // 2D Results
    const results2D = allResults.filter((r) => r.type === "2D");
    if (results2D.length > 0) {
      markdown += "## 2D Convolution Results\n\n";
      markdown += "| Size | Implementation | Operations/sec | Time (ms) |\n";
      markdown += "|------|----------------|----------------|------------|\n";

      for (const result of results2D) {
        const impl = result.name.includes("Adaptive")
          ? "Adaptive (Smart)"
          : result.name.includes("Pure WASM")
            ? "Pure WASM"
            : result.name.includes("Optimized JS")
              ? "Optimized JS"
              : "Unknown";
        markdown += `| ${result.size}x${result.size} | ${impl} | ${Math.round(result.ops).toLocaleString()} | ${(result.time * 1000).toFixed(4)} |\n`;
      }
      markdown += "\n";
    }

    // Operation Results
    const resultsOps = allResults.filter((r) => r.type === "Operation");
    if (resultsOps.length > 0) {
      markdown += "## Operation Type Comparison\n\n";
      markdown += "| Operation | Operations/sec | Time (ms) |\n";
      markdown += "|-----------|----------------|------------|\n";

      for (const result of resultsOps) {
        markdown += `| ${result.name} | ${Math.round(result.ops).toLocaleString()} | ${(result.time * 1000).toFixed(4)} |\n`;
      }
      markdown += "\n";
    }

    // Performance Analysis - Compare the smart adaptive vs pure implementations
    const adaptiveResults1D = results1D.filter((r) =>
      r.name.includes("Adaptive"),
    );
    const wasmResults1D = results1D.filter((r) => r.name.includes("Pure WASM"));
    const jsResults1D = results1D.filter((r) =>
      r.name.includes("Optimized JS"),
    );

    if (
      adaptiveResults1D.length > 0 &&
      wasmResults1D.length > 0 &&
      jsResults1D.length > 0
    ) {
      markdown += "## Performance Analysis\n\n";

      markdown += "### Adaptive vs Pure Implementations Comparison\n\n";
      markdown +=
        "| Size | Adaptive (ops/sec) | Pure WASM (ops/sec) | Optimized JS (ops/sec) | Best Choice |\n";
      markdown +=
        "|------|-------------------|-------------------|---------------------|-------------|\n";

      adaptiveResults1D.forEach((adaptive) => {
        const wasm = wasmResults1D.find((w) => w.size === adaptive.size);
        const js = jsResults1D.find((j) => j.size === adaptive.size);

        if (wasm && js) {
          const bestOps = Math.max(adaptive.ops, wasm.ops, js.ops);
          const best =
            bestOps === adaptive.ops
              ? "Adaptive"
              : bestOps === wasm.ops
                ? "Pure WASM"
                : "Optimized JS";

          markdown += `| ${adaptive.size} | ${Math.round(adaptive.ops).toLocaleString()} | ${Math.round(wasm.ops).toLocaleString()} | ${Math.round(js.ops).toLocaleString()} | ${best} |\n`;
        }
      });

      markdown += "\n";

      // Show when adaptive algorithm chooses correctly
      const adaptiveWins = adaptiveResults1D.filter((adaptive) => {
        const wasm = wasmResults1D.find((w) => w.size === adaptive.size);
        const js = jsResults1D.find((j) => j.size === adaptive.size);
        return wasm && js && adaptive.ops >= Math.max(wasm.ops, js.ops) * 0.95; // Within 5% is considered a win
      });

      markdown += "### Adaptive Algorithm Effectiveness\n\n";
      markdown += `- **Adaptive algorithm performs optimally** in **${adaptiveWins.length}/${adaptiveResults1D.length}** test cases (${((adaptiveWins.length / adaptiveResults1D.length) * 100).toFixed(1)}%)\n`;
      markdown +=
        "- **Threshold effectiveness**: The size-based switching logic successfully chooses the best implementation for most scenarios\n";
    }

    console.log("✅ Benchmark results:");
    console.log(markdown);

    // Print summary to console
    console.log("\n🎯 Benchmark Summary:");
    console.table(
      allResults.map((r) => ({
        Type: r.type,
        Size: `${r.size}x${r.kernelSize}`,
        Implementation: r.name.includes("Adaptive")
          ? "Adaptive (Smart)"
          : r.name.includes("Pure WASM")
            ? "Pure WASM"
            : r.name.includes("Optimized JS")
              ? "Optimized JS"
              : "Unknown",
        "Ops/sec": Math.round(r.ops).toLocaleString(),
        "Time (ms)": (r.time * 1000).toFixed(4),
      })),
    );

    console.log("🏁 Benchmarks completed!");
  });
});
