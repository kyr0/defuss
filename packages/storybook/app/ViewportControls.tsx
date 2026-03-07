import { type FC, createRef, createStore, $ } from "defuss";

interface ViewportPreset {
  label: string;
  width: number;
  height: number;
}

const PRESETS: ViewportPreset[] = [
  { label: "Mobile S", width: 320, height: 568 },
  { label: "Mobile M", width: 375, height: 667 },
  { label: "Mobile L", width: 425, height: 812 },
  { label: "Tablet", width: 768, height: 1024 },
  { label: "Laptop", width: 1024, height: 768 },
  { label: "Desktop", width: 1440, height: 900 },
];

export interface ViewportState {
  width: number;
  height: number;
  isConstrained: boolean;
}

// Restore persisted viewport state from localStorage
function loadViewportState(): ViewportState {
  try {
    const raw = localStorage.getItem("sb-viewport");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        typeof parsed.width === "number" &&
        typeof parsed.height === "number"
      ) {
        return {
          width: parsed.width,
          height: parsed.height,
          isConstrained: !!parsed.isConstrained,
        };
      }
    }
  } catch {}
  return { width: 0, height: 0, isConstrained: false };
}

export const viewportStore = createStore<ViewportState>(loadViewportState());

// Persist on every change
viewportStore.subscribe((val) => {
  localStorage.setItem("sb-viewport", JSON.stringify(val));
});

export const ViewportControls: FC = () => {
  const widthRef = createRef<HTMLInputElement>();
  const heightRef = createRef<HTMLInputElement>();
  const selectRef = createRef<HTMLSelectElement>();

  const syncInputs = (state: ViewportState) => {
    if (widthRef.current)
      widthRef.current.value = state.isConstrained ? String(state.width) : "";
    if (heightRef.current)
      heightRef.current.value = state.isConstrained ? String(state.height) : "";
  };

  const selectPreset = (preset: ViewportPreset) => {
    viewportStore.set({
      width: preset.width,
      height: preset.height,
      isConstrained: true,
    });
    syncInputs(viewportStore.value);
  };

  const flipOrientation = () => {
    const { width, height, isConstrained } = viewportStore.value;
    if (!isConstrained) return;
    viewportStore.set({ width: height, height: width, isConstrained: true });
    syncInputs(viewportStore.value);
  };

  const resetViewport = () => {
    viewportStore.set({ width: 0, height: 0, isConstrained: false });
    syncInputs(viewportStore.value);
  };

  const onDimensionInput = () => {
    const w = Number.parseInt(widthRef.current?.value || "0", 10) || 0;
    const h = Number.parseInt(heightRef.current?.value || "0", 10) || 0;
    viewportStore.set({
      width: w,
      height: h,
      isConstrained: w > 0 || h > 0,
    });
  };

  const onMount = () => {
    // Restore inputs from persisted state
    const { width, height, isConstrained } = viewportStore.value;
    syncInputs(viewportStore.value);
    // Restore select to matching preset (or "reset")
    if (selectRef.current) {
      if (isConstrained) {
        const match = PRESETS.find(
          (p) => p.width === width && p.height === height,
        );
        selectRef.current.value = match ? match.label : "reset";
      } else {
        selectRef.current.value = "reset";
      }
    }
  };

  return (
    <div class="flex items-center gap-1.5 flex-wrap" onMount={onMount}>
      {/* Preset buttons */}
      <select
        ref={selectRef}
        class="select h-7 text-xs leading-none"
        onChange={(e: Event) => {
          const val = (e.target as HTMLSelectElement).value;
          if (val === "reset") {
            resetViewport();
          } else {
            const preset = PRESETS.find((p) => p.label === val);
            if (preset) selectPreset(preset);
          }
        }}
      >
        <option value="reset">Responsive</option>
        {PRESETS.map((p) => (
          <option key={p.label} value={p.label}>
            {p.label} ({p.width}×{p.height})
          </option>
        ))}
      </select>

      {/* Width input */}
      <div class="flex items-center gap-0.5">
        <span class="text-xs text-muted-foreground mr-1 ml-2">W</span>
        <input
          ref={widthRef}
          type="number"
          class="input h-7 w-18 text-xs text-center"
          placeholder="auto"
          min="0"
          onInput={onDimensionInput}
        />
      </div>

      {/* Height input */}
      <div class="flex items-center gap-0.5">
        <span class="text-xs text-muted-foreground mr-1 ml-2">H</span>
        <input
          ref={heightRef}
          type="number"
          class="input h-7 w-18 text-xs text-center"
          placeholder="auto"
          min="0"
          onInput={onDimensionInput}
        />
      </div>

      {/* Flip orientation */}
      <button
        class="btn-icon-ghost size-7"
        onClick={flipOrientation}
        aria-label="Flip orientation"
        title="Flip orientation (landscape/portrait)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-9L21 12m0 0-4.5 4.5M21 12H7.5" />
        </svg>
      </button>
    </div>
  );
};
