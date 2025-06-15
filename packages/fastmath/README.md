<h1 align="center">

<img src="assets/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss-fastmath</code>
</p>

<sup align="center">

Ludicrously fast multicore math for web browsers using WebAssembly and Web Workers

</sup>

</h1>

> `defuss-fastmath` is a high-performance WebAssembly module written in Rust, built for blazing-fast multicore math in web browsers. It uses SIMD-128 and Rayon with Web Workers to fully harness modern CPUs - ideal for ML primitives, sorting, searching, and real-time DSP (audio, graphics) in web applications.

# Features
- 🧠 **Vector Intrinsics**: WebAssembly bytecode using SIMD-128 instructions
- 🚀 **Fast Algorithms**: Optimized for vector/matrix ops, 2D graphics, audio/video filters, kernels, sources, sorting, searching and more
- 🔀 **Multicore Support**: Rayon-powered parallelism across CPU cores using Web Workers, ideal for data-heavy loops
- 🌐 **Web-Optimized**: Built specifically for web browsers with `--target web` for maximum performance
- 🧮 **Math Primitives**: Vector/Matrix ops, and more
- 📦 **Easy Integration**: Seamlessly fits into modern web applications with JavaScript and TypeScript
- 📚 **Hacker-Friendly Docs**: Clean inline docs, examples, unit tests, and benchmarks. Dive in and grok the codebase.

## Browser Requirements

This library requires modern browsers with support for:
- **WebAssembly (WASM)**: All modern browsers (Chrome 57+, Firefox 52+, Safari 11+, Edge 16+)
- **Web Workers**: For multicore parallelism 
- **SharedArrayBuffer**: Required for true parallel processing (enabled by default in modern browsers with proper headers)

## Usage

```javascript
import init, { init_thread_pool } from './pkg/defuss_fastmath.js';

async function setupFastmath() {
  // Initialize the WASM module
  await init();
  
  // Initialize the thread pool for multicore processing
  await init_thread_pool(navigator.hardwareConcurrency);
  
  // Now you can use the fast math functions!
}
```

**Note**: For multicore functionality, ensure your server sends the required headers:
```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```