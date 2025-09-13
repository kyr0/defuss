import type { Config, NoteEvent, WorkletReading } from "./types.js";
import {
  DEFAULTS,
  freqToMidi,
  midiToHz,
  midiToChromaOct,
  centsDiff,
} from "./types.js";

import pitchProcessorUrl from "./pitch-worklet.ts?url";

type SourceProvider = (
  ac: AudioContext,
) => Promise<{ node: AudioNode; cleanup?: () => void }>;

type Graph = {
  ac: AudioContext;
  srcNode: AudioNode;
  filters: BiquadFilterNode[];
  worklet: AudioWorkletNode;
  mute: GainNode;
  stop: () => Promise<void>;
};

type State = {
  cfg: Config;
  startTimeMs: number;
  lastEventTimeMs: number;

  noteOn: boolean;
  isVoiced: boolean;
  currentNoteMidi: number;
  currentPitchHz: number;
  lastDb: number;
  lastVolEventDb: number;

  candidateSwitchStartMs: number;
  belowSilenceSinceMs: number;
  aboveOnSinceMs: number;
  unvoicedSinceMs: number;

  events: NoteEvent[];

  lastNoteSwitchAtMs: number;

  // --- Pitch smoothing (MIDI space) state ---
  // Median-of-3 ring buffer on raw MIDI
  mRing: number[]; // latest at end
  // Alpha-Beta filter state
  xMidi: number; // smoothed MIDI position
  vStPerSec: number; // velocity in semitones per second
};

const nowMs = () => performance.now();
const dbg = (...args: any[]) => console.log("[whistle]", ...args);

/** EXACT loader shape you asked for */
async function createWorkletNode(
  context: BaseAudioContext,
  name: string,
  url: string,
) {
  // ensure audioWorklet has been loaded
  try {
    return new AudioWorkletNode(context, name);
  } catch (err) {
    await context.audioWorklet.addModule(url);
    return new AudioWorkletNode(context, name);
  }
}

/** Build a mic source provider; if deviceId is null, default device is used. */
export const makeMicSourceProvider =
  (deviceId?: string | null): SourceProvider =>
  async (ac) => {
    dbg("Requesting microphone… deviceId:", deviceId ?? "(default)");
    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    dbg(
      "Got microphone tracks:",
      stream.getTracks().map((t) => (t as MediaStreamTrack).label),
    );
    const node = ac.createMediaStreamSource(stream);
    const cleanup = () => {
      try {
        stream.getTracks().forEach((t) => t.stop());
        dbg("Mic tracks stopped");
      } catch (e) {
        console.warn("[whistle] Mic cleanup failed", e);
      }
    };
    return { node, cleanup };
  };

/** Enumerate input devices (mics). Call after getUserMedia permission. */
export async function listInputDevices(): Promise<MediaDeviceInfo[]> {
  const devs = await navigator.mediaDevices.enumerateDevices();
  return devs.filter((d) => d.kind === "audioinput");
}

const buildGraph = async (
  cfg: Config,
  sourceProvider: SourceProvider,
): Promise<Graph> => {
  const ac = new AudioContext({
    sampleRate: 48000,
    latencyHint: "interactive",
  });
  if (ac.state !== "running") {
    try {
      await ac.resume();
      dbg("AudioContext resumed:", ac.state);
    } catch (e) {
      console.warn("[whistle] AudioContext resume failed:", e);
    }
  }

  const { node: srcNode, cleanup } = await sourceProvider(ac);

  // 48 dB/oct HP & LP (4× biquad each)
  const hps = Array.from(
    { length: 4 },
    () =>
      new BiquadFilterNode(ac, {
        type: "highpass",
        frequency: cfg.hpHz,
        Q: Math.SQRT1_2,
      }),
  );
  const lps = Array.from(
    { length: 4 },
    () =>
      new BiquadFilterNode(ac, {
        type: "lowpass",
        frequency: cfg.lpHz,
        Q: Math.SQRT1_2,
      }),
  );

  // Give worklet an output so it stays in the render graph.
  const worklet = await createWorkletNode(
    ac,
    "pitch-detector",
    pitchProcessorUrl,
  );

  // Post initial config
  worklet.port.postMessage({
    type: "config",
    fMin: cfg.fMin,
    fMax: cfg.fMax,
    hopMs: cfg.hopMs,
    analysisWinMs: cfg.analysisWinMs,
    adaptive: cfg.adaptive,
    adaptPeriods: cfg.adaptPeriods,
    minWinMs: cfg.minWinMs,
    maxWinMs: cfg.maxWinMs,
    yinThreshold: cfg.yinThreshold,
    octaveGuardEpsilon: cfg.octaveGuardEpsilon,
  });

  // Wire: src -> HPx4 -> LPx4 -> worklet -> mute(0) -> destination
  let node: AudioNode = srcNode;
  for (const hp of hps) {
    node.connect(hp);
    node = hp;
  }
  for (const lp of lps) {
    node.connect(lp);
    node = lp;
  }
  node.connect(worklet);

  const mute = new GainNode(ac, { gain: 0 });
  worklet.connect(mute).connect(ac.destination);

  const stop = async () => {
    try {
      worklet.port.onmessage = null;
    } catch {}
    try {
      cleanup?.();
    } catch {}
    await ac.close();
    dbg("Audio graph stopped & context closed");
  };

  dbg(
    "Audio graph built (HP/LP filters, worklet connected, mute to destination)",
  );
  return { ac, srcNode, filters: [...hps, ...lps], worklet, mute, stop };
};

const emitEvent = (
  st: State,
  tMs: number,
  event: NoteEvent["event"],
  pitchHz: number | null,
  volDbRms: number,
  midiOrNull: number | null,
) => {
  const { chroma, octave } =
    midiOrNull == null
      ? { chroma: null, octave: null }
      : midiToChromaOct(midiOrNull);
  st.events.push({
    tMs: Math.round(tMs),
    pitchHz,
    volDbRms: +volDbRms.toFixed(2),
    chroma,
    octave,
    event,
  });
};

const gateEvent = (st: State, tMs: number) => {
  if (tMs - st.lastEventTimeMs < st.cfg.minEventSpacingMs) return false;
  st.lastEventTimeMs = tMs;
  return true;
};

const updateVoicing = (st: State, r: WorkletReading, tMs: number) => {
  const { qualityOn, qualityOff, nsdfOn, nsdfOff, snrOnDb, snrOffDb } = st.cfg;
  const q = (r as any).quality;
  const n = (r as any).nsdf;
  const s = (r as any).snrDb;
  if (!st.isVoiced) {
    const pass = q >= qualityOn && n >= nsdfOn && s >= snrOnDb;
    if (pass) {
      st.isVoiced = true;
      st.unvoicedSinceMs = 0;
    } else {
      if (!st.unvoicedSinceMs) st.unvoicedSinceMs = tMs;
    }
  } else {
    const fail = q < qualityOff || n < nsdfOff || s < snrOffDb;
    if (fail) {
      if (!st.unvoicedSinceMs) st.unvoicedSinceMs = tMs;
      st.isVoiced = false;
    } else {
      st.unvoicedSinceMs = 0;
    }
  }
};

const onFrame = (st: State, r: WorkletReading) => {
  const tMs = nowMs() - st.startTimeMs;
  const {
    onDb,
    silenceDb,
    holdBandCents,
    switchCents,
    switchHoldMs,
    onHoldMs,
    offHoldMs,
    pitchChangeCents,
    volumeDeltaDb,
    a4Hz,

    // ── NEW: octave glue knobs
    octaveGlueCents,
    octaveGlueDbDelta,
    octaveSwitchExtraHoldMs,
    fastSlopeCentsPerSec,
  } = st.cfg;

  const db = (r as any).db;

  // level gates
  if (db >= onDb) {
    if (!st.aboveOnSinceMs) st.aboveOnSinceMs = tMs;
  } else st.aboveOnSinceMs = 0;

  if (db <= silenceDb) {
    if (!st.belowSilenceSinceMs) st.belowSilenceSinceMs = tMs;
  } else st.belowSilenceSinceMs = 0;

  // voicing
  updateVoicing(st, r, tMs);
  const hasPitch = st.isVoiced && (r as any).freq > 0;

  // ------------------------------------------------------------------
  // current continuous MIDI (raw), then median-of-3 spike kill, then α-β
  // ------------------------------------------------------------------
  // raw MIDI from freq (if pitched)
  let mRaw = st.currentNoteMidi;
  if (hasPitch) mRaw = freqToMidi((r as any).freq, a4Hz);

  // Spike killer: maintain 3-sample ring, take median
  if (!Number.isFinite(mRaw)) mRaw = st.xMidi || st.currentNoteMidi;
  st.mRing.push(mRaw);
  if (st.mRing.length > 3) st.mRing.shift();
  const ring = st.mRing;
  const mMed = ring.length === 3 ? [...ring].sort((a, b) => a - b)[1] : mRaw;

  // Alpha-Beta filter on MIDI
  // Map gains from nsdf quality in [0.6 .. 0.9]
  const nsdf = (r as any).nsdf ?? 0;
  const qLo = 0.6;
  const qHi = 0.9;
  const aLo = 0.25;
  const aHi = 0.7;
  const bLo = 0.08;
  const bHi = 0.35;
  const t = Math.min(1, Math.max(0, (nsdf - qLo) / (qHi - qLo)));
  const alpha = aLo + (aHi - aLo) * t;
  const beta = bLo + (bHi - bLo) * t;
  const dtSec = st.cfg.hopMs / 1000;

  // Predict
  const xPred = st.xMidi + st.vStPerSec * dtSec;
  const rInnov = mMed - xPred;
  // Update
  st.xMidi = xPred + alpha * rInnov;
  st.vStPerSec = st.vStPerSec + (beta * rInnov) / (dtSec || 1e-9);

  // ON gate
  if (
    !st.noteOn &&
    st.aboveOnSinceMs &&
    tMs - st.aboveOnSinceMs >= onHoldMs &&
    hasPitch
  ) {
    const noteNum = Math.round(st.xMidi);
    st.currentNoteMidi = noteNum;
    st.currentPitchHz = (r as any).freq;
    st.noteOn = true;
    if (gateEvent(st, tMs))
      emitEvent(st, tMs, "ON", (r as any).freq, db, noteNum);
    st.lastVolEventDb = db;
  }

  // OFF gates
  const sustainedSilence =
    st.belowSilenceSinceMs && tMs - st.belowSilenceSinceMs >= offHoldMs;
  const sustainedUnvoiced =
    st.unvoicedSinceMs && tMs - st.unvoicedSinceMs >= offHoldMs;
  if (st.noteOn && (sustainedSilence || sustainedUnvoiced)) {
    st.noteOn = false;
    if (gateEvent(st, tMs)) emitEvent(st, tMs, "OFF", null, db, null);
    st.candidateSwitchStartMs = 0;
  }

  if (!st.noteOn || !hasPitch) {
    st.lastDb = db;
    return;
  }

  // in-note evaluation (use smoothed MIDI for cents comparisons)
  const currentNoteHz = midiToHz(st.currentNoteMidi, a4Hz);
  const smoothedHz = midiToHz(st.xMidi, a4Hz);
  const centsFromCurrent = centsDiff(smoothedHz, currentNoteHz);

  if (Math.abs(centsFromCurrent) <= holdBandCents) {
    // stay on current note; maybe emit bend
    st.candidateSwitchStartMs = 0;
    const centsFromPrevPitch = centsDiff(
      (r as any).freq,
      st.currentPitchHz || currentNoteHz,
    );
    if (Math.abs(centsFromPrevPitch) >= pitchChangeCents) {
      st.currentPitchHz = (r as any).freq;
      if (gateEvent(st, tMs)) {
        emitEvent(
          st,
          tMs,
          "CHANGE_PITCH",
          (r as any).freq,
          db,
          st.currentNoteMidi,
        );
      }
    }
  } else if (Math.abs(centsFromCurrent) >= switchCents) {
    // ──────────────────────────────────────────────────────────────
    // Switch hold with octave glue bias and fast-slope shortcut
    // ──────────────────────────────────────────────────────────────
    if (!st.candidateSwitchStartMs) st.candidateSwitchStartMs = tMs;

    // candidate new note
    const newNote = Math.round(st.xMidi);

    // Check if this looks like an *octave* of the current note
    const octUp = st.currentNoteMidi + 12;
    const octDn = st.currentNoteMidi - 12;
    const centsToOctUp = Math.abs(centsDiff(smoothedHz, midiToHz(octUp, a4Hz)));
    const centsToOctDn = Math.abs(centsDiff(smoothedHz, midiToHz(octDn, a4Hz)));
    const looksOctave =
      Math.min(centsToOctUp, centsToOctDn) <= octaveGlueCents &&
      newNote % 12 === st.currentNoteMidi % 12;

    // If octave-like, be stickier: add extra hold and require a perceptible level change
    let neededHold = switchHoldMs + (looksOctave ? octaveSwitchExtraHoldMs : 0);
    const enoughDbChange = !looksOctave
      ? true
      : Math.abs(db - st.lastDb) >= octaveGlueDbDelta;

    // Fast-slope shortcut: if moving quickly in pitch, reduce dwell by half
    const slopeCentsPerSec = Math.abs(st.vStPerSec) * 100;
    if (slopeCentsPerSec >= fastSlopeCentsPerSec) {
      neededHold = Math.max(10, Math.round(neededHold * 0.5));
    }

    if (tMs - st.candidateSwitchStartMs >= neededHold && enoughDbChange) {
      if (newNote !== st.currentNoteMidi) {
        st.currentNoteMidi = newNote;
        st.currentPitchHz = (r as any).freq;
        st.candidateSwitchStartMs = 0;
        if (gateEvent(st, tMs)) {
          emitEvent(
            st,
            tMs,
            "CHANGE_PITCH",
            (r as any).freq,
            db,
            st.currentNoteMidi,
          );
        }
      }
    }
  } else {
    st.candidateSwitchStartMs = 0;
  }

  // volume events (unchanged)
  if (Math.abs(db - st.lastVolEventDb) >= volumeDeltaDb) {
    st.lastVolEventDb = db;
    if (gateEvent(st, tMs))
      emitEvent(
        st,
        tMs,
        "CHANGE_VOLUME",
        st.currentPitchHz,
        db,
        st.currentNoteMidi,
      );
  }

  st.lastDb = db;
};

export type RecorderController = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  getLog: () => NoteEvent[];
  getConfig: () => Readonly<Config>;
  setConfig: (patch: Partial<Config>) => void;

  // mic selection
  setInputDevice: (deviceId: string | null) => Promise<void>;
  getInputDevice: () => string | null;
};

export const createWhistleRecorder = (
  initial?: Partial<Config>,
  sourceProvider?: SourceProvider,
): RecorderController => {
  let cfg: Config = { ...DEFAULTS, ...initial };
  const st: State = {
    cfg,
    startTimeMs: 0,
    lastEventTimeMs: Number.NEGATIVE_INFINITY,
    lastNoteSwitchAtMs: Number.NEGATIVE_INFINITY,
    noteOn: false,
    isVoiced: false,
    currentNoteMidi: 0,
    currentPitchHz: 0,
    lastDb: -100,
    lastVolEventDb: -100,
    candidateSwitchStartMs: 0,
    belowSilenceSinceMs: 0,
    aboveOnSinceMs: 0,
    unvoicedSinceMs: 0,
    events: [],
    // smoothing init
    mRing: [],
    xMidi: 0,
    vStPerSec: 0,
  };

  let graph: Graph | null = null;

  // Device selection
  let deviceId: string | null = null;
  let provider: SourceProvider =
    sourceProvider ?? makeMicSourceProvider(deviceId);

  // Debug watchdog: warn if no frames received for a while.
  let lastMsgAt = 0;
  let watchdogTimer: number | null = null;

  const startWatchdog = () => {
    if (watchdogTimer != null) return;
    watchdogTimer = window.setInterval(() => {
      const now = performance.now();
      if (!lastMsgAt || now - lastMsgAt > 3000) {
        console.warn(
          "[whistle] No worklet messages for",
          lastMsgAt ? `${Math.round(now - lastMsgAt)}ms` : "ever",
          "— check mic input, permissions, or worklet URL.",
        );
      }
    }, 1500);
  };
  const stopWatchdog = () => {
    if (watchdogTimer != null) {
      clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
  };

  const start = async () => {
    if (graph) return;
    try {
      graph = await buildGraph(cfg, provider);
    } catch (e) {
      console.error("[whistle] buildGraph failed:", e);
      throw e;
    }
    st.startTimeMs = performance.now();

    graph.worklet.port.onmessage = (e: MessageEvent) => {
      const m: any = e.data;
      lastMsgAt = performance.now();

      if (m?.type === "ready") {
        dbg("Worklet ready:", m);
        return;
      }
      if (m?.type === "stats") {
        dbg(
          "stats",
          `ringWrite=${m.ringWrite} filled=${m.ringFilled} acc=${m.acc} hop=${m.hopLen} effWin=${m.effWinLen} frames=${m.frames} posts=${m.posts} silence=${m.silence}`,
        );
        return;
      }
      onFrame(st, m as WorkletReading);
    };

    startWatchdog();
    dbg("Recorder started");
  };

  const stop = async () => {
    if (!graph) return;
    graph.worklet.port.onmessage = null;
    await graph.stop();
    graph = null;
    stopWatchdog();
    dbg("Recorder stopped");
  };

  const getLog = () => st.events.slice();
  const getConfig = () => ({ ...cfg });
  const setConfig = (patch: Partial<Config>) => {
    cfg = { ...cfg, ...patch };
    st.cfg = cfg;
    if (graph) {
      dbg("Updating config live:", patch);
      graph.worklet.port.postMessage({
        type: "config",
        fMin: cfg.fMin,
        fMax: cfg.fMax,
        hopMs: cfg.hopMs,
        analysisWinMs: cfg.analysisWinMs,
        adaptive: cfg.adaptive,
        adaptPeriods: cfg.adaptPeriods,
        minWinMs: cfg.minWinMs,
        maxWinMs: cfg.maxWinMs,
        yinThreshold: cfg.yinThreshold,
        octaveGuardEpsilon: cfg.octaveGuardEpsilon,
      });
      const [hpCut, lpCut] = [cfg.hpHz, cfg.lpHz];
      graph.filters.forEach((f) => {
        if (f.type === "highpass") f.frequency.value = hpCut;
        if (f.type === "lowpass") f.frequency.value = lpCut;
      });
    }
  };

  const setInputDevice = async (id: string | null) => {
    deviceId = id;
    provider = sourceProvider ?? makeMicSourceProvider(deviceId);
    // If running, restart graph with new device.
    if (graph) {
      dbg("Switching input device to:", deviceId ?? "(default)");
      await stop();
      await start();
    }
  };
  const getInputDevice = () => deviceId;

  return {
    start,
    stop,
    getLog,
    getConfig,
    setConfig,
    setInputDevice,
    getInputDevice,
  };
};
