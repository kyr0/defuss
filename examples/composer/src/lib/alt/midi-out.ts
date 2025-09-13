// Web MIDI adapter with key-quantized note identity and correct pitch-bend.
// No external deps. Always-on streaming once initialized & an output is chosen.

export type MidiOutConfig = {
  channel?: number; // 1..16
  pitchBendRange?: number; // semitones (match your synth/DAW)
  dbRange?: [number, number]; // dB window for velocity/CC mapping
  ccForVolume?: number; // 11=Expression (default), or 7=Volume
  key?: MusicalKeyName; // default: "C major"
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
  | `${"C" | "C#" | "Db" | "D" | "D#" | "Eb" | "E" | "F" | "F#" | "Gb" | "G" | "G#" | "Ab" | "A" | "A#" | "Bb" | "B"} ${"major" | "minor"}`
  | "Chromatic";

export type MusicalKey = {
  tonicPC: number; // 0..11
  mode: Mode;
  allowedPC: boolean[]; // length 12 mask
};

export function parseKey(name: MusicalKeyName): MusicalKey {
  if (name === "Chromatic") {
    return { tonicPC: 0, mode: "major", allowedPC: new Array(12).fill(true) };
  }

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

  constructor(recorder: RecorderLike, cfg?: MidiOutConfig) {
    this.rec = recorder;
    const keyName = cfg?.key ?? ("Chromatic" as MusicalKeyName);
    this.key = parseKey(keyName);
    this.cfg = {
      channel: cfg?.channel ?? 1,
      pitchBendRange: cfg?.pitchBendRange ?? 2,
      dbRange: cfg?.dbRange ?? [-60, -20],
      ccForVolume: cfg?.ccForVolume ?? 11,
      key: keyName,
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
    let bestNote = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    // examine nearby octaves around the target
    const centerOct = Math.floor(mFloat / 12);
    for (let oct = centerOct - 1; oct <= centerOct + 1; oct++) {
      for (let pc = 0; pc < 12; pc++) {
        if (!this.key.allowedPC[pc]) continue;
        const n = oct * 12 + pc;
        const d = Math.abs(n - mFloat);
        if (d < bestDist) {
          bestDist = d;
          bestNote = n;
        }
      }
    }
    return bestNote;
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

    for (const ev of slice) this.handleEvent(ev);
  }

  private handleEvent(ev: NoteEvent) {
    const out = this.out!;
    const ch = this.ch();

    switch (ev.event) {
      case "ON": {
        if (ev.pitchHz == null) break;
        const mFloat = this.hzToMidi(ev.pitchHz);
        const inKey = this.quantizeToKey(mFloat);
        const { base, bend14 } = this.chooseBaseAndBend(mFloat, inKey);
        const vel = this.dbToVelocity(ev.volDbRms);

        // re-articulate if we had a different base playing
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
        const preferred =
          this.lastBaseNote != null
            ? this.lastBaseNote
            : this.quantizeToKey(mFloat);
        const { base, bend14 } = this.chooseBaseAndBend(mFloat, preferred);

        if (this.lastBaseNote == null) {
          // safety: no base note yet, synthesize one
          this.noteOn(ch, base, 64);
          this.lastBaseNote = base;
        } else if (base !== this.lastBaseNote) {
          // step base note (still in key) when bend would exceed PB range
          this.noteOff(ch, this.lastBaseNote, 0);
          this.noteOn(ch, base, 64);
          this.lastBaseNote = base;
        }
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
