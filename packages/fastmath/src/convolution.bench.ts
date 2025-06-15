import { describe, it } from "vitest";
import { Bench } from "tinybench";
import init, { initThreadPool } from "../pkg";
import {
  convolutionTestFunctions,
  benchmarkFunctions,
  createTestData,
} from "./convolution-test-functions.js";

describe("Convolution Performance Benchmarks", () => {
  it("should run comprehensive benchmarks", async () => {
    console.log("🚀 Starting convolution benchmarks...");

    // Initialize WASM
    await init();

    await initThreadPool(8);
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

      const signal = createTestData.signal(size);
      const kernel = createTestData.kernel1D(kernelSize);

      const bench = new Bench({ time: 1000, iterations: 10 });

      bench
        .add(`WASM 1D Convolution ${size}x${kernelSize}`, () => {
          convolutionTestFunctions.testConvolutionWithData(signal, kernel);
        })
        .add(`Naive JS 1D Convolution ${size}x${kernelSize}`, () => {
          benchmarkFunctions.naiveConvolution(signal, kernel);
        })
        .add(`JIT JS 1D Convolution ${size}x${kernelSize}`, () => {
          benchmarkFunctions.jitOptimizedConvolution(signal, kernel);
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

      const image = createTestData.image2D(size);
      const kernel = createTestData.kernel2D(kernelSize);

      const bench = new Bench({ time: 1000, iterations: 5 });

      bench
        .add(`WASM 2D Convolution ${size}x${size}`, () => {
          convolutionTestFunctions.test2DConvolutionWithData(
            image,
            kernel,
            size,
            kernelSize,
          );
        })
        .add(`Naive JS 2D Convolution ${size}x${size}`, () => {
          benchmarkFunctions.naive2DConvolution(
            image,
            kernel,
            size,
            size,
            kernelSize,
          );
        })
        .add(`JIT JS 2D Convolution ${size}x${size}`, () => {
          benchmarkFunctions.jitOptimized2DConvolution(
            image,
            kernel,
            size,
            size,
            kernelSize,
          );
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

    // Operation Type Comparison
    console.log("\n📊 Running operation type comparison...");
    const compSize = 128;
    const compKernelSize = 16;

    const signal = createTestData.signal(compSize);
    const kernel = createTestData.kernel1D(compKernelSize);

    const opsBench = new Bench({ time: 500, iterations: 10 });

    opsBench
      .add("WASM 1D Convolution", () => {
        convolutionTestFunctions.testConvolutionWithData(signal, kernel);
      })
      .add("WASM Cross-Correlation", () => {
        convolutionTestFunctions.testCrossCorrelation(compSize, compKernelSize);
      })
      .add("WASM Auto-Correlation", () => {
        convolutionTestFunctions.testAutoCorrelation(
          compSize,
          Math.floor(compKernelSize / 2),
        );
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
        const impl = result.name.includes("WASM")
          ? "WASM"
          : result.name.includes("Naive")
            ? "Naive JS"
            : "JIT JS";
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
        const impl = result.name.includes("WASM")
          ? "WASM"
          : result.name.includes("Naive")
            ? "Naive JS"
            : "JIT JS";
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

    // Performance Analysis
    const wasmResults1D = results1D.filter((r) => r.name.includes("WASM"));
    const naiveResults1D = results1D.filter((r) => r.name.includes("Naive"));

    if (wasmResults1D.length > 0 && naiveResults1D.length > 0) {
      markdown += "## Performance Analysis\n\n";

      const wasmFaster = wasmResults1D.filter((wasm) => {
        const correspondingNaive = naiveResults1D.find(
          (naive) => naive.size === wasm.size,
        );
        return correspondingNaive && wasm.ops > correspondingNaive.ops;
      });

      if (wasmFaster.length > 0) {
        const minSize = Math.min(...wasmFaster.map((r) => r.size));
        markdown += `- **WASM becomes faster than Naive JS** starting at size: **${minSize}**\n`;
        markdown += `- **WASM-favorable sizes**: ${wasmFaster
          .map((r) => r.size)
          .sort((a, b) => a - b)
          .join(", ")}\n`;

        // Show speed improvements
        markdown += "\n### Speed Improvements\n\n";
        markdown +=
          "| Size | WASM (ops/sec) | Naive JS (ops/sec) | Speedup |\n";
        markdown +=
          "|------|----------------|-------------------|----------|\n";

        wasmFaster.forEach((wasm) => {
          const naive = naiveResults1D.find((n) => n.size === wasm.size);
          if (naive) {
            const speedup = wasm.ops / naive.ops;
            markdown += `| ${wasm.size} | ${Math.round(wasm.ops).toLocaleString()} | ${Math.round(naive.ops).toLocaleString()} | ${speedup.toFixed(2)}x |\n`;
          }
        });
      } else {
        markdown +=
          "- **Naive JS outperforms WASM** in all tested configurations\n";

        // Show how much faster naive is
        markdown += "\n### JavaScript Advantages\n\n";
        markdown +=
          "| Size | Naive JS (ops/sec) | WASM (ops/sec) | JS Advantage |\n";
        markdown +=
          "|------|-------------------|----------------|-------------|\n";

        naiveResults1D.forEach((naive) => {
          const wasm = wasmResults1D.find((w) => w.size === naive.size);
          if (wasm) {
            const advantage = naive.ops / wasm.ops;
            markdown += `| ${naive.size} | ${Math.round(naive.ops).toLocaleString()} | ${Math.round(wasm.ops).toLocaleString()} | ${advantage.toFixed(2)}x faster |\n`;
          }
        });
      }
    }

    console.log("✅ Benchmark results:");
    console.log(markdown);

    // Print summary to console
    console.log("\n🎯 Benchmark Summary:");
    console.table(
      allResults.map((r) => ({
        Type: r.type,
        Size: `${r.size}x${r.kernelSize}`,
        Implementation: r.name.includes("WASM")
          ? "WASM"
          : r.name.includes("Naive")
            ? "Naive JS"
            : "JIT JS",
        "Ops/sec": Math.round(r.ops).toLocaleString(),
        "Time (ms)": (r.time * 1000).toFixed(4),
      })),
    );

    console.log("🏁 Benchmarks completed!");
  });
});
