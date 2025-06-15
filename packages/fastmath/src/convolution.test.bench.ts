import { describe, it, expect, beforeAll } from "vitest";
import init from "../pkg/defuss_fastmath.js";
import { Bench } from "tinybench";
import { convolutionTestFunctions } from "./convolution-test-functions.js";

describe("Convolution Benchmarks", () => {
  beforeAll(async () => {
    await init();
  });

  it("should benchmark 1D convolution vs naive implementation", async () => {
    const bench = new Bench({ time: 1000, iterations: 10 });

    // Create test data - use the same data for both implementations
    const { signal, kernel } =
      convolutionTestFunctions.createLargeConvolutionData();

    bench
      .add("WASM 1D Convolution", () => {
        convolutionTestFunctions.testLargeConvolutionWithData(signal, kernel);
      })
      .add("JavaScript Naive 1D Convolution", () => {
        convolutionTestFunctions.naiveConvolution(signal, kernel);
      });

    await bench.run();
    console.table(bench.table());

    // Verify both implementations produce similar results using the same data
    const wasmResult = convolutionTestFunctions.testLargeConvolutionWithData(
      signal,
      kernel,
    );
    const jsResult = convolutionTestFunctions.naiveConvolution(signal, kernel);

    // Check that results are approximately equal (within floating-point precision)
    expect(wasmResult.length).toBe(jsResult.length);
    for (let i = 0; i < Math.min(wasmResult.length, jsResult.length); i++) {
      expect(Math.abs(wasmResult[i] - jsResult[i])).toBeLessThan(1e-5);
    }
  });

  it("should benchmark 2D convolution vs naive implementation", async () => {
    const bench = new Bench({ time: 1000, iterations: 10 });

    // Create test data - use the same data for both implementations
    const { image, kernel, size, kernelSize } =
      convolutionTestFunctions.createLarge2DConvolutionData();

    bench
      .add("WASM 2D Convolution", () => {
        convolutionTestFunctions.testLarge2DConvolutionWithData(
          image,
          kernel,
          size,
          kernelSize,
        );
      })
      .add("JavaScript Naive 2D Convolution", () => {
        convolutionTestFunctions.naive2DConvolution(
          image,
          kernel,
          size,
          size,
          kernelSize,
        );
      });

    await bench.run();
    console.table(bench.table());

    // Verify both implementations produce similar results using the same data
    const wasmResult = convolutionTestFunctions.testLarge2DConvolutionWithData(
      image,
      kernel,
      size,
      kernelSize,
    );
    const jsResult = convolutionTestFunctions.naive2DConvolution(
      image,
      kernel,
      size,
      size,
      kernelSize,
    );

    // Check that results are approximately equal (within floating-point precision)
    expect(wasmResult.length).toBe(jsResult.length);
    for (let i = 0; i < Math.min(wasmResult.length, jsResult.length); i++) {
      expect(Math.abs(wasmResult[i] - jsResult[i])).toBeLessThan(1e-4);
    }
  });

  it("should benchmark different convolution operations", async () => {
    const bench = new Bench({ time: 500, iterations: 5 });

    bench
      .add("1D Convolution", () => {
        convolutionTestFunctions.test1DConvolution();
      })
      .add("Cross Correlation", () => {
        convolutionTestFunctions.testCrossCorrelation();
      })
      .add("Auto Correlation", () => {
        convolutionTestFunctions.testAutoCorrelation();
      })
      .add("2D Convolution", () => {
        convolutionTestFunctions.test2DConvolution();
      })
      .add("2D Edge Detection", () => {
        convolutionTestFunctions.test2DEdgeDetection();
      });

    await bench.run();
    console.table(bench.table());

    // Verify all operations work correctly
    expect(convolutionTestFunctions.test1DConvolution().length).toBeGreaterThan(
      0,
    );
    expect(
      convolutionTestFunctions.testCrossCorrelation().length,
    ).toBeGreaterThan(0);
    expect(
      convolutionTestFunctions.testAutoCorrelation().length,
    ).toBeGreaterThan(0);
    expect(convolutionTestFunctions.test2DConvolution().length).toBeGreaterThan(
      0,
    );
    expect(
      convolutionTestFunctions.test2DEdgeDetection().length,
    ).toBeGreaterThan(0);
  });

  it("should benchmark large-scale convolution performance", async () => {
    const bench = new Bench({ time: 1500, iterations: 10 });

    bench
      .add("Large 1D Convolution (1024 signal, 64 kernel)", () => {
        convolutionTestFunctions.testLargeConvolution();
      })
      .add("Large 2D Convolution (128x128 image, 5x5 kernel)", () => {
        convolutionTestFunctions.testLarge2DConvolution();
      });

    await bench.run();
    console.table(bench.table());

    // Verify large operations complete successfully
    const large1D = convolutionTestFunctions.testLargeConvolution();
    const large2D = convolutionTestFunctions.testLarge2DConvolution();

    expect(large1D.length).toBe(1024 + 64 - 1); // Expected output length
    expect(large2D.length).toBe(128 * 128); // Expected output length
  });

  it("should demonstrate WASM vs JS performance characteristics", async () => {
    // This test demonstrates the performance comparison between WASM and JS
    // Note: WASM may not always be faster for small operations due to call overhead
    const iterations = 10;
    const { signal, kernel } =
      convolutionTestFunctions.createLargeConvolutionData();

    // Warm up both implementations
    for (let i = 0; i < 3; i++) {
      convolutionTestFunctions.testLargeConvolutionWithData(signal, kernel);
      convolutionTestFunctions.naiveConvolution(signal, kernel);
    }

    // Time WASM implementation
    const wasmStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      convolutionTestFunctions.testLargeConvolutionWithData(signal, kernel);
    }
    const wasmTime = performance.now() - wasmStart;

    // Time JS implementation
    const jsStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      convolutionTestFunctions.naiveConvolution(signal, kernel);
    }
    const jsTime = performance.now() - jsStart;

    console.log(`WASM time: ${wasmTime.toFixed(2)}ms`);
    console.log(`JS time: ${jsTime.toFixed(2)}ms`);
    console.log(`Speedup: ${(jsTime / wasmTime).toFixed(2)}x`);

    // Just verify both implementations complete successfully
    // Performance can vary based on data size and browser optimizations
    expect(wasmTime).toBeGreaterThan(0);
    expect(jsTime).toBeGreaterThan(0);
  });

  it("should benchmark WASM vs naive JS vs JIT-optimized JS convolution", async () => {
    const bench = new Bench({ time: 2000, iterations: 15 });

    // Create test data - use the same data for all three implementations
    const { signal, kernel } =
      convolutionTestFunctions.createLargeConvolutionData();

    bench
      .add("WASM 1D Convolution", () => {
        convolutionTestFunctions.testLargeConvolutionWithData(signal, kernel);
      })
      .add("JavaScript Naive 1D Convolution", () => {
        convolutionTestFunctions.naiveConvolution(signal, kernel);
      })
      .add("JavaScript JIT-Optimized 1D Convolution (unroll 4)", () => {
        convolutionTestFunctions.jitOptimizedConvolution(signal, kernel);
      });

    await bench.run();
    console.table(bench.table());

    // Extract benchmark results and calculate speedups
    const results = bench.tasks.map((task) => ({
      name: task.name,
      hz: task.result?.hz || 0,
      mean: task.result?.mean || 0,
      period: task.result?.period || 0,
    }));

    const wasmResult = results.find((r) => r.name.includes("WASM"));
    const naiveResult = results.find((r) => r.name.includes("Naive"));
    const jitResult = results.find((r) => r.name.includes("JIT-Optimized"));

    if (wasmResult && naiveResult && jitResult) {
      // Calculate speedups using operations per second (hz)
      const wasmVsNaiveSpeedup = wasmResult.hz / naiveResult.hz;
      const wasmVsJitSpeedup = wasmResult.hz / jitResult.hz;
      const jitVsNaiveSpeedup = jitResult.hz / naiveResult.hz;

      console.log("\n=== 1D Convolution Performance Results ===");
      console.log(
        `WASM: ${wasmResult.hz.toFixed(0)} ops/sec (${(wasmResult.mean * 1000).toFixed(2)}ms avg)`,
      );
      console.log(
        `Naive JS: ${naiveResult.hz.toFixed(0)} ops/sec (${(naiveResult.mean * 1000).toFixed(2)}ms avg)`,
      );
      console.log(
        `JIT-optimized JS: ${jitResult.hz.toFixed(0)} ops/sec (${(jitResult.mean * 1000).toFixed(2)}ms avg)`,
      );
      console.log("\n=== Speedup Comparisons ===");
      console.log(
        `WASM vs Naive JS: ${wasmVsNaiveSpeedup.toFixed(2)}x speedup`,
      );
      console.log(
        `WASM vs JIT-optimized JS: ${wasmVsJitSpeedup.toFixed(2)}x speedup`,
      );
      console.log(
        `JIT-optimized vs Naive JS: ${jitVsNaiveSpeedup.toFixed(2)}x speedup`,
      );
    }

    // Verify all three implementations produce similar results
    const wasmResultData =
      convolutionTestFunctions.testLargeConvolutionWithData(signal, kernel);
    const naiveResultData = convolutionTestFunctions.naiveConvolution(
      signal,
      kernel,
    );
    const jitResultData = convolutionTestFunctions.jitOptimizedConvolution(
      signal,
      kernel,
    );

    // Check that results are approximately equal (within floating-point precision)
    expect(wasmResultData.length).toBe(naiveResultData.length);
    expect(wasmResultData.length).toBe(jitResultData.length);

    for (let i = 0; i < wasmResultData.length; i++) {
      expect(Math.abs(wasmResultData[i] - naiveResultData[i])).toBeLessThan(
        1e-5,
      );
      expect(Math.abs(wasmResultData[i] - jitResultData[i])).toBeLessThan(1e-5);
      expect(Math.abs(naiveResultData[i] - jitResultData[i])).toBeLessThan(
        1e-5,
      );
    }
  });

  it("should benchmark WASM vs naive JS vs JIT-optimized JS 2D convolution", async () => {
    const bench = new Bench({ time: 2000, iterations: 10 });

    // Create test data - use the same data for all three implementations
    const { image, kernel, size, kernelSize } =
      convolutionTestFunctions.createLarge2DConvolutionData();

    bench
      .add("WASM 2D Convolution", () => {
        convolutionTestFunctions.testLarge2DConvolutionWithData(
          image,
          kernel,
          size,
          kernelSize,
        );
      })
      .add("JavaScript Naive 2D Convolution", () => {
        convolutionTestFunctions.naive2DConvolution(
          image,
          kernel,
          size,
          size,
          kernelSize,
        );
      })
      .add("JavaScript JIT-Optimized 2D Convolution (unroll 4)", () => {
        convolutionTestFunctions.jitOptimized2DConvolution(
          image,
          kernel,
          size,
          size,
          kernelSize,
        );
      });

    await bench.run();
    console.table(bench.table());

    // Extract benchmark results and calculate speedups
    const results = bench.tasks.map((task) => ({
      name: task.name,
      hz: task.result?.hz || 0,
      mean: task.result?.mean || 0,
      period: task.result?.period || 0,
    }));

    const wasmResult = results.find((r) => r.name.includes("WASM"));
    const naiveResult = results.find((r) => r.name.includes("Naive"));
    const jitResult = results.find((r) => r.name.includes("JIT-Optimized"));

    if (wasmResult && naiveResult && jitResult) {
      // Calculate speedups using operations per second (hz)
      const wasmVsNaiveSpeedup = wasmResult.hz / naiveResult.hz;
      const wasmVsJitSpeedup = wasmResult.hz / jitResult.hz;
      const jitVsNaiveSpeedup = jitResult.hz / naiveResult.hz;

      console.log("\n=== 2D Convolution Performance Results ===");
      console.log(
        `WASM: ${wasmResult.hz.toFixed(2)} ops/sec (${(wasmResult.mean * 1000).toFixed(2)}ms avg)`,
      );
      console.log(
        `Naive JS: ${naiveResult.hz.toFixed(2)} ops/sec (${(naiveResult.mean * 1000).toFixed(2)}ms avg)`,
      );
      console.log(
        `JIT-optimized JS: ${jitResult.hz.toFixed(2)} ops/sec (${(jitResult.mean * 1000).toFixed(2)}ms avg)`,
      );
      console.log("\n=== Speedup Comparisons ===");
      console.log(
        `WASM vs Naive JS: ${wasmVsNaiveSpeedup.toFixed(2)}x speedup`,
      );
      console.log(
        `WASM vs JIT-optimized JS: ${wasmVsJitSpeedup.toFixed(2)}x speedup`,
      );
      console.log(
        `JIT-optimized vs Naive JS: ${jitVsNaiveSpeedup.toFixed(2)}x speedup`,
      );
    }

    // Verify all three implementations produce similar results
    const wasmResultData =
      convolutionTestFunctions.testLarge2DConvolutionWithData(
        image,
        kernel,
        size,
        kernelSize,
      );
    const naiveResultData = convolutionTestFunctions.naive2DConvolution(
      image,
      kernel,
      size,
      size,
      kernelSize,
    );
    const jitResultData = convolutionTestFunctions.jitOptimized2DConvolution(
      image,
      kernel,
      size,
      size,
      kernelSize,
    );

    // Check that results are approximately equal (within floating-point precision)
    expect(wasmResultData.length).toBe(naiveResultData.length);
    expect(wasmResultData.length).toBe(jitResultData.length);

    for (let i = 0; i < wasmResultData.length; i++) {
      expect(Math.abs(wasmResultData[i] - naiveResultData[i])).toBeLessThan(
        1e-4,
      );
      expect(Math.abs(wasmResultData[i] - jitResultData[i])).toBeLessThan(1e-4);
      expect(Math.abs(naiveResultData[i] - jitResultData[i])).toBeLessThan(
        1e-4,
      );
    }
  });
});
