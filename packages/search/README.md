<h1 align="center">

<img src="assets/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss-search</code>
</p>

<sup align="center">

Hybrid Text & Vector Search

</sup>

</h1>

> `defuss-search` is a ...

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

## Developer Notes

- The `decompile` task (`pnpm decompile`) generates a human-readable version of the WASM module (WAST) for debugging and understanding the instructions used. This requires a `wasm2wat` executable from the `wabt` package to be present in `PATH`. Make sure to e.g. `brew install wabt`.