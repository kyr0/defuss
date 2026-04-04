# defuss-vad

WASM-based Voice Activity Detection (VAD) for browsers and Node.js. Wraps the [ten-vad](https://github.com/TEN-framework/ten-vad) engine - a low-latency, lightweight, high-performance streaming voice activity detector.

## Install

```bash
bun add defuss-vad
```

## Quick Start

```ts
import { createVoiceDetector } from "defuss-vad";

const detector = await createVoiceDetector();

// Process 16kHz mono Int16 audio frames (256 samples each)
const result = detector.process(samples);

console.log(result.isVoiceStable); // debounced voice state (recommended)
console.log(result.rms);           // frame energy 0..1
console.log(result.probability);   // raw VAD probability 0..1

if (result.onVoiceStart) console.log("speech started");
if (result.onVoiceEnd)   console.log("speech ended");

detector.destroy();
```

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
import { createVoiceDetector, parseWAV, toMono, resampleLinear } from "defuss-vad";

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
  const r = detector.process(frame);
  if (r.onVoiceStart) console.log(`Voice started at ${i / 16000}s`);
  if (r.onVoiceEnd)   console.log(`Voice ended at ${i / 16000}s`);
}

detector.destroy();
```

### Real-time microphone input (browser)

```ts
import { createVoiceDetector, resampleLinear } from "defuss-vad";

const detector = await createVoiceDetector();
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const audioCtx = new AudioContext();
const source = audioCtx.createMediaStreamSource(stream);
const processor = audioCtx.createScriptProcessor(4096, 1, 1);
const hopSize = 256;
const ratio = audioCtx.sampleRate / 16000;
let residual = new Float32Array(0);

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

    const r = detector.process(int16);
    if (r.onVoiceStart) console.log("🟢 Voice START");
    if (r.onVoiceEnd)   console.log("🔴 Voice END");
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
  threshold: 0.8,     // stricter probability gate
  rmsFloor: 0.02,     // higher energy floor
  debounceOn: 5,       // ~80 ms before voice start
  debounceOff: 5,      // ~80 ms before voice end
  hopSize: 256,        // frame size (passed to underlying VAD)
});
```

## API

### `createVoiceDetector(options?): Promise<VoiceDetector>`

The recommended high-level API. Wraps the WASM VAD with RMS gating and debounce.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `hopSize` | `number` | `256` | Samples per frame (256 = 16 ms at 16 kHz) |
| `threshold` | `number` | `0.7` | VAD probability threshold [0.0, 1.0] |
| `rmsFloor` | `number` | `0.015` | Minimum RMS energy to count as voice |
| `debounceOn` | `number` | `3` | Consecutive voice frames before START |
| `debounceOff` | `number` | `3` | Consecutive silence frames before END |
| `wasmBinary` | `ArrayBuffer` | - | Pre-loaded WASM binary (skips fetch) |
| `locateFile` | `fn` | - | Custom WASM file resolver |

### `VoiceDetector`

| Method | Returns | Description |
|--------|---------|-------------|
| `process(samples)` | `VoiceDetectorResult` | Process one Int16 frame |
| `getVersion()` | `string` | ten-vad library version |
| `reset()` | `void` | Clear debounce state (e.g. new stream) |
| `destroy()` | `void` | Free WASM resources |

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

Direct WASM wrapper without gating or debounce. Use when you need raw probability values or custom post-processing.

| Method | Returns | Description |
|--------|---------|-------------|
| `process(samples)` | `VADResult` | Process one frame of Int16 audio |
| `getVersion()` | `string` | ten-vad library version |
| `destroy()` | `void` | Free WASM resources |

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

- Audio must be **16 kHz, mono, 16-bit PCM** (use `resampleLinear` + `toMono` for conversion)
- Node.js >= 18 or any modern browser with WebAssembly support

## Credits

VAD engine by [TEN-framework/ten-vad](https://github.com/TEN-framework/ten-vad) (Apache 2.0 with additional conditions).

## License

MIT (this wrapper code). The vendored WASM binary is licensed under Apache 2.0 - see the [ten-vad LICENSE](https://github.com/TEN-framework/ten-vad/blob/main/LICENSE).
