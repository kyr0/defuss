/**
 * Runtime prop introspection for the storybook shell app.
 * This is a browser-side module — it mirrors the logic from src/prop-inspector.ts
 * but runs in the browser context.
 */

export interface InspectedProp {
  name: string;
  control:
    | "text"
    | "number"
    | "boolean"
    | "select"
    | "color"
    | "object"
    | "range";
  defaultValue?: unknown;
  options?: string[];
  description?: string;
  min?: number;
  max?: number;
  step?: number;
}

interface StoryMeta {
  title?: string;
  component?: Function;
  description?: string;
  argTypes?: Record<string, any>;
  args?: Record<string, unknown>;
}

/**
 * Inspect a component function to extract its props and infer control types.
 */
export function inspectProps(meta: StoryMeta): InspectedProp[] {
  const props = new Map<string, InspectedProp>();

  // Layer 2: Function reflection
  if (meta.component) {
    for (const prop of reflectFunctionProps(meta.component)) {
      props.set(prop.name, prop);
    }
  }

  // Layer 3: Default args
  if (meta.args) {
    for (const [name, value] of Object.entries(meta.args)) {
      const existing = props.get(name) ?? {
        name,
        control: inferControl(value),
      };
      existing.defaultValue = value;
      existing.control = inferControl(value);
      props.set(name, existing);
    }
  }

  // Layer 1: Explicit argTypes (highest priority)
  if (meta.argTypes) {
    for (const [name, argType] of Object.entries(meta.argTypes) as [
      string,
      any,
    ][]) {
      const existing = props.get(name) ?? { name, control: argType.control };
      existing.control = argType.control;
      if (argType.defaultValue !== undefined)
        existing.defaultValue = argType.defaultValue;
      if (argType.options) existing.options = argType.options;
      if (argType.description) existing.description = argType.description;
      if (argType.min !== undefined) existing.min = argType.min;
      if (argType.max !== undefined) existing.max = argType.max;
      if (argType.step !== undefined) existing.step = argType.step;
      props.set(name, existing);
    }
  }

  const skipProps = new Set([
    "children",
    "className",
    "class",
    "key",
    "ref",
    "onMount",
    "onUnmount",
  ]);
  return Array.from(props.values()).filter((p) => !skipProps.has(p.name));
}

function reflectFunctionProps(fn: Function): InspectedProp[] {
  const source = fn.toString();
  const props: InspectedProp[] = [];

  const destructuredMatch = source.match(/\(\s*\{([^}]*)\}\s*(?::|,|\))/);
  if (!destructuredMatch) return props;

  const params = splitParams(destructuredMatch[1]);

  for (const param of params) {
    const trimmed = param.trim();
    if (!trimmed) continue;

    const assignMatch = trimmed.match(/^(\w+)\s*(?::\s*[^=]+?)?\s*=\s*(.+)$/s);
    const nameOnlyMatch = trimmed.match(/^(\w+)\s*(?::\s*.+)?$/);

    if (assignMatch) {
      const name = assignMatch[1];
      const defaultValue = parseDefaultValue(assignMatch[2].trim());
      props.push({ name, control: inferControl(defaultValue), defaultValue });
    } else if (nameOnlyMatch) {
      props.push({ name: nameOnlyMatch[1], control: "text" });
    }
  }

  return props;
}

function splitParams(block: string): string[] {
  const params: string[] = [];
  let depth = 0;
  let current = "";
  let inString: string | null = null;

  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    const prev = i > 0 ? block[i - 1] : "";

    if (inString) {
      current += ch;
      if (ch === inString && prev !== "\\") inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      current += ch;
      continue;
    }
    if (ch === "{" || ch === "[" || ch === "(") {
      depth++;
      current += ch;
      continue;
    }
    if (ch === "}" || ch === "]" || ch === ")") {
      depth--;
      current += ch;
      continue;
    }
    if (ch === "," && depth === 0) {
      params.push(current);
      current = "";
      continue;
    }
    current += ch;
  }

  if (current.trim()) params.push(current);
  return params;
}

function parseDefaultValue(raw: string): unknown {
  const strMatch = raw.match(/^["'`](.*)["'`]$/s);
  if (strMatch) return strMatch[1];
  if (raw === "true") return true;
  if (raw === "false") return false;
  const num = Number(raw);
  if (!Number.isNaN(num) && raw !== "") return num;
  if (raw === "null") return null;
  if (raw === "undefined") return undefined;
  if (raw.startsWith("[")) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function inferControl(value: unknown): InspectedProp["control"] {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string") {
    if (/^#[0-9a-fA-F]{3,8}$/.test(value) || /^(rgb|hsl)/.test(value))
      return "color";
    return "text";
  }
  if (Array.isArray(value)) return "object";
  return "text";
}
