// test-app.ts
import { createWhistleRecorder } from "./whistle-recorder.js";
import {
  createTestSource,
  type TestMode,
  type TestSynthOptions,
} from "./test-synth.js";

const mode: TestMode = "mixed"; // 'sweep' | 'steps' | 'mixed'

const opts: TestSynthOptions = {
  baseGainDb: -20,
  noiseGainDb: -46,
  vibratoCents: 5,
  vibratoRateHz: 5.8,
  tremoloDepthDb: 1.5,
  tremoloRateHz: 4.2,

  onsetDetuneCents: 25,
  onsetSettlingMs: 120,
  onsetAmpRiseMs: 10,
  onsetAmpFallMs: 25,

  // sweep defaults are fine
  sweepStartHz: 1000,
  sweepEndHz: 2800,
  sweepDurationMs: 2500,
  sweepPingPong: true,

  // steps defaults cover a major-ish pattern around 1200 Hz
  rootHz: 1200,
  scaleSemitones: [0, 2, 4, 7, 9, 12, 9, 7, 4, 2],
  stepDurationMs: 460,
  restMs: 60,

  // mixed per-step micro-behavior
  microSweepCents: 30,
  microSweepDurationMs: 160,

  loop: true,
  seed: 1337,
};

const sourceProvider = createTestSource(mode, opts);

const rec = createWhistleRecorder(
  {
    // keep same perceptual & YIN settings
    hpHz: 600,
    lpHz: 6000,
    fMin: 600,
    fMax: 6000,
    hopMs: 20,
    analysisWinMs: 40,
    adaptive: true,
    adaptPeriods: 8,
    minWinMs: 24,
    maxWinMs: 60,
    qualityOn: 0.65,
    qualityOff: 0.55,
    nsdfOn: 0.7,
    nsdfOff: 0.6,
    snrOnDb: 5,
    snrOffDb: 3,
    minEventSpacingMs: 20,
    onDb: -45,
    silenceDb: -50,
    volumeDeltaDb: 1.5,
    pitchChangeCents: 15,
    holdBandCents: 35,
    switchCents: 50,
    onHoldMs: 60,
    offHoldMs: 80,
    switchHoldMs: 60,
    yinThreshold: 0.1,
    octaveGuardEpsilon: 0.05,
    a4Hz: 440,
  },
  sourceProvider,
);

// Simple dev UI
const startBtn = document.getElementById("start") as HTMLButtonElement | null;
const stopBtn = document.getElementById("stop") as HTMLButtonElement | null;
const dumpBtn = document.getElementById("dump") as HTMLButtonElement | null;
const pre = document.getElementById("log") as HTMLPreElement | null;

const updatePre = () => {
  if (!pre) return;
  pre.textContent = JSON.stringify(rec.getLog(), null, 2);
};

startBtn?.addEventListener("click", async () => {
  await rec.start();
});
stopBtn?.addEventListener("click", async () => {
  await rec.stop();
});
dumpBtn?.addEventListener("click", () => {
  updatePre();
});

// Auto-start if no UI:
if (!startBtn) rec.start();
