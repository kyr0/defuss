// Shared types, config, and math helpers
export type EventName = "ON" | "OFF" | "CHANGE_VOLUME" | "CHANGE_PITCH";

export interface NoteEvent {
  tMs: number; // ms since start (audio clock)
  pitchHz: number | null; // null for OFF
  volDbRms: number; // dBFS-ish
  chroma: number | null; // 0..11
  octave: number | null; // 0..7 (clamped output range)
  event: EventName;
}

export interface WorkletReading {
  tMs: number; // audio clock ms
  db: number; // frame RMS in dBFS-ish
  freq: number; // pitch estimate (Hz) or 0
  quality: number; // YIN quality = 1 - CMNDF_min
  nsdf: number; // NSDF peak at chosen tau ([-1..1], here ≥0 for voiced)
  snrDb: number; // ~10*log10(nsdf/(1-nsdf)), clipped
  effWinMs: number; // effective analysis window length for this frame
}

export interface Config {
  // Front-end filters
  hpHz: number; // high-pass cutoff (48 dB/oct total)
  lpHz: number; // low-pass cutoff (48 dB/oct total)

  // Analysis timing
  hopMs: number; // hop size
  analysisWinMs: number; // default window if adapt disabled

  // Adaptive window (period-based)
  adaptive: boolean;
  adaptPeriods: number;
  minWinMs: number;
  maxWinMs: number;

  // Pitch search band (post filtering)
  fMin: number;
  fMax: number;

  // Voicing gate (hysteresis)
  qualityOn: number;
  qualityOff: number;
  nsdfOn: number;
  nsdfOff: number;
  snrOnDb: number;
  snrOffDb: number;

  // Note/volume perception gates
  minEventSpacingMs: number;
  silenceDb: number;
  onDb: number;
  volumeDeltaDb: number;
  pitchChangeCents: number;
  holdBandCents: number;
  switchCents: number;

  // Stability timers
  onHoldMs: number;
  offHoldMs: number;
  switchHoldMs: number;

  // YIN/selection
  yinThreshold: number;
  octaveGuardEpsilon: number;

  // Pitch reference
  a4Hz: number;

  // NEW: octave glue (post-detector, pre-event)
  octaveGlueCents?: number; // how close to ±1200c counts as “octave slip”
  octaveGlueDbDelta?: number; // allow octave change only if |ΔdB| ≥ this
  octaveSwitchExtraHoldMs?: number; // extra hold before switching octave family
}

export const DEFAULTS: Config = {
  // Filters
  hpHz: 600,
  lpHz: 6000,

  // Timing
  hopMs: 20,
  analysisWinMs: 40,

  // Adaptive window
  adaptive: true,
  adaptPeriods: 8,
  minWinMs: 24,
  maxWinMs: 60,

  // Pitch search band
  fMin: 600,
  fMax: 6000,

  // Voicing hysteresis
  qualityOn: 0.65,
  qualityOff: 0.55,
  nsdfOn: 0.7,
  nsdfOff: 0.6,
  snrOnDb: 5,
  snrOffDb: 3,

  // Perceptual gates
  minEventSpacingMs: 20,
  silenceDb: -50,
  onDb: -45,
  volumeDeltaDb: 1.5,
  pitchChangeCents: 15,
  holdBandCents: 35,
  switchCents: 50,

  // Stability windows
  onHoldMs: 60,
  offHoldMs: 80,
  switchHoldMs: 60,

  // YIN
  yinThreshold: 0.1,
  octaveGuardEpsilon: 0.05,

  // Reference
  a4Hz: 440,

  // Octave glue defaults
  octaveGlueCents: 80,
  octaveGlueDbDelta: 8,
  octaveSwitchExtraHoldMs: 40,
};

// Helpers
export const freqToMidi = (f: number, a4 = 440) => 69 + 12 * Math.log2(f / a4);
export const midiToHz = (m: number, a4 = 440) => a4 * 2 ** ((m - 69) / 12);
export const centsDiff = (f1: number, f2: number) => 1200 * Math.log2(f1 / f2);

export const midiToChromaOct = (m: number) => {
  const n = Math.round(m);
  const chroma = ((n % 12) + 12) % 12;
  const midiOct = Math.floor(n / 12) - 1; // MIDI octave convention
  const octave = Math.min(7, Math.max(0, midiOct));
  return { chroma, octave };
};
