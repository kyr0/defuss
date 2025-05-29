# LightningImg ⚡

A blazing fast, transparent, and safe image converter powered by WebAssembly. Convert PNG, JPG, TIFF, and GIF images to optimized WebP format with high performance and cross-platform compatibility.

## ✨ Features

- 🚀 **WebAssembly-powered**: Fast image processing using Rust and WASM
- 🌐 **Universal**: Works in both browsers and Node.js environments  
- 🔒 **Memory-safe**: Built with Rust for maximum safety and performance
- 📦 **ESM-first**: Modern ES module exports with TypeScript support
- 🎯 **Format support**: PNG, JPG, TIFF, GIF → WebP conversion
- 🔧 **Image resizing**: High-quality resizing with aspect ratio preservation
- 🪶 **Lightweight**: Minimal dependencies and optimized builds

## 🚀 Quick Start

### Installation

```bash
npm install lightningimg
# or
pnpm add lightningimg
# or  
yarn add lightningimg
```

### Basic Usage (ESM)

```javascript
import { convertImageBuffer, getImageInfo } from 'lightningimg';
import { readFileSync } from 'node:fs';

// Load an image
const imageBuffer = readFileSync('input.png');

// Get image information
const info = await getImageInfo(imageBuffer);
console.log(`Dimensions: ${info.width}×${info.height}`);

// Convert to WebP
const webpBuffer = await convertImageBuffer(imageBuffer);

// Convert and resize to specific dimensions
const resizedBuffer = await convertImageBuffer(imageBuffer, 800, 600);

// Convert and resize maintaining aspect ratio (width only)
const aspectBuffer = await convertImageBuffer(imageBuffer, 400);
```

### Browser Usage

```html
<script type="module">
import { convertImageBuffer, getImageInfo } from './node_modules/lightningimg/index.js';

async function handleFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);
  
  const info = await getImageInfo(buffer);
  console.log(`Original: ${info.format} ${info.width}×${info.height}`);
  
  // Convert and resize for web display (max 800px width)
  const webpBuffer = await convertImageBuffer(buffer, 800);
  
  // Create download link
  const blob = new Blob([webpBuffer], { type: 'image/webp' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'converted.webp';
  a.click();
}
</script>
```

## 📖 API Reference

### `convertImageBuffer(buffer, width?, height?)`

Convert an image buffer to WebP format with optional resizing.

- **buffer**: `Uint8Array` - Input image buffer
- **width**: `number` (optional) - Target width in pixels
- **height**: `number` (optional) - Target height in pixels
- **Returns**: `Promise<Uint8Array>` - Converted image buffer

**Resize behavior:**
- Both width and height: Resize to exact dimensions
- Width only: Resize maintaining aspect ratio
- Height only: Resize maintaining aspect ratio  
- Neither: Convert without resizing

### `getImageInfo(buffer)`

Get information about an image.

- **buffer**: `Uint8Array` - Input image buffer
- **Returns**: `Promise<Object>` - Image information with `width`, `height`, `format`, and `size`

### `isSupportedFormat(buffer)`

Check if an image format is supported.

- **buffer**: `Uint8Array` - Input image buffer
- **Returns**: `Promise<boolean>` - True if format is supported

## 🔧 Image Resizing

LightningImg supports high-quality image resizing using advanced algorithms:

### Resize Modes

```javascript
// Resize to exact dimensions (may change aspect ratio)
const exact = await convertImageBuffer(buffer, 800, 600);

// Resize by width only (maintains aspect ratio)
const byWidth = await convertImageBuffer(buffer, 800);

// Resize by height only (maintains aspect ratio)  
const byHeight = await convertImageBuffer(buffer, null, 600);
```

### Features

- **High-quality resampling**: Uses Lanczos3 filter for superior image quality
- **Aspect ratio preservation**: Automatically maintains proportions when one dimension is specified
- **Efficient processing**: Optimized algorithms for fast resizing
- **Memory efficient**: Direct buffer processing without intermediate copies

## 🛠️ Development

### Prerequisites

- **Node.js** >= 16
- **Rust** toolchain
- **wasm-pack** for WebAssembly builds
- **pnpm** package manager

### Building from Source

```bash
# Clone the repository
git clone https://github.com/kyr0/lightningimg.git
cd lightningimg

# Install dependencies  
pnpm install:deps

# Build WASM modules
pnpm run build:all

# Run tests
pnpm run test
```

### Project Structure

```
lightningimg/
├── lightningimg-wasm/      # WebAssembly implementation
│   ├── src/lib.rs         # Rust source code
│   ├── pkg/               # Generated WASM package (web)
│   └── pkg-node/          # Generated WASM package (Node.js)
├── index.js               # Main ESM entry point
├── index.d.ts             # TypeScript definitions
├── browser-example.html   # Browser demo
└── test-esm.js           # Test suite
```

### Scripts

- `pnpm run build` - Build WASM modules
- `pnpm run clean` - Clean build artifacts
- `pnpm run test` - Run test suite
- `pnpm run example` - Run example
- `pnpm run dev` - Development mode

## 🌟 Examples

### Node.js Image Processing

```javascript
import { convertImageBuffer, getImageInfo } from 'lightningimg';
import { readFileSync, writeFileSync } from 'fs';

async function processImage() {
  // Read image
  const input = readFileSync('./input.jpg');
  
  // Get info
  const info = await getImageInfo(input);
  console.log(`Processing ${info.format} image: ${info.width}×${info.height}`);
  
  // Convert to WebP
  const output = await convertImageBuffer(input);
  
  // Create thumbnail (300px width, maintaining aspect ratio)
  const thumbnail = await convertImageBuffer(input, 300);
  
  // Create specific size for web display
  const webDisplay = await convertImageBuffer(input, 1200, 800);
  
  // Save results
  writeFileSync('./output.webp', output);
  writeFileSync('./thumbnail.webp', thumbnail);
  writeFileSync('./web-display.webp', webDisplay);
  
  console.log(`Converted! Original: ${input.length} bytes`);
  console.log(`WebP: ${output.length} bytes, Thumbnail: ${thumbnail.length} bytes`);
}

processImage();
```

### Browser Drag & Drop

```html
<!DOCTYPE html>
<html>
<head>
    <title>Image Converter</title>
</head>
<body>
    <div id="drop-zone">Drop images here</div>
    <script type="module">
        import { convertImageBuffer } from './node_modules/lightningimg/index.js';
        
        const dropZone = document.getElementById('drop-zone');
        
        dropZone.ondragover = (e) => e.preventDefault();
        dropZone.ondrop = async (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (!file.type.startsWith('image/')) return;
            
            const buffer = new Uint8Array(await file.arrayBuffer());
            
            // Convert and resize for web-friendly dimensions
            const webpBuffer = await convertImageBuffer(buffer, 1024);
            
            // Download converted image
            const blob = new Blob([webpBuffer], { type: 'image/webp' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name.replace(/\.[^/.]+$/, '.webp');
            a.click();
        };
    </script>
</body>
</html>
```

## 🚀 Performance

LightningImg is optimized for speed:

- **Rust core**: Memory-safe with zero-cost abstractions
- **WebAssembly**: Near-native performance in browsers
- **Optimized builds**: Release builds with LTO and optimizations
- **Efficient memory**: Direct buffer processing without copies

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
