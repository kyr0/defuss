# defuss-vad

Voice Activity Detection (VAD) backends for browsers and Node.js.

We currenltly offer three VAD engines with a shared high-level API:

- `firered-*`: FireRedVAD via ONNX Runtime Web plus bundled model assets (ONNX, ARK/CMVN) - **recommended for most users** with good performance and robustness across a wide range of tasks
- `tenvad-*`: TEN-VAD via vendored WASM
- `silero-*`: Silero VAD via ONNX Runtime Web plus bundled ONNX model

## Install

```bash
bun add defuss-vad
```
Available entrypoints:

- `defuss-vad/firered`
- `defuss-vad/firered-web`
- `defuss-vad/firered-node`
- `defuss-vad/firered-webgpu`
- `defuss-vad/tenvad`
- `defuss-vad/tenvad-web`
- `defuss-vad/tenvad-node`
- `defuss-vad/silero`
- `defuss-vad/silero-web`
- `defuss-vad/silero-node`
- `defuss-vad/types`
- `defuss-vad/wav`

### For Developers

For testing you might need to run `bunx playwright install chromium-headless-shell` to run the headless Chromium tests that cover all three VAD engines.

## Quick Start


### FireRedVAD

```ts
import {
  createVoiceDetector,
  FIRERED_AUDIO_REQUIREMENTS,
} from "defuss-vad/firered-web";

const detector = await createVoiceDetector();

// FireRed expects 10 ms / 160-sample frames at 16 kHz.
const frame = new Int16Array(FIRERED_AUDIO_REQUIREMENTS.hopSize);
const result = await detector.process(frame);

console.log(result.probability);
await detector.destroy();
```

FireRed browser entrypoints cache the bundled ONNX model and CMVN file in IndexedDB via `defuss-db`. Use `defuss-vad/firered-webgpu` to force the WebGPU execution provider in browsers that support it.

The bundled FireRed backend already uses a streaming ONNX export. It does not require callers to manage separate `cache_0..cache_7` tensors. This package feeds one CMVN-normalized 80-bin frame at a time as `feat` with a single flattened `caches_in` tensor, then carries `caches_out` forward internally across `process()` calls.

### TEN-VAD

```ts
import { createVoiceDetector } from "defuss-vad/tenvad";

const detector = await createVoiceDetector();

// Process 16kHz mono Int16 audio frames (256 samples each)
const result = await detector.process(samples);

console.log(result.isVoiceStable); // debounced voice state (recommended)
console.log(result.rms);           // frame energy 0..1
console.log(result.probability);   // raw VAD probability 0..1

if (result.onVoiceStart) console.log("speech started");
if (result.onVoiceEnd)   console.log("speech ended");

await detector.destroy();
```

### Silero VAD

```ts
import {
  createVoiceDetector,
  SILERO_AUDIO_REQUIREMENTS,
} from "defuss-vad/silero-web";

const detector = await createVoiceDetector({
  sampleRate: 16000,
});

const frame = new Int16Array(
  SILERO_AUDIO_REQUIREMENTS.frameSizes[16000],
);
const result = await detector.process(frame);

console.log(result.probability);
await detector.destroy();
```

Silero supports both `8000` Hz and `16000` Hz input. The required frame size depends on the configured sample rate:

- `8000` Hz: `256` samples per frame with `32` samples of carried context
- `16000` Hz: `512` samples per frame with `64` samples of carried context

Browser Silero entrypoints cache the bundled ONNX model in IndexedDB via `defuss-db`. Override `modelUrl`, `modelBytes`, `cache`, `cacheKey`, `cacheDbName`, or `wasmPaths` when you need custom asset delivery.

## Why `createVoiceDetector` over raw `createVAD`?

The raw WASM VAD triggers on any loud-ish sound - breaths, sibilants ("shh", "tss"), lip smacks, clicks. `createVoiceDetector` wraps it with three hardening layers:

| Guard | Default | Effect |
|-------|---------|--------|
| **Threshold** | 0.7 | VAD probability must exceed 70% (raw default would be 0.5) |
| **RMS floor** | 0.015 | Ignores "voice" when signal energy is too low (catches quiet breathing) |
| **Debounce ON** | 3 frames (48 ms) | Requires 3 consecutive voice frames before START - kills single-frame spikes |
| **Debounce OFF** | 3 frames (48 ms) | Requires 3 consecutive silence frames before END - prevents mouth flicker |

All defaults are exported as `VOICE_DETECTOR_DEFAULTS` for reference.

## Usage

### Processing a WAV file

```ts
import {
  createVoiceDetector,
  parseWAV,
  toMono,
  resampleLinear,
} from "defuss-vad/tenvad";

const response = await fetch("audio.wav");
const wav = parseWAV(await response.arrayBuffer());

// Ensure mono 16kHz input
let samples = toMono(wav.samples, wav.channels);
if (wav.sampleRate !== 16000) {
  samples = resampleLinear(samples, wav.sampleRate, 16000);
}

const detector = await createVoiceDetector();
const hopSize = 256;

for (let i = 0; i + hopSize <= samples.length; i += hopSize) {
  const frame = samples.slice(i, i + hopSize);
  const r = await detector.process(frame);
  if (r.onVoiceStart) console.log(`Voice started at ${i / 16000}s`);
  if (r.onVoiceEnd)   console.log(`Voice ended at ${i / 16000}s`);
}

await detector.destroy();
```

### Real-time microphone input (browser)

```ts
import { createVoiceDetector, resampleLinear } from "defuss-vad/tenvad-web";

const detector = await createVoiceDetector();
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const audioCtx = new AudioContext();
const source = audioCtx.createMediaStreamSource(stream);
const processor = audioCtx.createScriptProcessor(4096, 1, 1);
const hopSize = 256;
const ratio = audioCtx.sampleRate / 16000;
let residual = new Float32Array(0);
let processing = Promise.resolve();

processor.onaudioprocess = (event) => {
  const input = event.inputBuffer.getChannelData(0);
  const combined = new Float32Array(residual.length + input.length);
  combined.set(residual);
  combined.set(input, residual.length);

  let offset = 0;
  const samplesNeeded = Math.ceil(hopSize * ratio);

  while (offset + samplesNeeded <= combined.length) {
    const int16 = new Int16Array(hopSize);
    for (let i = 0; i < hopSize; i++) {
      const srcIdx = offset + i * ratio;
      const lo = Math.floor(srcIdx);
      const hi = Math.min(lo + 1, combined.length - 1);
      const frac = srcIdx - lo;
      const sample = combined[lo] * (1 - frac) + combined[hi] * frac;
      int16[i] = Math.max(-32768, Math.min(32767, Math.round(sample * 32768)));
    }
    offset += samplesNeeded;

    processing = processing.then(async () => {
      const r = await detector.process(int16);
      if (r.onVoiceStart) console.log("🟢 Voice START");
      if (r.onVoiceEnd)   console.log("🔴 Voice END");
    });
  }
  residual = combined.slice(offset);
};

source.connect(processor);
const mute = audioCtx.createGain();
mute.gain.value = 0;
processor.connect(mute);
mute.connect(audioCtx.destination);
```

### Custom tuning

```ts
const detector = await createVoiceDetector({
  threshold: 0.8,      // stricter probability gate
  rmsFloor: 0.02,      // higher energy floor
  debounceOn: 5,       // ~80 ms before voice start
  debounceOff: 5,      // ~80 ms before voice end
  hopSize: 256,        // frame size (passed to underlying VAD)
});
```

## API

### `createVoiceDetector(options?): Promise<VoiceDetector>`

The recommended high-level API. Wraps the selected backend with RMS gating and debounce.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `hopSize` | `number` | backend-specific | TEN-VAD: `256`, FireRedVAD: `160`, Silero: `512` @ `16000` Hz or `256` @ `8000` Hz |
| `sampleRate` | `8000 \| 16000` | `16000` | Silero only. Selects the required Silero frame and context size |
| `threshold` | `number` | `0.7` | VAD probability threshold [0.0, 1.0] |
| `rmsFloor` | `number` | `0.015` | Minimum RMS energy to count as voice |
| `debounceOn` | `number` | `3` | Consecutive voice frames before START |
| `debounceOff` | `number` | `3` | Consecutive silence frames before END |
| `wasmBinary` | `ArrayBuffer` | - | Pre-loaded WASM binary (skips fetch) |
| `locateFile` | `fn` | - | Custom WASM file resolver |
| `modelUrl` | `string` | backend bundled asset | Override the default FireRed or Silero ONNX model URL |
| `cmvnUrl` | `string` | FireRed bundled asset | Override the default FireRed CMVN URL |
| `modelBytes` | `ArrayBuffer \| Uint8Array` | - | Provide FireRed or Silero model bytes directly |
| `cmvnBytes` | `ArrayBuffer \| Uint8Array` | - | Provide FireRed CMVN bytes directly |
| `cache` | `boolean` | `true` | Enable FireRed or Silero browser IndexedDB caching |
| `cacheKey` | `string` | derived | Override the FireRed or Silero browser cache key prefix |
| `cacheDbName` | `string` | `defuss-vad-cache` | Override the FireRed browser cache database name |
| `wasmPaths` | `string \| Record<string, string>` | - | Override ONNX Runtime WASM asset resolution |

### `VoiceDetector`

| Method | Returns | Description |
|--------|---------|-------------|
| `process(samples)` | `Promise<VoiceDetectorResult>` | Process one Int16 frame |
| `getVersion()` | `Promise<string>` | ten-vad library version |
| `reset()` | `Promise<void>` | Clear debounce state (e.g. new stream) |
| `destroy()` | `Promise<void>` | Free WASM resources |

### `VoiceDetectorResult`

| Field | Type | Description |
|-------|------|-------------|
| `probability` | `number` | Raw VAD probability [0.0, 1.0] |
| `isVoice` | `boolean` | Raw VAD flag (before gating/debounce) |
| `rms` | `number` | Frame RMS energy [0.0, 1.0] |
| `isVoiceStable` | `boolean` | Debounced voice state (use this!) |
| `onVoiceStart` | `boolean` | Transition: silence => voice |
| `onVoiceEnd` | `boolean` | Transition: voice => silence |

### Low-level: `createVAD(options?): Promise<VAD>`

Direct backend wrapper without gating or debounce. Use when you need raw probability values or custom post-processing.

| Method | Returns | Description |
|--------|---------|-------------|
| `process(samples)` | `Promise<VADResult>` | Process one frame of Int16 audio |
| `getVersion()` | `Promise<string>` | ten-vad library version |
| `destroy()` | `Promise<void>` | Free WASM resources |

### Utilities

| Function | Description |
|----------|-------------|
| `computeRMS(samples: Int16Array): number` | Compute RMS energy (0..1) for a frame |
| `parseWAV(buffer: ArrayBuffer): WAVData` | Parse 16-bit PCM WAV files |
| `toMono(samples, channels): Int16Array` | Extract first channel |
| `resampleLinear(samples, from, to): Int16Array` | Linear interpolation resampler |
| `VOICE_DETECTOR_DEFAULTS` | Exported default tuning constants |

## Roadmap

- Run resampleLinear in AudioWorklet for real-time processing / e.g. via ringbuf

## Requirements

- Audio must be **mono, 16-bit PCM** at the backend's required sample rate (use `resampleLinear` + `toMono` for conversion)
- TEN-VAD uses `256`-sample frames (16 ms)
- FireRedVAD uses `160`-sample frames (10 ms)
- SileroVAD uses `256`-sample frames at `8000` Hz and `512`-sample frames at `16000` Hz
- Node.js >= 18 or any modern browser with WebAssembly support

## Credits

VAD engines by [TEN-framework/ten-vad](https://github.com/TEN-framework/ten-vad), [FireRedTeam/FireRedVAD](https://github.com/FireRedTeam/FireRedVAD), and [snakers4/silero-vad](https://github.com/snakers4/silero-vad).

Extra credits to [eschmidbauer/fireredvad.com](https://github.com/eschmidbauer/fireredvad.com) for providing another reference implementation. His work came after this implementation, but served as a great sanity check.

## License

MIT (this wrapper code). The vendored TEN-VAD WASM binary is licensed under Apache 2.0, and the bundled Silero ONNX model is MIT licensed.
