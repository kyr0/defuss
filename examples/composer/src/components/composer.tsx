// ui/DashboardScreen.tsx
import UIkit from "uikit";
import { createRef } from "defuss";
import {
  createWhistleRecorder,
  listInputDevices,
} from "../lib/whistle-recorder";
import {
  MidiOutAdapter,
  type MusicalKeyName,
  type SmoothingMode,
  type DecisionRule,
} from "../lib/midi-out";
import { TestAudio } from "./test-audio";

const rec = createWhistleRecorder({
  hpHz: 600,
  lpHz: 6000,
  fMin: 600,
  fMax: 6000,
  hopMs: 10,
  analysisWinMs: 30,
  adaptive: true,
  adaptPeriods: 8,
  minWinMs: 24,
  maxWinMs: 60,
  // Voicing: slightly softer to avoid dropouts on airy whistles
  qualityOn: 0.6,
  qualityOff: 0.5,
  nsdfOn: 0.65,
  nsdfOff: 0.55,
  snrOnDb: 3,
  snrOffDb: 1,
  // Event spacing (UI only; recorder enforces OFF->ON pair bypass for switches)
  minEventSpacingMs: 12,
  // Level gates: easier ON, quieter silence
  onDb: -55,
  silenceDb: -65,
  volumeDeltaDb: 1.5,
  // Bend and switch gates tuned for smoothing
  pitchChangeCents: 25,
  holdBandCents: 10,
  switchCents: 100,
  // Stability windows
  onHoldMs: 60,
  offHoldMs: 90,
  switchHoldMs: 35,
  yinThreshold: 0.12,
  octaveGuardEpsilon: 0.07,
  a4Hz: 440,
  // Octave glue
  octaveGlueCents: 80,
  octaveGlueDbDelta: 8,
  octaveSwitchExtraHoldMs: 60,
  // Explicit refractory: min time between note identity changes
  minNoteSwitchMs: 150,
});

// MIDI: always enabled once we init + select an output.
const midi = new MidiOutAdapter(rec, {
  channel: 1,
  pitchBendRange: 2, // must match synth/DAW
  dbRange: [-60, -20],
  ccForVolume: 11,
  key: "C major",
  // Bias rounding toward floor at low register and toward ceil at high register
  biasLow: 0.2,
  biasHigh: 0.2,
});

const ALL_KEYS: MusicalKeyName[] = [
  "C major",
  "G major",
  "D major",
  "A major",
  "E major",
  "B major",
  "F# major",
  "Db major",
  "Ab major",
  "Eb major",
  "Bb major",
  "F major",
  "A minor",
  "E minor",
  "B minor",
  "F# minor",
  "C# minor",
  "G# minor",
  "D# minor",
  "Bb minor",
  "F minor",
  "C minor",
  "G minor",
  "D minor",
];

export function DashboardScreen() {
  const logRef = createRef<null, HTMLPreElement>();
  const micSelRef = createRef<null, HTMLSelectElement>();
  const midiSelRef = createRef<null, HTMLSelectElement>();
  const keySelRef = createRef<null, HTMLSelectElement>();
  const smoothSelRef = createRef<null, HTMLSelectElement>();
  const ruleSelRef = createRef<null, HTMLSelectElement>();
  const bpmRef = createRef<null, HTMLInputElement>();
  const bpmValRef = createRef<null, HTMLSpanElement>();
  const tsNumRef = createRef<null, HTMLSelectElement>();
  const tsDenRef = createRef<null, HTMLSelectElement>();
  const noteLenRef = createRef<null, HTMLSelectElement>();
  const metroRef = createRef<null, HTMLInputElement>();

  const updatePre = () => {
    if (!logRef.current) return;
    logRef.current.textContent = JSON.stringify(rec.getLog(), null, 2);
  };

  const populateMics = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {}
    const devices = await listInputDevices();
    const sel = micSelRef.current!;
    sel.innerHTML = "";
    const def = document.createElement("option");
    def.value = "";
    def.textContent = "(System default)";
    sel.appendChild(def);
    for (const d of devices) {
      const opt = document.createElement("option");
      opt.value = d.deviceId;
      opt.textContent = d.label || `Mic ${sel.options.length}`;
      sel.appendChild(opt);
    }
    // Auto-select preferred microphone
    const pick = (() => {
      const prefs = ["built-in", "microphone", "mikrophone"]; // lowercase
      // search in actual device options (skip system default at index 0)
      for (let i = 1; i < sel.options.length; i++) {
        const txt = sel.options[i]!.textContent?.toLowerCase() || "";
        if (prefs.some((p) => txt.includes(p))) return sel.options[i]!.value;
      }
      // else: choose first listed device if any
      return sel.options.length > 1 ? sel.options[1]!.value : "";
    })();
    sel.value = pick;
    // Apply selection immediately
    await onMicSelect();
  };

  const populateMidi = async () => {
    await midi.init(); // must be called from a user gesture in some browsers
    const outs = midi.listOutputs();
    const sel = midiSelRef.current!;
    sel.innerHTML = "";
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "(Select MIDI Out)";
    sel.appendChild(none);
    for (const o of outs) {
      const opt = document.createElement("option");
      opt.value = o.id;
      opt.textContent = o.name;
      sel.appendChild(opt);
    }
    // Auto-select first actual output if present
    if (sel.options.length > 1) {
      sel.value = sel.options[1]!.value;
      onMidiSelect();
    } else {
      sel.value = "";
    }
  };

  const populateKeys = () => {
    const sel = keySelRef.current!;
    sel.innerHTML = "";
    for (const k of ALL_KEYS) {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      sel.appendChild(opt);
    }
    sel.value = "C major";
  };

  const populateSmoothing = () => {
    const sSel = smoothSelRef.current!;
    sSel.innerHTML = "";
    for (const v of ["provisional", "delayed"] as SmoothingMode[]) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      sSel.appendChild(opt);
    }
    sSel.value = "provisional";
    midi.setSmoothingMode("provisional");

    const rSel = ruleSelRef.current!;
    rSel.innerHTML = "";
    for (const v of ["last", "majority", "hmm"] as DecisionRule[]) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      rSel.appendChild(opt);
    }
    rSel.value = "hmm";
    midi.setDecisionRule("hmm");
  };

  const onMicSelect = async () => {
    const id = micSelRef.current!.value || null;
    await rec.setInputDevice(id);
    UIkit.notification({
      message: `Mic: ${id ? "custom" : "default"}`,
      status: "primary",
    });
  };

  const onMidiSelect = () => {
    const id = midiSelRef.current!.value || null;
    midi.setOutput(id);
    // Always-on: start streaming once we have an output.
    midi.start();
    UIkit.notification({
      message: id ? "MIDI streaming ON" : "No output selected",
      status: id ? "success" : "warning",
    });
  };

  const onKeySelect = () => {
    const k = keySelRef.current!.value as MusicalKeyName;
    midi.setKey(k);
    UIkit.notification({ message: `Key: ${k}`, status: "primary" });
  };

  const onSmoothingSelect = () => {
    const mode = smoothSelRef.current!.value as SmoothingMode;
    midi.setSmoothingMode(mode);
    UIkit.notification({ message: `Smoothing: ${mode}`, status: "primary" });
    // Recompute timing derivations since window depends on mode
    applyTimingDerived();
  };
  const onRuleSelect = () => {
    const rule = ruleSelRef.current!.value as DecisionRule;
    midi.setDecisionRule(rule);
    UIkit.notification({ message: `Rule: ${rule}`, status: "primary" });
  };

  const start = async () => {
    // Initialize MIDI & populate outs on first start (gesture-safe).
    if (!midiSelRef.current?.options.length) await populateMidi();
    // Start MIDI streaming first so we don't miss the first ON from recorder
    midi.start();
    await rec.start();
    UIkit.notification({ message: "Recorder started", status: "success" });
  };

  const stop = async () => {
    await rec.stop();
    midi.stop();
    UIkit.notification({ message: "Recorder stopped", status: "warning" });
  };

  const dump = () => {
    updatePre();
    UIkit.notification({ message: "Dumped log", status: "primary" });
  };

  // Init selectors on first paint
  queueMicrotask(() => {
    populateMics();
    // Also populate MIDI outs immediately and auto-select first if present
    populateMidi();
    populateKeys();
    populateSmoothing();
    setupTimingDefaults();
  });

  // --- Timing / musical grid ---
  const setupTimingDefaults = () => {
    // Defaults
    setBpmAndApply(120);
    setTimeSignatureAndApply(4, 4);
    setNoteLengthAndApply("1/8");
    // Metronome enabled by default
    setMetronomeEnabled(true);
  };

  const quarterMs = (bpm: number) => 60000 / bpm;
  const wholeMs = (bpm: number) => 4 * quarterMs(bpm);
  const noteDurMs = (bpm: number, nl: string) => {
    const denom = Number.parseInt(nl.split("/")[1]!, 10);
    return wholeMs(bpm) / denom;
  };

  const setBpmAndApply = (bpm: number) => {
    if (bpmRef.current) bpmRef.current.value = String(bpm);
    if (bpmValRef.current) bpmValRef.current.textContent = String(bpm);
    midi.setBpm(bpm);
    applyTimingDerived();
  };
  const setTimeSignatureAndApply = (num: number, den: 2 | 4 | 8) => {
    if (tsNumRef.current) tsNumRef.current.value = String(num);
    if (tsDenRef.current) tsDenRef.current.value = String(den);
    midi.setTimeSignature(num, den);
    applyTimingDerived();
  };
  const setNoteLengthAndApply = (nl: string) => {
    if (noteLenRef.current) noteLenRef.current.value = nl;
    applyTimingDerived();
  };
  const setMetronomeEnabled = (on: boolean) => {
    if (metroRef.current) metroRef.current.checked = on;
    midi.enableMetronome(on);
  };

  const applyTimingDerived = () => {
    const bpm = Number.parseInt(bpmRef.current?.value || "120", 10);
    const nl = noteLenRef.current?.value || "1/16";
    const mode = (smoothSelRef.current?.value ||
      "provisional") as SmoothingMode;
    const dur = noteDurMs(bpm, nl);
    const minSwitch = Math.max(120, Math.min(600, Math.round(dur * 0.9)));
    // Window policy: provisional gets a short window; delayed locks to 3× min note duration
    const win =
      mode === "delayed"
        ? Math.max(150, Math.min(1500, Math.round(dur * 3)))
        : Math.max(80, Math.min(250, Math.round(dur * 0.45)));
    // Recorder refractory
    rec.setConfig({ minNoteSwitchMs: minSwitch });
    // Smoothing window
    midi.setWindowMs(win);
    // Also guard MIDI-level articulation
    midi.setMinArticulationMs(minSwitch);
  };

  const onBpmInput = () => {
    const bpm = Number.parseInt(bpmRef.current!.value || "120", 10);
    setBpmAndApply(bpm);
  };
  const onTsChange = () => {
    const num = Number.parseInt(tsNumRef.current!.value, 10) || 4;
    const den = Number.parseInt(tsDenRef.current!.value, 10) as 2 | 4 | 8;
    setTimeSignatureAndApply(num, den);
    UIkit.notification({ message: `Time: ${num}/${den}`, status: "primary" });
  };
  const onNoteLenChange = () => {
    const nl = noteLenRef.current!.value;
    setNoteLengthAndApply(nl);
    UIkit.notification({ message: `Min note: ${nl}`, status: "primary" });
  };
  const onMetroToggle = () => {
    const on = !!metroRef.current!.checked;
    setMetronomeEnabled(on);
  };

  return (
    <div class="w-full max-w-xl space-y-3">
      <div class="flex items-center gap-2">
        <label class="min-w-[8rem]" for="micSel">
          Microphone
        </label>
        <select
          id="micSel"
          ref={micSelRef}
          onChange={onMicSelect}
          class="uk-select"
        ></select>
      </div>

      <div class="flex items-center gap-2">
        <label class="min-w-[8rem]" for="bpm">
          BPM
        </label>
        <input
          id="bpm"
          ref={bpmRef}
          type="range"
          min="40"
          max="240"
          step="1"
          onInput={onBpmInput}
          class="uk-range"
        />
        <span ref={bpmValRef}>120</span>
      </div>
      <div class="flex items-center gap-2">
        <label class="min-w-[8rem]" for="ts">
          Time Signature
        </label>
        <select ref={tsNumRef} onChange={onTsChange} class="uk-select">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
            <option value={n}>{n}</option>
          ))}
        </select>
        <span>/</span>
        <select ref={tsDenRef} onChange={onTsChange} class="uk-select">
          {[2, 4, 8].map((d) => (
            <option value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label class="min-w-[8rem]" for="noteLen">
          Min Note
        </label>
        <select ref={noteLenRef} onChange={onNoteLenChange} class="uk-select">
          {["1/16", "1/8", "1/4", "1/2", "1/1"].map((l) => (
            <option value={l}>{l}</option>
          ))}
        </select>
        <div class="flex gap-x-3 ml-4 items-center justify-center">
          <input
            class="uk-checkbox mt-1"
            id="metronome"
            type="checkbox"
            ref={metroRef}
            onChange={onMetroToggle}
          />
          <label class="uk-form-label mt-1" for="metronome">
            Metronome
          </label>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <label class="min-w-[8rem]" for="midiSel">
          MIDI Output
        </label>
        <select
          id="midiSel"
          ref={midiSelRef}
          onChange={onMidiSelect}
          class="uk-select"
        ></select>
        <button
          type="button"
          class="uk-btn uk-btn-default"
          onClick={populateMidi}
        >
          Refresh
        </button>
      </div>

      <div class="flex items-center gap-2">
        <label class="min-w-[8rem]" for="keySel">
          Musical Key
        </label>
        <select
          id="keySel"
          ref={keySelRef}
          onChange={onKeySelect}
          class="uk-select"
        ></select>
      </div>

      <div class="flex items-center gap-2">
        <label class="min-w-[8rem]" for="smoothSel">
          Smoothing
        </label>
        <select
          id="smoothSel"
          ref={smoothSelRef}
          onChange={onSmoothingSelect}
          class="uk-select"
        ></select>
      </div>
      <div class="flex items-center gap-2">
        <label class="min-w-[8rem]" for="ruleSel">
          Decision Rule
        </label>
        <select
          id="ruleSel"
          ref={ruleSelRef}
          onChange={onRuleSelect}
          class="uk-select"
        ></select>
      </div>

      <div class="flex gap-2">
        <button
          type="button"
          id="start"
          onClick={start}
          class="uk-btn uk-btn-primary"
        >
          Start
        </button>
        <button
          type="button"
          id="stop"
          onClick={stop}
          class="uk-btn uk-btn-danger"
        >
          Stop
        </button>
        <button type="button" id="dump" onClick={dump} class="uk-btn">
          Dump JSON
        </button>
      </div>

      <div class="uk-divider-icon" />
      <div>
        <div class="uk-text-bold uk-margin-small">Test audio (virtual mic)</div>
        <div class="space-y-2">
          {[
            // Test audio files
            { label: "Bomb Drop", url: "/test_audios/Bomb%20Drop.m4a" },
            { label: "Deepest Note", url: "/test_audios/Deepest%20Note.m4a" },
            { label: "Fast Staccato", url: "/test_audios/Fast%20Staccato.m4a" },
            { label: "Highest Note", url: "/test_audios/Highest%20Note.m4a" },
            {
              label: "Hoch zu Berge",
              url: "/test_audios/Hoch%20zu%20Berge.m4a",
            },
            {
              label: "Normal and Fast Staccato",
              url: "/test_audios/Normal%20and%20Fast%20Staccato.m4a",
            },
            { label: "Riser", url: "/test_audios/Riser.m4a" },
            { label: "Settlers 2", url: "/test_audios/Settlers%202.m4a" },
            { label: "Slow Melody", url: "/test_audios/Slow%20Melody.m4a" },
            {
              label: "Slow Stoccato Octave Switch",
              url: "/test_audios/Slow%20Stoccato%20Octave%20Switch.m4a",
            },
            { label: "Fast Staccato", url: "/test_audios/Fast%20Staccato.m4a" },
          ].map((t) => (
            <TestAudio rec={rec} src={t.url} label={t.label} />
          ))}
        </div>
      </div>

      <pre
        id="log"
        ref={logRef}
        class="uk-text-small uk-padding-small uk-background-muted"
      />
    </div>
  );
}
