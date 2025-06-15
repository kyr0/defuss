import fastMathInit, { initThreadPool } from "defuss-fastmath";
import engineInit, { AudioEngine, Waveform } from "../pkg/audio-engine";
import signalForwarderProcessor from "./signal-forwarder?worker&url";
import { getStorageForCapacity } from "ringbuf.js";

console.log("SharedArrayBuffer support enabled?", self.crossOriginIsolated);

async function main() {
  let audioEngine: AudioEngine | null = null;

  const bufferSizeEl = document.getElementById(
    "bufferSize",
  ) as HTMLSelectElement;
  const parallelismEl = document.getElementById(
    "parallelism",
  ) as HTMLInputElement;
  const waveformEl = document.getElementById("waveform") as HTMLSelectElement;
  const playButton = document.getElementById("play") as HTMLButtonElement;
  const statsEl = document.getElementById("stats") as HTMLPreElement;

  // init wasm-bindgen
  await fastMathInit();
  await engineInit();

  console.log("hardwareConcurrency", navigator.hardwareConcurrency); // e.g. 8 hyperthreads

  // thread pool initialization with the given number of threads
  // e.g. 8 hyperthreads (cores) on a modern CPU
  await initThreadPool(navigator.hardwareConcurrency);

  playButton?.addEventListener("click", async () => {
    playButton.innerHTML = "⏹ Stop";
    statsEl.innerHTML = "-";

    // Initialize AudioContext and add AudioWorkletProcessor
    const audioContext = new AudioContext();

    try {
      // load the AudioWorklet processor
      await audioContext.audioWorklet.addModule(signalForwarderProcessor);

      console.log("AudioWorklet module loaded");
      const bufferSize = bufferSizeEl
        ? Number.parseInt(bufferSizeEl.value, 10)
        : 512;
      const channels = 2; // Stereo
      const sharedAudioBuffer = getStorageForCapacity(
        bufferSize *
          channels /** channels */ *
          12 /** safety margin for scheduling delay */,
        Float32Array,
      );
      const timeAvailableMs = (bufferSize / audioContext.sampleRate) * 1000;
      const parallelism = parallelismEl
        ? Number.parseInt(parallelismEl.value, 10)
        : 1;
      const waveform = waveformEl
        ? (Number.parseInt(waveformEl.value, 10) as Waveform)
        : Waveform.Triangle;

      if (audioEngine === null) {
        audioEngine = new AudioEngine(
          sharedAudioBuffer,
          bufferSize,
          audioContext.sampleRate,
          parallelism,
          waveform,
        );
        audioEngine.set_note(36); // C1
        audioEngine.set_amplitude(0.15); // 15%
        audioEngine.set_stats_callback(
          (stats: { signalChainTookMs: number }) => {
            if (statsEl) {
              statsEl.innerText = JSON.stringify(
                {
                  sharedArrayBuffer: self.crossOriginIsolated,
                  bufferSize,
                  audioWorklet: !!signalForwarderNode,
                  cpuCoresUsed: navigator.hardwareConcurrency,
                  channels,
                  osciallators: parallelism,
                  sampleRate: audioContext.sampleRate,
                  cpuUsagePercent:
                    100 * (stats.signalChainTookMs / timeAvailableMs),
                  timeAvailableMs,
                  ...stats,
                },
                null,
                2,
              );
            }
          },
        );
        audioEngine.start();
        console.log("AudioEngine started");
      } else {
        audioEngine.stop();
        audioEngine = null;
        playButton.innerHTML = "▶ Play";
        console.log("AudioEngine stopped");
      }

      // forwards a SharedArrayBuffer's audio signal via RingBuffer to the AudioContext.destination
      // this allows for a lock-free, wait-free, and zero-copy audio signal forwarding
      const signalForwarderNode = new AudioWorkletNode(
        audioContext,
        "signal-forwarder",
        {
          outputChannelCount: [channels],
          processorOptions: {
            sharedAudioBuffer,
          },
        },
      );

      // forward the signal to the AudioContext.destination (speakers)
      signalForwarderNode.connect(audioContext.destination);
    } catch (error) {
      console.error("Failed to load AudioWorklet module", error);
      return;
    }
  });

  const primarySlider: HTMLInputElement = document.getElementById(
    "freq",
  ) as HTMLInputElement;
  primarySlider.addEventListener("input", (event) => {
    const value = Number.parseFloat((event.target as HTMLInputElement).value);
    if (audioEngine) {
      audioEngine.set_note(value);
      console.log(`MIDI note set to: ${value}`);
    }
  });

  const amplitudeSlider: HTMLInputElement = document.getElementById(
    "amp",
  ) as HTMLInputElement;
  amplitudeSlider.addEventListener("input", (event) => {
    const value = Number.parseFloat((event.target as HTMLInputElement).value);
    if (audioEngine) {
      audioEngine.set_amplitude(value);
      console.log(`Amplitude set to ${value}`);
    }
  });

  waveformEl.addEventListener("change", (event) => {
    const value = Number.parseInt(
      (event.target as HTMLSelectElement).value,
      10,
    ) as Waveform;
    if (audioEngine) {
      audioEngine.set_waveform(value);
      console.log(`Waveform set to ${value}`);
    }
  });
}

main().catch(console.error);
