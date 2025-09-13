// test-synth.ts
// Deterministic synthetic source for regression testing.
// Modes: 'sweep', 'steps', 'mixed' (per-step micro-sweep + onset instability)

export type TestMode = "sweep" | "steps" | "mixed";

export type TestSynthOptions = {
  // Levels
  baseGainDb?: number; // output level
  noiseGainDb?: number; // breath noise bed; -inf disables

  // FM/AM
  vibratoCents?: number; // depth in cents
  vibratoRateHz?: number; // vibrato LFO rate
  tremoloDepthDb?: number; // AM depth in dB (peak-to-peak)
  tremoloRateHz?: number; // AM LFO rate

  // Onset instability
  onsetDetuneCents?: number; // starting detune at each onset (+/-)
  onsetSettlingMs?: number; // settle time to target frequency
  onsetAmpRiseMs?: number; // attack time for amplitude
  onsetAmpFallMs?: number; // release time when stepping/resting

  // Sweep mode
  sweepStartHz?: number;
  sweepEndHz?: number;
  sweepDurationMs?: number;
  sweepPingPong?: boolean;

  // Steps mode
  stepsHz?: number[]; // explicit freqs; overrides root/scale
  rootHz?: number; // used if stepsHz not given
  scaleSemitones?: number[]; // relative intervals
  stepDurationMs?: number;
  restMs?: number;

  // Mixed per-step micro-sweep
  microSweepCents?: number; // ± cents around the step
  microSweepDurationMs?: number;

  // Global
  loop?: boolean;
  seed?: number; // RNG seed for reproducibility
};

type SourceHandle = {
  node: AudioNode;
  cleanup: () => void;
};

const dbToLin = (db: number) => 10 ** (db / 20);
const centsToRatio = (c: number) => 2 ** (c / 1200);

const lcg = (seed: number) => {
  let s = seed >>> 0 || 1;
  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff;
};

const defaultOpts: Required<
  Pick<
    TestSynthOptions,
    | "baseGainDb"
    | "noiseGainDb"
    | "vibratoCents"
    | "vibratoRateHz"
    | "tremoloDepthDb"
    | "tremoloRateHz"
    | "onsetDetuneCents"
    | "onsetSettlingMs"
    | "onsetAmpRiseMs"
    | "onsetAmpFallMs"
    | "sweepStartHz"
    | "sweepEndHz"
    | "sweepDurationMs"
    | "sweepPingPong"
    | "rootHz"
    | "scaleSemitones"
    | "stepDurationMs"
    | "restMs"
    | "microSweepCents"
    | "microSweepDurationMs"
    | "loop"
    | "seed"
  >
> = {
  baseGainDb: -24,
  noiseGainDb: -48,
  vibratoCents: 7,
  vibratoRateHz: 5.5,
  tremoloDepthDb: 2,
  tremoloRateHz: 4,
  onsetDetuneCents: 30,
  onsetSettlingMs: 120,
  onsetAmpRiseMs: 10,
  onsetAmpFallMs: 20,
  sweepStartHz: 900,
  sweepEndHz: 3000,
  sweepDurationMs: 3000,
  sweepPingPong: true,
  rootHz: 1200,
  scaleSemitones: [0, 2, 4, 7, 9, 12, 9, 7, 4, 2],
  stepDurationMs: 500,
  restMs: 80,
  microSweepCents: 35,
  microSweepDurationMs: 180,
  loop: true,
  seed: 1,
};

// White noise buffer (looped)
const makeNoise = (ac: AudioContext, seconds = 2) => {
  const len = Math.max(1, Math.floor(seconds * ac.sampleRate));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
};

const scheduleGainADSR = (
  g: AudioParam,
  t0: number,
  riseMs: number,
  fallMs: number,
  level: number,
) => {
  const rise = riseMs / 1000;
  const fall = fallMs / 1000;
  g.cancelScheduledValues(t0);
  g.setValueAtTime(0, t0);
  g.linearRampToValueAtTime(level, t0 + rise);
  // call-site schedules the fall back to 0
  return { tAttackEnd: t0 + rise, tReleaseDur: fall };
};

const setupTremolo = (
  ac: AudioContext,
  targetGainParam: AudioParam,
  depthDb: number,
  rateHz: number,
) => {
  if (depthDb <= 0) return null;
  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  lfo.frequency.value = rateHz;

  // Convert dB depth into linear modulation around 1.0
  const depthLin = dbToLin(depthDb) - 1; // peak deviation around 1
  lfoGain.gain.value = depthLin;
  lfo.connect(lfoGain);

  // We need (1 + m*sin) * base, so we modulate via a gain node multiplier:
  // Here we route LFO -> a GainNode controlling targetGainParam via setValueAtTime+automation
  // Simpler: connect LFO to AudioWorklet? Not needed. We'll use GainNode on an intermediate stage instead.
  // Implementation detail: the caller inserts this tremolo in signal chain, not directly on AudioParam.
  return { lfo, lfoGain, depthLin };
};

const attachTremolo = (
  ac: AudioContext,
  audio: AudioNode,
  depthDb: number,
  rateHz: number,
) => {
  if (depthDb <= 0) return { out: audio, cleanup: () => {} };
  // Strategy: audio -> tremGain; LFO -> tremGain.gain
  const tremGain = ac.createGain();
  tremGain.gain.value = 1.0;
  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  lfo.frequency.value = rateHz;
  // map LFO [-1..1] into [1-depth/2 .. 1+depth/2] ≈ depth in linear
  const depthLin = dbToLin(depthDb) - 1;
  lfoGain.gain.value = depthLin;
  lfo.connect(lfoGain).connect(tremGain.gain);
  audio.connect(tremGain);
  lfo.start();
  return {
    out: tremGain,
    cleanup: () => {
      try {
        lfo.stop();
      } catch {}
      lfo.disconnect();
      lfoGain.disconnect();
    },
  };
};

const attachVibrato = (
  ac: AudioContext,
  osc: OscillatorNode,
  cents: number,
  rateHz: number,
) => {
  if (cents <= 0) return { cleanup: () => {} };
  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  // Convert cents depth to Hz deviation at nominal freq? We’ll couple to frequency AudioParam using a ConstantSource scale.
  // For small cents, Δf ≈ f * (2^(c/1200)-1). We'll update automation per segment to correct nominal f.
  lfo.frequency.value = rateHz;
  lfo.start();
  return {
    lfo,
    lfoGain,
    cents,
    applyAt: (nominalHz: number) => {
      const ratio = centsToRatio(cents) - 1;
      lfoGain.gain.setValueAtTime(nominalHz * ratio, ac.currentTime);
      lfo.connect(lfoGain).connect(osc.frequency);
    },
    cleanup: () => {
      try {
        lfo.stop();
      } catch {}
      lfo.disconnect();
      lfoGain.disconnect();
    },
  };
};

// --- Public factory: create synthetic source ---
export const createTestSource =
  (mode: TestMode, opts?: TestSynthOptions) =>
  async (
    ac: AudioContext,
  ): Promise<{ node: AudioNode; cleanup: () => void }> => {
    const O = { ...defaultOpts, ...(opts ?? {}) };
    const rnd = lcg(O.seed);

    // Core tone path: Oscillator -> (vibrato) -> Gain -> (tremolo) -> out
    const osc = ac.createOscillator();
    osc.type = "sine";
    const gain = ac.createGain();
    gain.gain.value = dbToLin(O.baseGainDb);

    // Optional vibrato
    const vib = attachVibrato(ac, osc, O.vibratoCents, O.vibratoRateHz);

    // Optional tremolo
    const { out: tremOut, cleanup: tremCleanup } = attachTremolo(
      ac,
      gain,
      O.tremoloDepthDb,
      O.tremoloRateHz,
    );

    // Optional noise bed
    let noise: AudioBufferSourceNode | null = null;
    let noiseGain: GainNode | null = null;
    if (O.noiseGainDb > -120) {
      noise = makeNoise(ac);
      noiseGain = ac.createGain();
      noiseGain.gain.value = dbToLin(O.noiseGainDb);
      noise.connect(noiseGain).connect(tremOut);
      noise.start();
    }

    // Route tone
    osc.connect(gain).connect(tremOut);

    // Master node to return (so caller can insert filters, etc.)
    const master = ac.createGain();
    tremOut.connect(master);

    // --- Schedulers for each mode ---
    const now = ac.currentTime;
    const cancelTimers: number[] = [];

    const scheduleSweep = () => {
      const startHz = O.sweepStartHz;
      const endHz = O.sweepEndHz;
      const dur = O.sweepDurationMs / 1000;
      const pingpong = O.sweepPingPong;

      const scheduleOne = (t0: number, a: number, b: number) => {
        osc.frequency.cancelScheduledValues(t0);
        osc.frequency.setValueAtTime(a, t0);
        osc.frequency.linearRampToValueAtTime(b, t0 + dur);
        vib.applyAt?.(a);
        // “Human” onset: detune at the very start and settle
        const detuneRatio = centsToRatio((rnd() * 2 - 1) * O.onsetDetuneCents);
        const startDetuned = a * detuneRatio;
        osc.frequency.setValueAtTime(startDetuned, t0);
        osc.frequency.linearRampToValueAtTime(a, t0 + O.onsetSettlingMs / 1000);
      };

      let t = now + 0.05;
      const loopOnce = () => {
        scheduleOne(t, startHz, endHz);
        t += dur;
        if (pingpong) {
          scheduleOne(t, endHz, startHz);
          t += dur;
        }
      };

      loopOnce();
      if (O.loop) {
        const loopLen = pingpong ? 2 * dur : dur;
        const id = window.setInterval(loopOnce, loopLen * 1000);
        cancelTimers.push(id);
      }
    };

    const scheduleSteps = () => {
      const seqHz =
        O.stepsHz ??
        O.scaleSemitones.map((semi) => O.rootHz * 2 ** (semi / 12));
      const step = O.stepDurationMs / 1000;
      const rest = O.restMs / 1000;
      let t = now + 0.05;

      const scheduleOne = (fTarget: number) => {
        // Onset detune & settle
        const sign = rnd() < 0.5 ? -1 : 1;
        const startDetune = centsToRatio(sign * O.onsetDetuneCents);
        const fStart = fTarget * startDetune;

        osc.frequency.cancelScheduledValues(t);
        osc.frequency.setValueAtTime(fStart, t);
        osc.frequency.linearRampToValueAtTime(
          fTarget,
          t + O.onsetSettlingMs / 1000,
        );
        vib.applyAt?.(fTarget);

        // AM envelope (attack/release)
        const { tAttackEnd } = scheduleGainADSR(
          gain.gain,
          t,
          O.onsetAmpRiseMs,
          O.onsetAmpFallMs,
          dbToLin(O.baseGainDb),
        );
        // Schedule release at end of step
        gain.gain.setTargetAtTime(0, t + step, O.onsetAmpFallMs / 1000 / 3);

        t += step + rest;
      };

      const loopOnce = () => {
        for (const f of seqHz) scheduleOne(f);
      };

      loopOnce();
      if (O.loop) {
        const loopLen = (step + rest) * seqHz.length;
        const id = window.setInterval(loopOnce, loopLen * 1000);
        cancelTimers.push(id);
      }
    };

    const scheduleMixed = () => {
      // Like steps, but each step performs a micro-sweep around the target (±microSweepCents)
      const seqHz =
        O.stepsHz ??
        O.scaleSemitones.map((semi) => O.rootHz * 2 ** (semi / 12));
      const step = O.stepDurationMs / 1000;
      const rest = O.restMs / 1000;
      const microDur = O.microSweepDurationMs / 1000;
      const microRatio = centsToRatio(O.microSweepCents);
      let t = now + 0.05;

      const scheduleOne = (fCenter: number) => {
        // Onset detune and settle to pre-sweep start
        const sign = rnd() < 0.5 ? -1 : 1;
        const startDetune = centsToRatio(sign * O.onsetDetuneCents);
        const fStart = fCenter * startDetune;

        const fLo = fCenter / microRatio;
        const fHi = fCenter * microRatio;

        osc.frequency.cancelScheduledValues(t);
        osc.frequency.setValueAtTime(fStart, t);
        osc.frequency.linearRampToValueAtTime(
          fCenter,
          t + O.onsetSettlingMs / 1000,
        );
        vib.applyAt?.(fCenter);

        scheduleGainADSR(
          gain.gain,
          t,
          O.onsetAmpRiseMs,
          O.onsetAmpFallMs,
          dbToLin(O.baseGainDb),
        );

        // Now micro sweep inside the step window
        const t1 = t + O.onsetSettlingMs / 1000;
        osc.frequency.setValueAtTime(fCenter, t1);
        osc.frequency.linearRampToValueAtTime(fHi, t1 + microDur / 2);
        osc.frequency.linearRampToValueAtTime(fLo, t1 + microDur);
        osc.frequency.linearRampToValueAtTime(fCenter, t1 + microDur * 1.5);

        // Release at end
        gain.gain.setTargetAtTime(0, t + step, O.onsetAmpFallMs / 1000 / 3);

        t += step + rest;
      };

      const loopOnce = () => {
        for (const f of seqHz) scheduleOne(f);
      };
      loopOnce();
      if (O.loop) {
        const loopLen = (step + rest) * seqHz.length;
        const id = window.setInterval(loopOnce, loopLen * 1000);
        cancelTimers.push(id);
      }
    };

    // Start nodes and schedule pattern
    osc.start();
    if (mode === "sweep") scheduleSweep();
    else if (mode === "steps") scheduleSteps();
    else scheduleMixed();

    const cleanup = () => {
      cancelTimers.forEach((id) => clearInterval(id));
      try {
        osc.stop();
      } catch {}
      tremCleanup();
      vib.cleanup?.();
      if (noise) {
        try {
          noise.stop();
        } catch {}
      }
      // Disconnect
      try {
        osc.disconnect();
      } catch {}
      try {
        gain.disconnect();
      } catch {}
      try {
        tremOut.disconnect();
      } catch {}
      try {
        master.disconnect();
      } catch {}
      if (noise && noiseGain) {
        try {
          noise.disconnect();
          noiseGain.disconnect();
        } catch {}
      }
    };

    return { node: master, cleanup };
  };
