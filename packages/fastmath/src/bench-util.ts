import { Bench } from "tinybench";
import init, { initThreadPool } from "../pkg/defuss_fastmath.js";
import { convolutionTestFunctions } from "./convolution-test-functions.js";
import { TestData } from "./test-utils.js";
import { convolution, convolution_2d } from "./convolution.js";

// Initialize WASM module
let wasmInitialized = false;
export async function ensureWasmInit() {
  if (!wasmInitialized) {
    // Initialize WASM
    await init();

    await initThreadPool(navigator.hardwareConcurrency);
    wasmInitialized = true;
  }
}

export interface BenchmarkResult {
  size: number;
  kernelSize: number;
  wasmOps: number;
  jsNaiveOps: number;
  jsJitOps: number;
  speedupVsNaive: number;
  speedupVsJit: number;
  wasmTime: number;
  jsNaiveTime: number;
  jsJitTime: number;
}

export interface ConvolutionBenchConfig {
  sizes: number[];
  warmupRuns?: number;
  benchTime?: number; // in milliseconds
  iterations?: number;
}

// Default configuration
const defaultConfig: Required<ConvolutionBenchConfig> = {
  sizes: [16, 32, 64, 128, 256, 512],
  warmupRuns: 3,
  benchTime: 1000, // 1 second per benchmark
  iterations: 10,
};

/**
 * Benchmark 1D convolution operations across different sizes
 */
export async function benchmarkConvolution1D(
  config: Partial<ConvolutionBenchConfig> = {},
): Promise<BenchmarkResult[]> {
  await ensureWasmInit();

  const cfg = { ...defaultConfig, ...config };
  const results: BenchmarkResult[] = [];

  for (const size of cfg.sizes) {
    console.log(`Benchmarking 1D convolution size: ${size}`);

    const kernelSize = Math.max(3, Math.floor(size / 16));
    const { signal, kernel } = TestData.convolution1D(size, kernelSize);

    const bench = new Bench({
      time: cfg.benchTime,
      iterations: cfg.iterations,
    });

    // WASM implementation
    bench.add(`WASM 1D Convolution (${size}x${kernelSize})`, () => {
      convolutionTestFunctions.testConvolutionWithData(signal, kernel);
    });

    // JIT-optimized JavaScript implementation
    bench.add(`JS JIT 1D Convolution (${size}x${kernelSize})`, () => {
      const result = new Float32Array(size + kernelSize - 1);
      convolution(signal, kernel, result);
    });

    await bench.run();

    const wasmTask = bench.tasks.find((t) => t.name.includes("WASM"));
    const jsNaiveTask = bench.tasks.find((t) => t.name.includes("JS Naive"));
    const jsJitTask = bench.tasks.find((t) => t.name.includes("JS JIT"));

    if (wasmTask && jsNaiveTask && jsJitTask) {
      results.push({
        size,
        kernelSize,
        wasmOps: wasmTask.result?.hz || 0,
        jsNaiveOps: jsNaiveTask.result?.hz || 0,
        jsJitOps: jsJitTask.result?.hz || 0,
        speedupVsNaive:
          (wasmTask.result?.hz || 0) / (jsNaiveTask.result?.hz || 1),
        speedupVsJit: (wasmTask.result?.hz || 0) / (jsJitTask.result?.hz || 1),
        wasmTime: wasmTask.result?.mean || 0,
        jsNaiveTime: jsNaiveTask.result?.mean || 0,
        jsJitTime: jsJitTask.result?.mean || 0,
      });
    }
  }

  return results;
}

/**
 * Benchmark 2D convolution operations across different sizes
 */
export async function benchmarkConvolution2D(
  config: Partial<ConvolutionBenchConfig> = {},
): Promise<BenchmarkResult[]> {
  await ensureWasmInit();

  const cfg = { ...defaultConfig, ...config };
  const results: BenchmarkResult[] = [];

  for (const size of cfg.sizes) {
    console.log(`Benchmarking 2D convolution size: ${size}x${size}`);

    const kernelSize = Math.max(3, Math.min(9, Math.floor(size / 16)));
    const { image, kernel } = TestData.convolution2D(size, kernelSize);

    const bench = new Bench({
      time: cfg.benchTime,
      iterations: cfg.iterations,
    });

    // WASM implementation
    bench.add(
      `WASM 2D Convolution (${size}x${size}, ${kernelSize}x${kernelSize})`,
      () => {
        convolutionTestFunctions.test2DConvolutionWithData(
          image,
          kernel,
          size,
          kernelSize,
        );
      },
    );

    // JIT-optimized JavaScript implementation
    bench.add(
      `JS JIT 2D Convolution (${size}x${size}, ${kernelSize}x${kernelSize})`,
      () => {
        const result = new Float32Array(size * size);
        convolution_2d(image, kernel, result, size, size, kernelSize);
      },
    );

    await bench.run();

    const wasmTask = bench.tasks.find((t) => t.name.includes("WASM"));
    const jsNaiveTask = bench.tasks.find((t) => t.name.includes("JS Naive"));
    const jsJitTask = bench.tasks.find((t) => t.name.includes("JS JIT"));

    if (wasmTask && jsNaiveTask && jsJitTask) {
      results.push({
        size,
        kernelSize,
        wasmOps: wasmTask.result?.hz || 0,
        jsNaiveOps: jsNaiveTask.result?.hz || 0,
        jsJitOps: jsJitTask.result?.hz || 0,
        speedupVsNaive:
          (wasmTask.result?.hz || 0) / (jsNaiveTask.result?.hz || 1),
        speedupVsJit: (wasmTask.result?.hz || 0) / (jsJitTask.result?.hz || 1),
        wasmTime: wasmTask.result?.mean || 0,
        jsNaiveTime: jsNaiveTask.result?.mean || 0,
        jsJitTime: jsJitTask.result?.mean || 0,
      });
    }
  }

  return results;
}

/**
 * Find the sweet spot where WASM becomes faster than JavaScript
 */
export async function findWasmSweetSpot(
  convolutionType: "1d" | "2d" = "1d",
  startSize = 4,
  maxSize = 1024,
  step = 4,
): Promise<{ sweetSpotSize: number | null; results: BenchmarkResult[] }> {
  await ensureWasmInit();

  const sizes = [];
  for (let size = startSize; size <= maxSize; size *= step) {
    sizes.push(size);
  }

  const results =
    convolutionType === "1d"
      ? await benchmarkConvolution1D({ sizes, benchTime: 500, iterations: 5 })
      : await benchmarkConvolution2D({ sizes, benchTime: 500, iterations: 5 });

  // Find first size where WASM is faster than both JS implementations
  const sweetSpotResult = results.find(
    (r) => r.speedupVsNaive > 1.0 && r.speedupVsJit > 1.0,
  );

  return {
    sweetSpotSize: sweetSpotResult?.size || null,
    results,
  };
}

/**
 * Print benchmark results in a formatted table
 */
export function printBenchmarkResults(
  results: BenchmarkResult[],
  title: string,
) {
  console.log(`\n=== ${title} ===`);
  console.log(
    "Size\tKernel\tWASM(ops/s)\tJS-Naive(ops/s)\tJS-JIT(ops/s)\tSpeedup vs Naive\tSpeedup vs JIT",
  );
  console.log("-".repeat(120));

  for (const result of results) {
    console.log(
      `${result.size}\t${result.kernelSize}\t${result.wasmOps.toFixed(0)}\t\t${result.jsNaiveOps.toFixed(0)}\t\t${result.jsJitOps.toFixed(0)}\t\t${result.speedupVsNaive.toFixed(2)}x\t\t${result.speedupVsJit.toFixed(2)}x`,
    );
  }
}

/**
 * Quick benchmark runner for testing different ticket sizes
 */
export async function quickSizeBenchmark(
  sizes: number[],
  convolutionType: "1d" | "2d" = "1d",
) {
  console.log(
    `Running quick ${convolutionType.toUpperCase()} convolution benchmark...`,
  );

  const results =
    convolutionType === "1d"
      ? await benchmarkConvolution1D({
          sizes,
          benchTime: 200,
          iterations: 3,
          warmupRuns: 1,
        })
      : await benchmarkConvolution2D({
          sizes,
          benchTime: 200,
          iterations: 3,
          warmupRuns: 1,
        });

  printBenchmarkResults(
    results,
    `${convolutionType.toUpperCase()} Convolution Performance`,
  );

  return results;
}

/**
 * Comprehensive benchmark suite
 */
export async function runComprehensiveBenchmark() {
  console.log("Starting comprehensive convolution benchmark suite...");

  // 1D benchmarks
  const sizes1D = [16, 32, 64, 128, 256, 512, 1024];
  const results1D = await benchmarkConvolution1D({ sizes: sizes1D });
  printBenchmarkResults(results1D, "1D Convolution Performance");

  // 2D benchmarks
  const sizes2D = [8, 16, 32, 64, 128, 256];
  const results2D = await benchmarkConvolution2D({ sizes: sizes2D });
  printBenchmarkResults(results2D, "2D Convolution Performance");

  // Find sweet spots
  console.log("\nFinding performance sweet spots...");
  const sweetSpot1D = await findWasmSweetSpot("1d");
  const sweetSpot2D = await findWasmSweetSpot("2d");

  console.log("\n=== Sweet Spot Analysis ===");
  console.log(
    `1D Convolution WASM sweet spot: ${sweetSpot1D.sweetSpotSize || "Not found in tested range"}`,
  );
  console.log(
    `2D Convolution WASM sweet spot: ${sweetSpot2D.sweetSpotSize || "Not found in tested range"}`,
  );

  return {
    results1D,
    results2D,
    sweetSpot1D: sweetSpot1D.sweetSpotSize,
    sweetSpot2D: sweetSpot2D.sweetSpotSize,
  };
}
