// Web MIDI adapter with key-quantized note identity and correct pitch-bend.
// No external deps. Always-on streaming once initialized & an output is chosen.

export type SmoothingMode = "provisional" | "delayed";
export type DecisionRule = "last" | "majority" | "hmm";

export type MidiOutConfig = {
  channel?: number; // 1..16
  pitchBendRange?: number; // semitones (match your synth/DAW)
  dbRange?: [number, number]; // dB window for velocity/CC mapping
  ccForVolume?: number; // 11=Expression (default), or 7=Volume
  key?: MusicalKeyName; // default: "C major"
  /** Bias rounding toward lower notes at low register and toward higher notes at high register.
   *  0 = no bias, 1 = strong bias. */
  biasLow?: number;
  biasHigh?: number;
  // Smoothing selector
  smoothingMode?: SmoothingMode; // default: "provisional"
  decisionRule?: DecisionRule; // default: "last"
  windowMs?: number; // decision window (e.g., 200-250)
};

export type NoteEvent = {
  tMs: number;
  pitchHz: number | null;
  volDbRms: number;
  chroma: number | null;
  octave: number | null;
  event: "ON" | "OFF" | "CHANGE_PITCH" | "CHANGE_VOLUME";
};

type RecorderLike = { getLog(): NoteEvent[] };

/* -------------------- Musical key model -------------------- */

const NOTE_TO_PC: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

type Mode = "major" | "minor";

// 12-TET scale degrees relative to tonic
const SCALE_DEGREES: Record<Mode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10], // natural minor
};

export type MusicalKeyName =
  `${"C" | "C#" | "Db" | "D" | "D#" | "Eb" | "E" | "F" | "F#" | "Gb" | "G" | "G#" | "Ab" | "A" | "A#" | "Bb" | "B"} ${"major" | "minor"}`;

export type MusicalKey = {
  tonicPC: number; // 0..11
  mode: Mode;
  allowedPC: boolean[]; // length 12 mask
};

export function parseKey(name: MusicalKeyName): MusicalKey {
  const [tonicRaw, modeRaw] = name.split(" ") as [string, Mode];
  const tonicPC = NOTE_TO_PC[tonicRaw];
  const mode = modeRaw;
  const mask = new Array(12).fill(false);
  for (const deg of SCALE_DEGREES[mode]) mask[(tonicPC + deg) % 12] = true;
  return { tonicPC, mode, allowedPC: mask };
}

/* -------------------- MIDI adapter -------------------- */

export class MidiOutAdapter {
  private midi: MIDIAccess | null = null;
  private out: MIDIOutput | null = null;
  private pollTimer: number | null = null;
  private lastIdx = 0;
  private lastBaseNote: number | null = null; // last sent base MIDI note (in-key)
  private readonly rec: RecorderLike;
  private cfg: Required<MidiOutConfig>;
  private key: MusicalKey;

  // Smoothing window state
  private winActive = false;
  private winStartMs = 0;
  private winIdentities: number[] = [];
  private winProvisionalBase: number | null = null;

  constructor(recorder: RecorderLike, cfg?: MidiOutConfig) {
    this.rec = recorder;
    const keyName = cfg?.key ?? ("C major" as MusicalKeyName);
    this.key = parseKey(keyName);
    this.cfg = {
      channel: cfg?.channel ?? 1,
      pitchBendRange: cfg?.pitchBendRange ?? 2,
      dbRange: cfg?.dbRange ?? [-60, -20],
      ccForVolume: cfg?.ccForVolume ?? 11,
      key: keyName,
      biasLow: cfg?.biasLow ?? 0,
      biasHigh: cfg?.biasHigh ?? 0,
      smoothingMode: cfg?.smoothingMode ?? "provisional",
      decisionRule: cfg?.decisionRule ?? "last",
      windowMs: cfg?.windowMs ?? 220,
    };
  }

  async init(): Promise<void> {
    if (!navigator.requestMIDIAccess) {
      throw new Error("Web MIDI not available in this browser/context.");
    }
    this.midi = await navigator.requestMIDIAccess({ sysex: false });
  }

  listOutputs(): Array<{ id: string; name: string }> {
    if (!this.midi) return [];
    const outs: Array<{ id: string; name: string }> = [];
    this.midi.outputs.forEach((o) =>
      outs.push({ id: o.id, name: o.name ?? o.id }),
    );
    outs.sort((a, b) => a.name.localeCompare(b.name));
    return outs;
  }

  setOutput(id: string | null) {
    if (!this.midi) throw new Error("MIDI not initialized");
    this.out = id ? (this.midi.outputs.get(id) ?? null) : null;
  }

  /** Always-on streaming: start immediately */
  start(): void {
    if (this.pollTimer != null) return;
    this.lastIdx = 0;
    this.pollTimer = window.setInterval(() => this.tick(), 20);
  }

  stop(): void {
    if (this.pollTimer != null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.out) this.cc(this.ch(), 123, 0);
    this.lastBaseNote = null;
    this.resetWindow();
  }

  setKey(name: MusicalKeyName) {
    this.key = parseKey(name);
  }

  /* ------------- core mapping helpers ------------- */

  private ch(): number {
    return clamp((this.cfg.channel | 0) - 1, 0, 15);
  }
  private dbToVelocity(db: number): number {
    const [lo, hi] = this.cfg.dbRange;
    const t = clamp((db - lo) / (hi - lo), 0, 1);
    return clamp(Math.round(1 + 126 * (t * t)), 1, 127);
  }
  private dbToCC(db: number): number {
    const [lo, hi] = this.cfg.dbRange;
    const t = clamp((db - lo) / (hi - lo), 0, 1);
    return clamp(Math.round(127 * (t * t)), 0, 127);
  }
  private hzToMidi(hz: number): number {
    return 69 + 12 * Math.log2(hz / 440);
  }
  private midiToFreq(note: number): number {
    return 440 * 2 ** ((note - 69) / 12);
  }
  private bendFromSemitoneDelta(deltaSemis: number): number {
    const span = this.cfg.pitchBendRange;
    const x = clamp(deltaSemis / span, -1, 1);
    return clamp(Math.round(8192 + x * 8192), 0, 16383);
  }

  /** Quantize a floating MIDI to nearest in-key integer note number. */
  private quantizeToKey(mFloat: number): number {
    const mWarped = this.warpForBias(mFloat);
    let bestNote = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    // examine nearby octaves around the target
    const centerOct = Math.floor(mWarped / 12);
    for (let oct = centerOct - 1; oct <= centerOct + 1; oct++) {
      for (let pc = 0; pc < 12; pc++) {
        if (!this.key.allowedPC[pc]) continue;
        const n = oct * 12 + pc;
        const d = Math.abs(n - mWarped);
        if (d < bestDist) {
          bestDist = d;
          bestNote = n;
        }
      }
    }
    return bestNote;
  }

  /** Warp fractional rounding point to bias toward floor at low register and toward ceil at high register. */
  private warpForBias(mFloat: number): number {
    const base = Math.floor(mFloat);
    const f = mFloat - base; // [0,1)
    // Map register across a musically reasonable whistle range
    const mLow = 60; // C4
    const mHigh = 96; // C7
    const r = clamp((mFloat - mLow) / (mHigh - mLow), 0, 1);
    const kDown = (this.cfg.biasLow ?? 0) * (1 - r); // stronger at low register
    const kUp = (this.cfg.biasHigh ?? 0) * r; // stronger at high register
    const net = kUp - kDown; // >0 bias up; <0 bias down
    const C = 3; // curvature strength
    let f2 = f;
    if (net > 1e-6) {
      f2 = 1 - (1 - f) ** (1 + net * C);
    } else if (net < -1e-6) {
      f2 = f ** (1 + -net * C);
    }
    return base + f2;
  }

  /** Ensure bend within range by stepping base note along in-key neighbors toward mFloat. */
  private chooseBaseAndBend(
    mFloat: number,
    preferredBase: number,
  ): { base: number; bend14: number } {
    let base = preferredBase;
    // precompute allowed pitch classes list for neighbor search
    const allowedPCs: number[] = [];
    for (let pc = 0; pc < 12; pc++)
      if (this.key.allowedPC[pc]) allowedPCs.push(pc);

    // helper to find next in-key neighbor up/down from a given base
    const nextNeighbor = (from: number, dir: 1 | -1): number => {
      // search up to 12 steps (guaranteed to find one every <= 2 semis in these scales)
      for (let k = 1; k <= 12; k++) {
        const cand = from + dir * k;
        if (this.key.allowedPC[((cand % 12) + 12) % 12]) return cand;
      }
      return from; // fallback shouldn't happen
    };

    const pbRange = this.cfg.pitchBendRange; // semis
    // While outside PB range, walk base toward target using in-key neighbors
    while (Math.abs(mFloat - base) > pbRange + 1e-6) {
      base = nextNeighbor(base, mFloat > base ? 1 : -1);
    }

    const deltaSemis = mFloat - base; // signed semitone offset to real frequency
    const bend14 = this.bendFromSemitoneDelta(deltaSemis);
    return { base, bend14 };
  }

  /* ------------- streaming ------------- */

  private tick(): void {
    if (!this.out) return;
    const log = this.rec.getLog();
    if (this.lastIdx >= log.length) return;
    const slice = log.slice(this.lastIdx);
    this.lastIdx = log.length;

    for (const ev of slice) this.processEvent(ev);
  }

  /* ------------- smoothing pipeline ------------- */

  setSmoothingMode(mode: SmoothingMode) {
    this.cfg = { ...this.cfg, smoothingMode: mode };
    this.resetWindow();
  }
  setDecisionRule(rule: DecisionRule) {
    this.cfg = { ...this.cfg, decisionRule: rule };
    this.resetWindow();
  }
  setWindowMs(ms: number) {
    this.cfg = { ...this.cfg, windowMs: Math.max(40, Math.min(600, ms | 0)) };
    this.resetWindow();
  }

  private resetWindow() {
    this.winActive = false;
    this.winStartMs = 0;
    this.winIdentities = [];
    this.winProvisionalBase = null;
  }

  private identityFromEvent(ev: NoteEvent): number | null {
    if (ev.pitchHz == null) return null;
    const mFloat = this.hzToMidi(ev.pitchHz);
    return this.quantizeToKey(mFloat);
  }

  private processEvent(ev: NoteEvent) {
    // Close stale window if new event advances time beyond it
    if (
      this.winActive &&
      ev.tMs - this.winStartMs >= (this.cfg.windowMs ?? 220)
    ) {
      this.commitWindow(ev.tMs);
    }

    switch (ev.event) {
      case "ON": {
        const id = this.identityFromEvent(ev);
        if (id == null) return;
        if (!this.winActive) {
          // Start new window
          this.winActive = true;
          this.winStartMs = ev.tMs;
          this.winIdentities = [id];
          if (this.cfg.smoothingMode === "provisional") {
            // Emit provisional ON immediately
            this.winProvisionalBase = id;
            this.emitOn(ev, id);
          } else {
            this.winProvisionalBase = null; // no provisional output
          }
        } else {
          // Already in a window: collect identity
          this.winIdentities.push(id);
          // In provisional mode, do not emit additional ONs inside window
        }
        break;
      }
      case "OFF": {
        // OFF always flushes; end window and forward OFF statefully
        this.commitWindow(ev.tMs); // if still active, finalize to reduce surprise
        this.handleOff(ev);
        this.resetWindow();
        break;
      }
      case "CHANGE_PITCH": {
        // Pass pitch bends through in real-time, regardless of window
        this.handleChangePitch(ev);
        break;
      }
      case "CHANGE_VOLUME": {
        this.handleChangeVolume(ev);
        break;
      }
    }
  }

  private commitWindow(nowMs: number) {
    if (!this.winActive) return;
    const ids = this.winIdentities;
    if (ids.length === 0) {
      this.resetWindow();
      return;
    }
    const decided = this.decideIdentity(ids, this.cfg.decisionRule);
    if (this.cfg.smoothingMode === "provisional") {
      // Correct if needed: single re-articulation
      if (
        this.winProvisionalBase != null &&
        decided !== this.winProvisionalBase
      ) {
        this.emitOff(nowMs);
        this.emitOn(
          {
            tMs: nowMs,
            pitchHz: this.midiToFreq(decided),
            volDbRms: -30,
            chroma: decided % 12,
            octave: Math.floor(decided / 12) - 1,
            event: "ON",
          },
          decided,
        );
      }
    } else {
      // Delayed mode: output ON now
      this.emitOn(
        {
          tMs: nowMs,
          pitchHz: this.midiToFreq(decided),
          volDbRms: -30,
          chroma: decided % 12,
          octave: Math.floor(decided / 12) - 1,
          event: "ON",
        },
        decided,
      );
    }
    this.resetWindow();
  }

  private decideIdentity(ids: number[], rule: DecisionRule): number {
    if (rule === "last") return ids[ids.length - 1];
    if (rule === "majority") {
      const counts = new Map<number, number>();
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
      let best = ids[0];
      let bestC = -1;
      for (const [k, c] of counts) {
        if (
          c > bestC ||
          (c === bestC && ids.lastIndexOf(k) > ids.lastIndexOf(best))
        ) {
          best = k;
          bestC = c;
        }
      }
      return best;
    }
    // small HMM/Viterbi over observed identities
    const uniq = Array.from(new Set(ids));
    const N = uniq.length;
    const T = ids.length;
    const switchCost = 1.5; // penalty to switch between identities
    // DP tables
    const dp: number[][] = Array.from({ length: T }, () =>
      Array(N).fill(Number.POSITIVE_INFINITY),
    );
    const bt: number[][] = Array.from({ length: T }, () => Array(N).fill(-1));
    // initialize
    for (let s = 0; s < N; s++) dp[0][s] = uniq[s] === ids[0] ? 0 : 1;
    // iterate
    for (let t = 1; t < T; t++) {
      for (let s = 0; s < N; s++) {
        let best = Number.POSITIVE_INFINITY;
        let arg = 0;
        for (let sp = 0; sp < N; sp++) {
          const trans = sp === s ? 0 : switchCost;
          const emit = uniq[s] === ids[t] ? 0 : 1;
          const cand = dp[t - 1][sp] + trans + emit;
          if (cand < best) {
            best = cand;
            arg = sp;
          }
        }
        dp[t][s] = best;
        bt[t][s] = arg;
      }
    }
    // backtrace final state with min cost
    let sBest = 0;
    let cBest = dp[T - 1][0];
    for (let s = 1; s < N; s++)
      if (dp[T - 1][s] < cBest) {
        cBest = dp[T - 1][s];
        sBest = s;
      }
    return uniq[sBest];
  }

  private handleEvent(ev: NoteEvent) {
    const out = this.out!;
    const ch = this.ch();

    switch (ev.event) {
      case "ON": {
        if (ev.pitchHz == null) break;
        const mFloat = this.hzToMidi(ev.pitchHz);
        const base = this.quantizeToKey(mFloat);
        const bend14 = this.bendFromSemitoneDelta(mFloat - base);
        const vel = this.dbToVelocity(ev.volDbRms);
        if (this.lastBaseNote != null && this.lastBaseNote !== base) {
          this.noteOff(ch, this.lastBaseNote, 0);
        }
        this.sendPitchBend(ch, bend14);
        this.noteOn(ch, base, vel);
        this.lastBaseNote = base;
        break;
      }
      case "OFF": {
        if (this.lastBaseNote != null) this.noteOff(ch, this.lastBaseNote, 0);
        else this.cc(ch, 123, 0);
        this.lastBaseNote = null;
        break;
      }
      case "CHANGE_PITCH": {
        if (ev.pitchHz == null) break;
        const mFloat = this.hzToMidi(ev.pitchHz);
        if (this.lastBaseNote == null) break;
        const deltaSemis = mFloat - this.lastBaseNote;
        const bend14 = this.bendFromSemitoneDelta(deltaSemis);
        this.sendPitchBend(ch, bend14);
        break;
      }
      case "CHANGE_VOLUME": {
        const val = this.dbToCC(ev.volDbRms);
        this.cc(ch, this.cfg.ccForVolume, val);
        break;
      }
    }
  }

  private emitOn(ev: NoteEvent, decidedBase: number) {
    // send ON with bend and velocity from event
    if (!this.out) return;
    const ch = this.ch();
    const mFloat = ev.pitchHz != null ? this.hzToMidi(ev.pitchHz) : decidedBase;
    const bend14 = this.bendFromSemitoneDelta(mFloat - decidedBase);
    const vel = this.dbToVelocity(ev.volDbRms);
    if (this.lastBaseNote != null && this.lastBaseNote !== decidedBase) {
      this.noteOff(ch, this.lastBaseNote, 0);
    }
    this.sendPitchBend(ch, bend14);
    this.noteOn(ch, decidedBase, vel);
    this.lastBaseNote = decidedBase;
  }

  private emitOff(nowMs: number) {
    if (!this.out) return;
    const ch = this.ch();
    if (this.lastBaseNote != null) this.noteOff(ch, this.lastBaseNote, 0);
    else this.cc(ch, 123, 0);
    this.lastBaseNote = null;
  }

  private handleOff(ev: NoteEvent) {
    this.handleEvent(ev);
  }
  private handleChangePitch(ev: NoteEvent) {
    this.handleEvent(ev);
  }
  private handleChangeVolume(ev: NoteEvent) {
    this.handleEvent(ev);
  }

  /* ------------- raw MIDI helpers ------------- */

  private noteOn(ch: number, note: number, vel: number) {
    this.out!.send([0x90 | ch, note & 0x7f, vel & 0x7f]);
  }
  private noteOff(ch: number, note: number, vel = 0) {
    this.out!.send([0x80 | ch, note & 0x7f, vel & 0x7f]);
  }
  private cc(ch: number, num: number, val: number) {
    this.out!.send([0xb0 | ch, num & 0x7f, val & 0x7f]);
  }
  private sendPitchBend(ch: number, v14: number) {
    const lsb = v14 & 0x7f;
    const msb = (v14 >> 7) & 0x7f;
    this.out!.send([0xe0 | ch, lsb, msb]);
  }
}

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}
