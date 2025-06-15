/**
 * @fileoverview WebNN performance benchmarks and threshold analysis
 * 
 * This benchmark analyzes at what data sizes WebNN becomes the fastest option
 * compared to WASM and JavaScript implementations.
 */

import { beforeAll, describe, it } from "vitest";
import { Bench } from "tinybench";
import {
  convolutionAsync,
  convolution2DAsync,
  WebNNUtils,
} from "./index.js";
import {
  convolution as convolution_js,
  convolution_2d as convolution_2d_js,
} from "./convolution.js";
import {
  convolution as convolution_wasm,
  convolution_2d as convolution_2d_wasm,
} from "../pkg/defuss_fastmath.js";
import {
  convolution1D_webnn,
  convolution2D_webnn,
  isWebNNAvailable,
} from "./convolution_webnn.js";
import { ensureWasmInit } from "./bench-util.js";
import { TestData, BenchmarkUtils } from "./test-utils.js";

describe("WebNN Performance Analysis", () => {
  let isWebNNSupported = false;

  beforeAll(async () => {
    await ensureWasmInit();
    isWebNNSupported = await isWebNNAvailable();
    console.log(`🧠 WebNN Support: ${isWebNNSupported ? "✅ Available" : "❌ Not Available"}`);
    
    if (isWebNNSupported) {
      // Pre-warm WebNN system
      try {
        const warmupSignal = TestData.signal(64);
        const warmupKernel = TestData.kernel1D(8);
        const warmupResult = new Float32Array(64 + 8 - 1);
        await convolution1D_webnn(warmupSignal, warmupKernel, warmupResult);
        console.log("🔥 WebNN system warmed up");
      } catch (error) {
        console.warn("⚠️ WebNN warmup failed:", error);
      }
    }
  });

  it("should find optimal size thresholds for 1D convolution", async () => {
    if (!isWebNNSupported) {
      console.log("⏭️ Skipping WebNN benchmarks - not supported");
      return;
    }

    console.log("\n🎯 WebNN 1D Convolution Threshold Analysis");
    console.log("=" .repeat(60));

    // Test a wide range of sizes to find crossover points
    const testSizes = [
      8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 1536, 2048, 3072, 4096
    ];

    const results: Array<{
      size: number;
      kernelSize: number;
      webnn: number;
      wasm: number;
      js: number;
      adaptive: number;
      fastest: string;
      webnnAdvantage: number;
    }> = [];

    for (const size of testSizes) {
      const kernelSize = Math.max(3, Math.floor(size / 16));
      
      console.log(`\n📊 Testing size ${size} (kernel: ${kernelSize})`);

      // Generate test data
      const signal = TestData.signal(size);
      const kernel = TestData.kernel1D(kernelSize);
      const resultLength = size + kernelSize - 1;
      
      // Pre-allocate result buffers
      const webnnResult = new Float32Array(resultLength);
      const wasmResult = new Float32Array(resultLength);
      const jsResult = new Float32Array(resultLength);
      const adaptiveResult = new Float32Array(resultLength);

      const bench = new Bench({ time: 1000, iterations: 50 });

      // Add benchmark cases
      bench
        .add("WebNN", async () => {
          await convolution1D_webnn(signal, kernel, webnnResult);
        })
        .add("WASM", () => {
          convolution_wasm(signal, kernel, wasmResult);
        })
        .add("JavaScript", () => {
          convolution_js(signal, kernel, jsResult);
        })
        .add("Adaptive (with WebNN)", async () => {
          await convolutionAsync(signal, kernel, adaptiveResult);
        });

      // Run the benchmark
      await bench.run();

      // Analyze results
      const webnnOps = bench.tasks.find(t => t.name === "WebNN")?.result?.hz ?? 0;
      const wasmOps = bench.tasks.find(t => t.name === "WASM")?.result?.hz ?? 0;
      const jsOps = bench.tasks.find(t => t.name === "JavaScript")?.result?.hz ?? 0;
      const adaptiveOps = bench.tasks.find(t => t.name === "Adaptive (with WebNN)")?.result?.hz ?? 0;

      const fastest = Math.max(webnnOps, wasmOps, jsOps, adaptiveOps);
      let fastestName = "Unknown";
      
      if (fastest === webnnOps) fastestName = "WebNN";
      else if (fastest === wasmOps) fastestName = "WASM";
      else if (fastest === jsOps) fastestName = "JavaScript";
      else if (fastest === adaptiveOps) fastestName = "Adaptive";

      const webnnAdvantage = fastest > 0 ? (webnnOps / fastest * 100) : 0;

      results.push({
        size,
        kernelSize,
        webnn: webnnOps,
        wasm: wasmOps,
        js: jsOps,
        adaptive: adaptiveOps,
        fastest: fastestName,
        webnnAdvantage,
      });

      // Real-time feedback
      console.log(`  WebNN: ${webnnOps.toFixed(0)} ops/sec`);
      console.log(`  WASM: ${wasmOps.toFixed(0)} ops/sec`);
      console.log(`  JS: ${jsOps.toFixed(0)} ops/sec`);
      console.log(`  Adaptive: ${adaptiveOps.toFixed(0)} ops/sec`);
      console.log(`  🏆 Fastest: ${fastestName} (WebNN at ${webnnAdvantage.toFixed(1)}%)`);
    }

    // Analyze crossover points
    console.log("\n📈 Performance Analysis Summary");
    console.log("=" .repeat(60));
    
    const webnnWins = results.filter(r => r.fastest === "WebNN");
    const webnnThreshold = webnnWins.length > 0 ? Math.min(...webnnWins.map(r => r.size)) : null;
    
    console.log(`🎯 WebNN becomes fastest at size: ${webnnThreshold ?? "Never"}`);
    console.log(`🏆 WebNN wins in ${webnnWins.length}/${results.length} test cases`);
    
    if (webnnWins.length > 0) {
      const avgAdvantage = webnnWins.reduce((sum, r) => sum + (r.webnn / Math.max(r.wasm, r.js) - 1) * 100, 0) / webnnWins.length;
      console.log(`📊 Average WebNN advantage when winning: ${avgAdvantage.toFixed(1)}%`);
    }

    // Print detailed results
    console.log("\n📋 Detailed Results:");
    console.log("Size\tKernel\tWebNN\t\tWASM\t\tJS\t\tAdaptive\tFastest");
    console.log("-".repeat(80));
    results.forEach(r => {
      console.log(`${r.size}\t${r.kernelSize}\t${r.webnn.toFixed(0)}\t\t${r.wasm.toFixed(0)}\t\t${r.js.toFixed(0)}\t\t${r.adaptive.toFixed(0)}\t\t${r.fastest}`);
    });
  });

  it("should find optimal size thresholds for 2D convolution", async () => {
    if (!isWebNNSupported) {
      console.log("⏭️ Skipping WebNN 2D benchmarks - not supported");
      return;
    }

    console.log("\n🎯 WebNN 2D Convolution Threshold Analysis");
    console.log("=" .repeat(60));

    // Test different image sizes to find crossover points
    const imageSizes = [8, 16, 24, 32, 48, 64, 96, 128, 192, 256];
    const kernelSizes = [3, 5, 7, 9];

    const results: Array<{
      imageSize: number;
      kernelSize: number;
      webnn: number;
      wasm: number;
      js: number;
      adaptive: number;
      fastest: string;
      webnnAdvantage: number;
    }> = [];

    for (const imageSize of imageSizes) {
      for (const kernelSize of kernelSizes) {
        console.log(`\n📊 Testing ${imageSize}x${imageSize} image with ${kernelSize}x${kernelSize} kernel`);

        // Generate test data
        const image = TestData.image2D(imageSize);
        const kernel = TestData.kernel2D(kernelSize);
        const resultLength = imageSize * imageSize;
        
        // Pre-allocate result buffers
        const webnnResult = new Float32Array(resultLength);
        const wasmResult = new Float32Array(resultLength);
        const jsResult = new Float32Array(resultLength);
        const adaptiveResult = new Float32Array(resultLength);

        const bench = new Bench({ time: 800, iterations: 30 });

        // Add benchmark cases
        bench
          .add("WebNN", async () => {
            await convolution2D_webnn(image, kernel, webnnResult, imageSize, imageSize, kernelSize);
          })
          .add("WASM", () => {
            convolution_2d_wasm(image, kernel, wasmResult, imageSize, imageSize, kernelSize);
          })
          .add("JavaScript", () => {
            convolution_2d_js(image, kernel, wasmResult, imageSize, imageSize, kernelSize);
          })
          .add("Adaptive (with WebNN)", async () => {
            await convolution2DAsync(image, kernel, adaptiveResult, imageSize, imageSize, kernelSize);
          });

        // Run the benchmark
        await bench.run();

        // Analyze results
        const webnnOps = bench.tasks.find(t => t.name === "WebNN")?.result?.hz ?? 0;
        const wasmOps = bench.tasks.find(t => t.name === "WASM")?.result?.hz ?? 0;
        const jsOps = bench.tasks.find(t => t.name === "JavaScript")?.result?.hz ?? 0;
        const adaptiveOps = bench.tasks.find(t => t.name === "Adaptive (with WebNN)")?.result?.hz ?? 0;

        const fastest = Math.max(webnnOps, wasmOps, jsOps, adaptiveOps);
        let fastestName = "Unknown";
        
        if (fastest === webnnOps) fastestName = "WebNN";
        else if (fastest === wasmOps) fastestName = "WASM";
        else if (fastest === jsOps) fastestName = "JavaScript";
        else if (fastest === adaptiveOps) fastestName = "Adaptive";

        const webnnAdvantage = fastest > 0 ? (webnnOps / fastest * 100) : 0;

        results.push({
          imageSize,
          kernelSize,
          webnn: webnnOps,
          wasm: wasmOps,
          js: jsOps,
          adaptive: adaptiveOps,
          fastest: fastestName,
          webnnAdvantage,
        });

        // Real-time feedback
        console.log(`  WebNN: ${webnnOps.toFixed(0)} ops/sec`);
        console.log(`  WASM: ${wasmOps.toFixed(0)} ops/sec`);
        console.log(`  JS: ${jsOps.toFixed(0)} ops/sec`);
        console.log(`  Adaptive: ${adaptiveOps.toFixed(0)} ops/sec`);
        console.log(`  🏆 Fastest: ${fastestName} (WebNN at ${webnnAdvantage.toFixed(1)}%)`);
      }
    }

    // Analyze 2D results
    console.log("\n📈 2D Performance Analysis Summary");
    console.log("=" .repeat(60));
    
    const webnnWins = results.filter(r => r.fastest === "WebNN");
    console.log(`🏆 WebNN wins in ${webnnWins.length}/${results.length} test cases`);
    
    if (webnnWins.length > 0) {
      const minWinningSize = Math.min(...webnnWins.map(r => r.imageSize));
      console.log(`🎯 WebNN becomes competitive at image size: ${minWinningSize}x${minWinningSize}`);
      
      const avgAdvantage = webnnWins.reduce((sum, r) => sum + (r.webnn / Math.max(r.wasm, r.js) - 1) * 100, 0) / webnnWins.length;
      console.log(`📊 Average WebNN advantage when winning: ${avgAdvantage.toFixed(1)}%`);
    }

    // Group by kernel size for better analysis
    kernelSizes.forEach(kSize => {
      const kernelResults = results.filter(r => r.kernelSize === kSize);
      const kernelWins = kernelResults.filter(r => r.fastest === "WebNN");
      console.log(`📐 Kernel ${kSize}x${kSize}: WebNN wins ${kernelWins.length}/${kernelResults.length} cases`);
      
      if (kernelWins.length > 0) {
        const minSize = Math.min(...kernelWins.map(r => r.imageSize));
        console.log(`   Threshold: ${minSize}x${minSize} image`);
      }
    });
  });

  it("should verify WebNN utility functions", async () => {
    console.log("\n🔧 WebNN Utilities Test");
    console.log("=" .repeat(40));

    // Test availability check
    const isAvailable = await WebNNUtils.isAvailable();
    console.log(`📋 WebNN Available: ${isAvailable}`);

    // Test cached availability
    const cached = WebNNUtils.getCachedAvailability();
    console.log(`💾 Cached Availability: ${cached}`);

    // Test stats
    if (isAvailable) {
      const stats = WebNNUtils.getStats();
      console.log("📊 WebNN Stats:", stats);

      // Test re-check
      const rechecked = await WebNNUtils.recheckAvailability();
      console.log(`🔄 Re-checked Availability: ${rechecked}`);
    }
  });
});
