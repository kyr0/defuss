// ui/DashboardScreen.tsx
import UIkit from "uikit";
import { createRef } from "defuss";
import {
  createWhistleRecorder,
  listInputDevices,
} from "../lib/whistle-recorder";
import { MidiOutAdapter, type MusicalKeyName } from "../lib/midi-out";

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
    sel.value = "";
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
    sel.value = "";
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

  const start = async () => {
    // Initialize MIDI & populate outs on first start (gesture-safe).
    if (!midiSelRef.current?.options.length) await populateMidi();
    await rec.start();
    // Start MIDI streaming regardless; if no output yet, it no-ops until selected.
    midi.start();
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
    populateKeys();
  });

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
          class="uk-button uk-button-default"
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

      <div class="flex gap-2">
        <button
          type="button"
          id="start"
          onClick={start}
          class="uk-button uk-button-primary"
        >
          Start
        </button>
        <button
          type="button"
          id="stop"
          onClick={stop}
          class="uk-button uk-button-danger"
        >
          Stop
        </button>
        <button type="button" id="dump" onClick={dump} class="uk-button">
          Dump JSON
        </button>
      </div>

      <pre
        id="log"
        ref={logRef}
        class="uk-text-small uk-padding-small uk-background-muted"
      />
    </div>
  );
}
