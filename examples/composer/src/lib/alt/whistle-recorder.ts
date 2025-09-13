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

  // audio-clock alignment
  audioT0Ms: number; // first r.tMs
  lastEventTimeMs: number; // in audio ms

  // note + voicing
  noteOn: boolean;
  isVoiced: boolean;
  currentNoteMidi: number;
  currentPitchHz: number;

  // gating accumulators (audio ms)
  aboveOnSinceMs: number;
  belowSilenceSinceMs: number;
  unvoicedSinceMs: number;

  // re-articulation envelope & valley
  envDb: number; // decaying envelope for drop measurement
  valleyMinDb: number; // min dB within current valley
  belowRearticFrames: number; // consecutive frames below threshold
  rearticArmed: boolean; // next ON uses rearticOnHoldMs
  lastOnTimeMs: number; // for cooldown

  // switch hold
  candidateSwitchFrames: number;

  // housekeeping
  lastDb: number;
  lastVolEventDb: number;

  events: NoteEvent[];
};

const dbg = (...a: any[]) => console.log("[whistle]", ...a);

async function createWorkletNode(
  context: BaseAudioContext,
  name: string,
  url: string,
) {
  try {
    return new AudioWorkletNode(context, name);
  } catch {
    await context.audioWorklet.addModule(url);
    return new AudioWorkletNode(context, name);
  }
}

export const makeMicSourceProvider =
  (deviceId?: string | null): SourceProvider =>
  async (ac) => {
    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const node = ac.createMediaStreamSource(stream);
    const cleanup = () => {
      try {
        stream.getTracks().forEach((t) => t.stop());
      } catch {}
    };
    return { node, cleanup };
  };

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
    } catch {}
  }

  const { node: srcNode, cleanup } = await sourceProvider(ac);

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

  const worklet = await createWorkletNode(
    ac,
    "pitch-detector",
    pitchProcessorUrl,
  );
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
  };

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
  const minSpacing = Math.max(st.cfg.minEventSpacingMs, st.cfg.hopMs);
  if (tMs - st.lastEventTimeMs < minSpacing) return false;
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
    } else if (!st.unvoicedSinceMs) st.unvoicedSinceMs = tMs;
  } else {
    const fail = q < qualityOff || n < nsdfOff || s < snrOffDb;
    if (fail) {
      if (!st.unvoicedSinceMs) st.unvoicedSinceMs = tMs;
      st.isVoiced = false;
    } else st.unvoicedSinceMs = 0;
  }
};

// --- NEW: octave glue (normalize freq near ±1 octave if no real energy change)
const normalizeOctaveFamily = (
  fHz: number,
  refMidi: number,
  a4: number,
  centsTol: number,
) => {
  if (!Number.isFinite(fHz) || fHz <= 0) return fHz;
  const refHz = midiToHz(refMidi, a4);
  if (!(refHz > 0)) return fHz;
  const cents = centsDiff(fHz, refHz);
  // near +1200c → halve; near -1200c → double
  if (Math.abs(cents - 1200) <= centsTol) return fHz * 0.5;
  if (Math.abs(cents + 1200) <= centsTol) return fHz * 2.0;
  return fHz;
};

const onFrame = (st: State, r: WorkletReading) => {
  if (st.audioT0Ms === Number.NEGATIVE_INFINITY) st.audioT0Ms = r.tMs;
  const tMs = r.tMs - st.audioT0Ms;

  const {
    onDb,
    silenceDb,
    holdBandCents,
    switchCents,
    onHoldMs,
    offHoldMs,
    pitchChangeCents,
    volumeDeltaDb,
    a4Hz,
    rearticDbDrop,
    rearticMinGapMs,
    rearticOnHoldMs,
    rearticCooldownMs = 100,
    rearticPeakDecayDbPerSec = 12,
    octaveGlueCents = 80,
    octaveGlueDbDelta = 8,
    octaveSwitchExtraHoldMs = 40,
  } = st.cfg;

  const db = (r as any).db;

  // Envelope gates for ON/OFF
  if (db >= onDb) {
    if (!st.aboveOnSinceMs) st.aboveOnSinceMs = tMs;
  } else st.aboveOnSinceMs = 0;

  if (db <= silenceDb) {
    if (!st.belowSilenceSinceMs) st.belowSilenceSinceMs = tMs;
  } else st.belowSilenceSinceMs = 0;

  updateVoicing(st, r, tMs);
  const rawHasPitch = st.isVoiced && (r as any).freq > 0;

  let workletFreq = (r as any).freq;

  // Octave glue is only meaningful while a note is on (we have a reference)
  // and when energy hasn't changed a lot (i.e., not a new attack).
  if (st.noteOn && rawHasPitch) {
    const dbDelta = Math.abs(db - st.lastDb);
    const allowFamilyChange =
      dbDelta >= octaveGlueDbDelta ||
      (st.belowSilenceSinceMs && tMs - st.belowSilenceSinceMs >= offHoldMs);
    if (!allowFamilyChange) {
      workletFreq = normalizeOctaveFamily(
        workletFreq,
        st.currentNoteMidi,
        a4Hz,
        octaveGlueCents,
      );
    }
  }

  const hasPitch = st.isVoiced && workletFreq > 0;

  // === Re-articulation: decaying envelope + valley frames + cooldown ===
  if (st.noteOn) {
    const decayPerFrame = rearticPeakDecayDbPerSec * (st.cfg.hopMs / 1000);
    if (db > st.envDb) st.envDb = db;
    else st.envDb = Math.max(db, st.envDb - decayPerFrame);

    const drop = st.envDb - db;

    if (drop >= rearticDbDrop) {
      st.belowRearticFrames++;
      st.valleyMinDb = Math.min(st.valleyMinDb, db);
    } else {
      st.belowRearticFrames = 0;
      st.valleyMinDb = db;
    }

    const framesGapNeeded = Math.max(
      1,
      Math.ceil(rearticMinGapMs / Math.max(1, st.cfg.hopMs)),
    );
    const unvoicedGap =
      st.unvoicedSinceMs && tMs - st.unvoicedSinceMs >= rearticMinGapMs;
    const valleyGap = st.belowRearticFrames >= framesGapNeeded;
    const cooldownOk = tMs - st.lastOnTimeMs >= rearticCooldownMs;

    if ((unvoicedGap || valleyGap) && cooldownOk) {
      st.noteOn = false;
      if (gateEvent(st, tMs)) emitEvent(st, tMs, "OFF", null, db, null);

      st.rearticArmed = true;
      st.aboveOnSinceMs = 0;
      st.belowRearticFrames = 0;
      st.valleyMinDb = db;
      st.envDb = db;
      st.candidateSwitchFrames = 0;

      st.lastDb = db;
      return;
    }
  }

  // === ON gate (shorter hold if re-artic armed) ===
  const neededOnHold = st.rearticArmed ? rearticOnHoldMs : onHoldMs;
  if (
    !st.noteOn &&
    st.aboveOnSinceMs &&
    tMs - st.aboveOnSinceMs >= neededOnHold &&
    hasPitch
  ) {
    const midiFloat = freqToMidi(workletFreq, a4Hz);
    const noteNum = Math.round(midiFloat);
    st.currentNoteMidi = noteNum;
    st.currentPitchHz = workletFreq;
    st.noteOn = true;
    st.rearticArmed = false;
    st.candidateSwitchFrames = 0;

    st.envDb = db;
    st.valleyMinDb = db;
    st.belowRearticFrames = 0;
    st.lastOnTimeMs = tMs;

    if (gateEvent(st, tMs)) emitEvent(st, tMs, "ON", workletFreq, db, noteNum);
    st.lastVolEventDb = db;
  }

  // === Safety OFF (sustained silence/unvoiced) ===
  const sustainedSilence =
    st.belowSilenceSinceMs && tMs - st.belowSilenceSinceMs >= offHoldMs;
  const sustainedUnvoiced =
    st.unvoicedSinceMs && tMs - st.unvoicedSinceMs >= offHoldMs;
  if (st.noteOn && (sustainedSilence || sustainedUnvoiced)) {
    st.noteOn = false;
    if (gateEvent(st, tMs)) emitEvent(st, tMs, "OFF", null, db, null);
    st.candidateSwitchFrames = 0;
    st.rearticArmed = true;
    st.aboveOnSinceMs = 0;
    st.envDb = db;
    st.valleyMinDb = db;
    st.belowRearticFrames = 0;
  }

  if (!st.noteOn || !hasPitch) {
    st.lastDb = db;
    return;
  }

  // === In-note drift / note switch with extra hold for octave family change ===
  const currentNoteHz = midiToHz(st.currentNoteMidi, a4Hz);
  const centsFromCurrent = centsDiff(workletFreq, currentNoteHz);

  const isOctaveLike =
    Math.abs(centsFromCurrent - 1200) <= octaveGlueCents + 20 ||
    Math.abs(centsFromCurrent + 1200) <= octaveGlueCents + 20;

  if (Math.abs(centsFromCurrent) <= st.cfg.holdBandCents) {
    const centsFromPrevPitch = centsDiff(
      workletFreq,
      st.currentPitchHz || currentNoteHz,
    );
    if (Math.abs(centsFromPrevPitch) >= st.cfg.pitchChangeCents) {
      st.currentPitchHz = workletFreq;
      if (gateEvent(st, tMs))
        emitEvent(st, tMs, "CHANGE_PITCH", workletFreq, db, st.currentNoteMidi);
    }
  } else {
    const baseHoldMs =
      st.cfg.switchHoldMs + (isOctaveLike ? octaveSwitchExtraHoldMs : 0);
    const framesHold = Math.max(
      1,
      Math.round(baseHoldMs / Math.max(1, st.cfg.hopMs)),
    );

    if (Math.abs(centsFromCurrent) >= st.cfg.switchCents) {
      if (++st.candidateSwitchFrames >= framesHold) {
        const newNote = Math.round(freqToMidi(workletFreq, a4Hz));
        if (newNote !== st.currentNoteMidi) {
          st.currentNoteMidi = newNote;
          st.currentPitchHz = workletFreq;
          st.candidateSwitchFrames = 0;
          if (gateEvent(st, tMs))
            emitEvent(
              st,
              tMs,
              "CHANGE_PITCH",
              workletFreq,
              db,
              st.currentNoteMidi,
            );
        } else {
          st.candidateSwitchFrames = 0;
        }
      }
    } else {
      st.candidateSwitchFrames = 0;
    }
  }

  // Volume events
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
    audioT0Ms: Number.NEGATIVE_INFINITY,
    lastEventTimeMs: Number.NEGATIVE_INFINITY,

    noteOn: false,
    isVoiced: false,
    currentNoteMidi: 0,
    currentPitchHz: 0,

    aboveOnSinceMs: 0,
    belowSilenceSinceMs: 0,
    unvoicedSinceMs: 0,

    envDb: -100,
    valleyMinDb: -100,
    belowRearticFrames: 0,
    rearticArmed: false,
    lastOnTimeMs: Number.NEGATIVE_INFINITY,

    candidateSwitchFrames: 0,

    lastDb: -100,
    lastVolEventDb: -100,

    events: [],
  };

  let graph: Graph | null = null;

  // Device selection
  let deviceId: string | null = null;
  let provider: SourceProvider =
    sourceProvider ?? makeMicSourceProvider(deviceId);

  // Watchdog (optional)
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
    graph = await buildGraph(cfg, provider);
    st.audioT0Ms = Number.NEGATIVE_INFINITY;
    graph.worklet.port.onmessage = (e: MessageEvent) => {
      const m: any = e.data;
      lastMsgAt = performance.now();
      if (m?.type === "ready" || m?.type === "stats") return;
      onFrame(st, m as WorkletReading);
    };
    startWatchdog();
  };

  const stop = async () => {
    if (!graph) return;
    graph.worklet.port.onmessage = null;
    await graph.stop();
    graph = null;
    stopWatchdog();
  };

  const getLog = () => st.events.slice();
  const getConfig = () => ({ ...cfg });
  const setConfig = (patch: Partial<Config>) => {
    cfg = { ...cfg, ...patch };
    st.cfg = cfg;
    if (graph) {
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
    if (graph) {
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
