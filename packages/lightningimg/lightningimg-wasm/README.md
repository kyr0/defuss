# LightningImg WASM 🚀

WebAssembly version of LightningImg for use in browsers and Node.js environments where native bindings are not supported (e.g., CodeSandbox, StackBlitz, WebContainers).

## Features

- 🌐 **Universal**: Works in both browser and Node.js environments
- 🔥 **Fast**: Compiled Rust to WebAssembly for near-native performance
- 📦 **Buffer-based API**: Direct memory operations for maximum efficiency
- 🎯 **Same API**: Compatible interface with the native Node.js version
- 💼 **Fallback Ready**: Perfect for containerized environments

## Installation

```bash
npm install lightningimg-wasm
# or
pnpm add lightningimg-wasm
```

## Usage

### Browser Environment

```javascript
import { convertImageBuffer, convertFile } from 'lightningimg-wasm';

// Convert from File input
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const webpBuffer = await convertFile(file);
  
  // Create download link
  const blob = new Blob([webpBuffer], { type: 'image/webp' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'converted.webp';
  a.click();
});

// Or from ArrayBuffer
const response = await fetch('image.jpg');
const buffer = new Uint8Array(await response.arrayBuffer());
const webpBuffer = await convertImageBuffer(buffer);
```

### Node.js Environment

```javascript
import { processDirectory, convertImageBuffer } from 'lightningimg-wasm';
import { readFileSync } from 'fs';

// Directory processing (same API as native version)
await processDirectory('./input', './output');

// Buffer conversion
const inputBuffer = readFileSync('image.jpg');
const webpBuffer = await convertImageBuffer(inputBuffer);
```

### With Quality Control

```javascript
import { convertImageBufferWithQuality } from 'lightningimg-wasm';

const buffer = new Uint8Array(/* your image data */);
const webpBuffer = await convertImageBufferWithQuality(buffer, 85); // 85% quality
```

## API Reference

### Buffer Operations

- `convertImageBuffer(buffer: Uint8Array): Promise<Uint8Array>` - Convert image buffer to WebP
- `convertImageBufferWithQuality(buffer: Uint8Array, quality: number): Promise<Uint8Array>` - Convert with quality control (0-100)
- `isSupportedFormat(buffer: Uint8Array): Promise<boolean>` - Check if format is supported
- `getImageInfo(buffer: Uint8Array): Promise<{format: string, width: number, height: number}>` - Get image metadata

### File Operations (Node.js only)

- `processDirectory(inputDir: string, outputDir?: string): Promise<void>` - Process directory recursively
- `processDirectoryDestructive(inputDir: string, keepOriginalNames?: boolean): Promise<void>` - Process in-place

### Browser-specific

- `convertFile(file: File): Promise<Uint8Array>` - Convert File object to WebP

## Supported Formats

Input: PNG, JPEG, TIFF, GIF, BMP  
Output: WebP

## Performance

While WASM is slightly slower than native bindings, it provides:
- Near-native performance in modern browsers
- Universal compatibility across all platforms
- No native dependencies to install
- Works in sandboxed environments

## Building from Source

```bash
# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Build for different targets
pnpm run build        # bundler target
pnpm run build:nodejs # Node.js target  
pnpm run build:web    # web target
pnpm run build:all    # all targets

# Test
pnpm run test
```

## Use Cases

Perfect for:
- CodeSandbox and StackBlitz projects
- WebContainer-based environments
- Browser-based image processing
- Serverless functions with limited native support
- Cross-platform applications
- Development environments where native compilation is problematic

## License

MIT License - see [LICENSE](../LICENSE) for details.
