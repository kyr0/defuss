import { describe, it, expect, beforeAll } from "vitest";
import init from "../pkg/defuss_fastmath.js";
import { Bench } from "tinybench";
import { convolutionTestFunctions } from "./convolution-test-functions.js";

describe("Convolution Benchmarks", () => {
  beforeAll(async () => {
    await init();
  });

  it("should benchmark 1D convolution vs naive implementation", async () => {
    const bench = new Bench({ time: 200 });
    
    // Create test data - use the same data for both implementations
    const { signal, kernel } = convolutionTestFunctions.createLargeConvolutionData();
    
    bench
      .add('WASM 1D Convolution', () => {
        convolutionTestFunctions.testLargeConvolutionWithData(signal, kernel);
      })
      .add('JavaScript Naive 1D Convolution', () => {
        convolutionTestFunctions.naiveConvolution(signal, kernel);
      });

    await bench.run();
    console.table(bench.table());
    
    // Verify both implementations produce similar results using the same data
    const wasmResult = convolutionTestFunctions.testLargeConvolutionWithData(signal, kernel);
    const jsResult = convolutionTestFunctions.naiveConvolution(signal, kernel);
    
    // Check that results are approximately equal (within floating-point precision)
    expect(wasmResult.length).toBe(jsResult.length);
    for (let i = 0; i < Math.min(wasmResult.length, jsResult.length); i++) {
      expect(Math.abs(wasmResult[i] - jsResult[i])).toBeLessThan(1e-5);
    }
  });

  it("should benchmark 2D convolution vs naive implementation", async () => {
    const bench = new Bench({ time: 200 });
    
    // Create test data - use the same data for both implementations
    const { image, kernel, size, kernelSize } = convolutionTestFunctions.createLarge2DConvolutionData();
    
    bench
      .add('WASM 2D Convolution', () => {
        convolutionTestFunctions.testLarge2DConvolutionWithData(image, kernel, size, kernelSize);
      })
      .add('JavaScript Naive 2D Convolution', () => {
        convolutionTestFunctions.naive2DConvolution(image, kernel, size, size, kernelSize);
      });

    await bench.run();
    console.table(bench.table());
    
    // Verify both implementations produce similar results using the same data
    const wasmResult = convolutionTestFunctions.testLarge2DConvolutionWithData(image, kernel, size, kernelSize);
    const jsResult = convolutionTestFunctions.naive2DConvolution(image, kernel, size, size, kernelSize);
    
    // Check that results are approximately equal (within floating-point precision)
    expect(wasmResult.length).toBe(jsResult.length);
    for (let i = 0; i < Math.min(wasmResult.length, jsResult.length); i++) {
      expect(Math.abs(wasmResult[i] - jsResult[i])).toBeLessThan(1e-4);
    }
  });

  it("should benchmark different convolution operations", async () => {
    const bench = new Bench({ time: 100 });
    
    bench
      .add('1D Convolution', () => {
        convolutionTestFunctions.test1DConvolution();
      })
      .add('Cross Correlation', () => {
        convolutionTestFunctions.testCrossCorrelation();
      })
      .add('Auto Correlation', () => {
        convolutionTestFunctions.testAutoCorrelation();
      })
      .add('2D Convolution', () => {
        convolutionTestFunctions.test2DConvolution();
      })
      .add('2D Edge Detection', () => {
        convolutionTestFunctions.test2DEdgeDetection();
      });

    await bench.run();
    console.table(bench.table());
    
    // Verify all operations work correctly
    expect(convolutionTestFunctions.test1DConvolution().length).toBeGreaterThan(0);
    expect(convolutionTestFunctions.testCrossCorrelation().length).toBeGreaterThan(0);
    expect(convolutionTestFunctions.testAutoCorrelation().length).toBeGreaterThan(0);
    expect(convolutionTestFunctions.test2DConvolution().length).toBeGreaterThan(0);
    expect(convolutionTestFunctions.test2DEdgeDetection().length).toBeGreaterThan(0);
  });

  it("should benchmark large-scale convolution performance", async () => {
    const bench = new Bench({ time: 300 });
    
    bench
      .add('Large 1D Convolution (1024 signal, 64 kernel)', () => {
        convolutionTestFunctions.testLargeConvolution();
      })
      .add('Large 2D Convolution (128x128 image, 5x5 kernel)', () => {
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
    const { signal, kernel } = convolutionTestFunctions.createLargeConvolutionData();
    
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
});
