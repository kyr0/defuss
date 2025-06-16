// Simple test to debug parallel execution
import init, { 
  initThreadPool, 
  batch_dot_product_hyper_optimized,
  batch_dot_product_hyper_optimized_parallel 
} from "./pkg/defuss_fastmath.js";

async function debugParallel() {
  console.log("🔧 Initializing WASM...");
  const wasmInstance = await init();
  
  console.log("🔧 SharedArrayBuffer available:", typeof SharedArrayBuffer !== 'undefined');
  console.log("🔧 CrossOriginIsolated:", crossOriginIsolated);
  
  try {
    console.log("🔧 Initializing thread pool...");
    await initThreadPool(4);
    console.log("✅ Thread pool initialized successfully");
  } catch (e) {
    console.log("❌ Thread pool initialization failed:", e);
  }
  
  // Create small test data
  const vectorLength = 4;
  const numPairs = 2;
  const aData = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);  // 2 vectors of length 4
  const bData = new Float32Array([1, 1, 1, 1, 2, 2, 2, 2]);  // 2 vectors of length 4
  
  // Copy to WASM memory
  const memory = wasmInstance.memory;
  const aOffset = 0;
  const bOffset = aData.length * 4;
  const resultsOffset = bOffset + bData.length * 4;
  
  const aView = new Float32Array(memory.buffer, aOffset, aData.length);
  const bView = new Float32Array(memory.buffer, bOffset, bData.length);
  const resultsView = new Float32Array(memory.buffer, resultsOffset, numPairs);
  
  aView.set(aData);
  bView.set(bData);
  
  console.log("🔧 Testing sequential function...");
  const start1 = performance.now();
  batch_dot_product_hyper_optimized(aOffset, bOffset, resultsOffset, vectorLength, numPairs);
  const end1 = performance.now();
  console.log("✅ Sequential function completed in", (end1 - start1).toFixed(3), "ms");
  console.log("Sequential results:", Array.from(resultsView));
  
  // Reset results
  resultsView.fill(0);
  
  console.log("🔧 Testing parallel function...");
  const start2 = performance.now();
  
  // Set a timeout to detect hanging
  const timeout = setTimeout(() => {
    console.log("❌ Parallel function appears to be hanging after 5 seconds");
  }, 5000);
  
  try {
    batch_dot_product_hyper_optimized_parallel(aOffset, bOffset, resultsOffset, vectorLength, numPairs);
    clearTimeout(timeout);
    const end2 = performance.now();
    console.log("✅ Parallel function completed in", (end2 - start2).toFixed(3), "ms");
    console.log("Parallel results:", Array.from(resultsView));
  } catch (e) {
    clearTimeout(timeout);
    console.log("❌ Parallel function threw error:", e);
  }
}

debugParallel();
