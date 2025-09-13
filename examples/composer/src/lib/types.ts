// Shared types, config, and math helpers
export type EventName = "ON" | "OFF" | "CHANGE_VOLUME" | "CHANGE_PITCH";

export interface NoteEvent {
  tMs: number; // ms since start
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
  hopMs: number; // hop size (default 20 ms)
  analysisWinMs: number; // default window if adapt disabled

  // Adaptive window (period-based)
  adaptive: boolean; // enable adaptive window
  adaptPeriods: number; // target # of periods in window (6..12 good)
  minWinMs: number; // lower clamp for window
  maxWinMs: number; // upper clamp for window

  // Pitch search band (post filtering)
  fMin: number; // YIN tauMax = sr/fMin (>= hpHz a bit)
  fMax: number; // YIN tauMin = sr/fMax (<= lpHz)

  // Voicing gate (hysteresis)
  qualityOn: number; // require >= to become voiced
  qualityOff: number; // drop below to become unvoiced
  nsdfOn: number;
  nsdfOff: number;
  snrOnDb: number;
  snrOffDb: number;

  // Note/volume perception gates
  minEventSpacingMs: number; // 20 ms
  silenceDb: number; // OFF below this (sustained)
  onDb: number; // ON threshold (sustained)
  volumeDeltaDb: number; // CHANGE_VOLUME gate
  pitchChangeCents: number; // drift gate within a note
  holdBandCents: number; // hold same note if within band
  switchCents: number; // consider switch if beyond band

  // Stability timers
  onHoldMs: number; // require this above onDb to fire ON
  offHoldMs: number; // require this below silenceDb OR unvoiced to fire OFF
  switchHoldMs: number; // require this beyond switchCents to switch note

  // YIN/selection
  yinThreshold: number; // CMNDF threshold for first dip
  octaveGuardEpsilon: number; // tolerance for τ/2,2τ competition

  // Pitch reference
  a4Hz: number;

  /** If the incoming pitch is within this many cents of an exact octave of the current note,
   *  bias against switching octave unless extra conditions are also met. */
  octaveGlueCents: number; // e.g. 80

  /** Require at least this much dB change (|ΔdB|) to allow a fast octave jump. */
  octaveGlueDbDelta: number; // e.g. 8

  /** Add this extra dwell time before allowing an octave switch. */
  octaveSwitchExtraHoldMs: number; // e.g. 50

  /** If the instantaneous slope (|v| in semitones/s) exceeds this in cents/s,
   *  allow note switching with half the usual dwell. */
  fastSlopeCentsPerSec: number; // e.g. 900

  /** Minimum time between note identity changes (ms). Applies to ON→new note
   *  and note-to-note switches. Prevents chatter when playing fast. */
  minNoteSwitchMs: number; // e.g. 150
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

  yinThreshold: 0.1,
  octaveGuardEpsilon: 0.05,

  // Reference tuning
  a4Hz: 440,

  // Octave glue
  octaveGlueCents: 80,
  octaveGlueDbDelta: 8,
  octaveSwitchExtraHoldMs: 50,

  // Fast slope shortcut
  fastSlopeCentsPerSec: 900,

  // Minimum time between note identity changes
  minNoteSwitchMs: 150,
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
