# defuss-vad

WASM-based Voice Activity Detection (VAD) for browsers and Node.js. Wraps the [ten-vad](https://github.com/TEN-framework/ten-vad) engine - a low-latency, lightweight, high-performance streaming voice activity detector.

## Install

```bash
bun add defuss-vad
```

## Usage

```ts
import { createVAD, parseWAV, toMono, resampleLinear } from "defuss-vad";

// Create a VAD instance (loads WASM automatically)
const vad = await createVAD({ hopSize: 256, threshold: 0.5 });

// Process 16kHz mono Int16 audio frames
const samples = new Int16Array(256); // your audio data in PCM
const result = vad.process(samples);

console.log(result.probability); // 0.0 - 1.0
console.log(result.isVoice);     // true / false

// Clean up
vad.destroy();
```

### Processing a WAV file

```ts
import { createVAD, parseWAV, toMono, resampleLinear } from "defuss-vad";

const response = await fetch("audio.wav");
const wav = parseWAV(await response.arrayBuffer());

// Ensure mono 16kHz input
let samples = toMono(wav.samples, wav.channels);
if (wav.sampleRate !== 16000) {
  samples = resampleLinear(samples, wav.sampleRate, 16000);
}

const vad = await createVAD();
const hopSize = 256;

for (let i = 0; i + hopSize <= samples.length; i += hopSize) {
  const frame = samples.slice(i, i + hopSize);
  const { probability, isVoice } = vad.process(frame);
  if (isVoice) console.log(`Voice at frame ${i / hopSize}: ${probability}`);
}

vad.destroy();
```

## API

### `createVAD(options?): Promise<VAD>`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `hopSize` | `number` | `256` | Samples per frame (256 = 16ms at 16kHz) |
| `threshold` | `number` | `0.5` | Detection threshold [0.0, 1.0] |
| `wasmBinary` | `ArrayBuffer` | - | Pre-loaded WASM binary (skips fetch) |
| `locateFile` | `(path, prefix) => string` | - | Custom WASM file resolver |

### `VAD`

| Method | Returns | Description |
|--------|---------|-------------|
| `process(samples)` | `VADResult` | Process one frame of Int16 audio |
| `getVersion()` | `string` | ten-vad library version |
| `destroy()` | `void` | Free WASM resources |

### `VADResult`

| Field | Type | Description |
|-------|------|-------------|
| `probability` | `number` | Voice probability [0.0, 1.0] |
| `isVoice` | `boolean` | Whether voice was detected |

### WAV Utilities

- `parseWAV(buffer: ArrayBuffer): WAVData` - Parse 16-bit PCM WAV files
- `toMono(samples: Int16Array, channels: number): Int16Array` - Extract first channel
- `resampleLinear(samples, fromRate, toRate): Int16Array` - Linear interpolation resampler

## Roadmap

- Run resampleLinear in AudioWorklet for real-time processing / e.g. via ringbuf

## Requirements

- Audio must be **16kHz, mono, 16-bit PCM** (use `resampleLinear` + `toMono` for conversion)
- Node.js >= 18 or any modern browser with WebAssembly support

## Credits

VAD engine by [TEN-framework/ten-vad](https://github.com/TEN-framework/ten-vad) (Apache 2.0 with additional conditions).

## License

MIT (this wrapper code). The vendored WASM binary is licensed under Apache 2.0 - see the [ten-vad LICENSE](https://github.com/TEN-framework/ten-vad/blob/main/LICENSE).
