import { type FC, createRef, $ } from "defuss";
import { inspectProps, type InspectedProp } from "./prop-utils.js";

interface StoryMeta {
  title?: string;
  component?: Function;
  description?: string;
  argTypes?: Record<string, any>;
  args?: Record<string, unknown>;
}

interface PropEditorProps {
  meta: StoryMeta;
  propsStore: {
    value: Record<string, unknown>;
    set: (key: string, val: unknown) => void;
  };
}

export const PropEditor: FC<PropEditorProps> = ({ meta, propsStore }) => {
  const props = inspectProps(meta);

  if (props.length === 0) {
    return (
      <div class="text-sm text-muted-foreground italic">
        No configurable props detected. Add argTypes to your story meta to
        enable controls.
      </div>
    );
  }

  const handleChange = (propName: string, value: unknown) => {
    propsStore.set(propName, value);
  };

  const resetAll = () => {
    const defaults: Record<string, unknown> = {};
    for (const prop of props) {
      if (prop.defaultValue !== undefined) {
        defaults[prop.name] = prop.defaultValue;
      }
    }
    propsStore.set(defaults as any);
  };

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold">Controls</h3>
        <button
          class="text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={resetAll}
        >
          Reset
        </button>
      </div>
      <div class="space-y-3">
        {props.map((prop) => (
          <PropControl
            key={prop.name}
            prop={prop}
            propsStore={propsStore}
            onChange={handleChange}
          />
        ))}
      </div>
    </div>
  );
};

interface PropControlProps {
  prop: InspectedProp;
  propsStore: PropEditorProps["propsStore"];
  onChange: (name: string, value: unknown) => void;
}

const PropControl: FC<PropControlProps> = ({ prop, propsStore, onChange }) => {
  const currentValue = propsStore.value[prop.name] ?? prop.defaultValue;

  return (
    <div class="flex items-center gap-3 text-sm">
      <label
        class="w-28 shrink-0 font-medium text-muted-foreground"
        title={prop.description || prop.name}
      >
        {prop.name}
      </label>
      <div class="flex-1">{renderControl(prop, currentValue, onChange)}</div>
    </div>
  );
};

function renderControl(
  prop: InspectedProp,
  currentValue: unknown,
  onChange: (name: string, value: unknown) => void,
) {
  switch (prop.control) {
    case "boolean":
      return (
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            class="input"
            checked={!!currentValue}
            onChange={(e: Event) => {
              onChange(prop.name, (e.target as HTMLInputElement).checked);
            }}
          />
          <span class="text-xs text-muted-foreground">
            {String(currentValue)}
          </span>
        </label>
      );

    case "select":
      return (
        <select
          class="select w-full text-sm"
          value={String(currentValue ?? "")}
          onChange={(e: Event) => {
            onChange(prop.name, (e.target as HTMLSelectElement).value);
          }}
        >
          {(prop.options || []).map((opt) => (
            <option key={opt} value={opt} selected={opt === currentValue}>
              {opt}
            </option>
          ))}
        </select>
      );

    case "number":
    case "range":
      return (
        <div class="flex items-center gap-2">
          <input
            type={prop.control === "range" ? "range" : "number"}
            class={prop.control === "range" ? "w-full" : "input w-full text-sm"}
            value={String(currentValue ?? "")}
            min={prop.min}
            max={prop.max}
            step={prop.step}
            onInput={(e: Event) => {
              const val = Number((e.target as HTMLInputElement).value);
              onChange(prop.name, Number.isNaN(val) ? 0 : val);
            }}
          />
          {prop.control === "range" && (
            <span class="text-xs text-muted-foreground w-10 text-right">
              {String(currentValue)}
            </span>
          )}
        </div>
      );

    case "color":
      return (
        <div class="flex items-center gap-2">
          <input
            type="color"
            value={String(currentValue ?? "#000000")}
            onInput={(e: Event) => {
              onChange(prop.name, (e.target as HTMLInputElement).value);
            }}
          />
          <span class="text-xs text-muted-foreground">
            {String(currentValue)}
          </span>
        </div>
      );

    case "object":
      return (
        <textarea
          class="textarea w-full text-sm font-mono"
          rows={3}
          value={
            typeof currentValue === "string"
              ? currentValue
              : JSON.stringify(currentValue, null, 2)
          }
          onInput={(e: Event) => {
            const raw = (e.target as HTMLTextAreaElement).value;
            try {
              onChange(prop.name, JSON.parse(raw));
            } catch {
              onChange(prop.name, raw);
            }
          }}
        />
      );

    case "text":
    default:
      return (
        <input
          type="text"
          class="input w-full text-sm"
          value={String(currentValue ?? "")}
          onInput={(e: Event) => {
            onChange(prop.name, (e.target as HTMLInputElement).value);
          }}
        />
      );
  }
}
