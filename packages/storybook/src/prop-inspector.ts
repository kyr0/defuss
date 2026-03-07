import type { InspectedProp, StoryMeta } from "./types.js";

/**
 * Inspect a component function to extract its props and infer control types.
 *
 * Three-layer detection:
 * 1. Explicit argTypes from the story meta (highest priority)
 * 2. Function reflection: parse destructured params from Component.toString()
 * 3. Default args from meta.args
 */
export function inspectProps(meta: StoryMeta): InspectedProp[] {
  const props: Map<string, InspectedProp> = new Map();

  // Layer 2: Function reflection — extract param names and defaults from source
  if (meta.component) {
    const reflected = reflectFunctionProps(meta.component);
    for (const prop of reflected) {
      props.set(prop.name, prop);
    }
  }

  // Layer 3: Merge default args
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

  // Layer 1: Explicit argTypes override everything
  if (meta.argTypes) {
    for (const [name, argType] of Object.entries(meta.argTypes)) {
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

  // Filter out children, className, class — these aren't meaningful controls
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

/**
 * Parse a function's source to extract destructured parameter names and defaults.
 *
 * Handles patterns like:
 *   ({ variant = "default", disabled, onClick, size = "md" })
 *   (props)
 */
function reflectFunctionProps(fn: Function): InspectedProp[] {
  const source = fn.toString();
  const props: InspectedProp[] = [];

  // Match destructured object parameter: ({ param1, param2 = defaultVal, ... })
  const destructuredMatch = source.match(/\(\s*\{([^}]*)\}\s*(?::|,|\))/);
  if (!destructuredMatch) return props;

  const paramBlock = destructuredMatch[1];

  // Split by comma, but respect nested objects/arrays/strings
  const params = splitParams(paramBlock);

  for (const param of params) {
    const trimmed = param.trim();
    if (!trimmed) continue;

    // Match "name = defaultValue" or just "name" (with optional type annotation after :)
    const assignMatch = trimmed.match(/^(\w+)\s*(?::\s*[^=]+?)?\s*=\s*(.+)$/s);
    const nameOnlyMatch = trimmed.match(/^(\w+)\s*(?::\s*.+)?$/);

    if (assignMatch) {
      const name = assignMatch[1];
      const rawDefault = assignMatch[2].trim();
      const defaultValue = parseDefaultValue(rawDefault);
      props.push({
        name,
        control: inferControl(defaultValue),
        defaultValue,
      });
    } else if (nameOnlyMatch) {
      const name = nameOnlyMatch[1];
      props.push({
        name,
        control: "text", // unknown type defaults to text
      });
    }
  }

  return props;
}

/** Split parameters respecting nested braces, brackets, and strings */
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

/** Try to parse a source-code default value into a JS value */
function parseDefaultValue(raw: string): unknown {
  // String literal
  const strMatch = raw.match(/^["'`](.*)["'`]$/s);
  if (strMatch) return strMatch[1];

  // Boolean
  if (raw === "true") return true;
  if (raw === "false") return false;

  // Number
  const num = Number(raw);
  if (!Number.isNaN(num) && raw !== "") return num;

  // null/undefined
  if (raw === "null") return null;
  if (raw === "undefined") return undefined;

  // Array literal (simple)
  if (raw.startsWith("[")) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  // Object literal — return as string (can't safely eval)
  return raw;
}

/** Infer the best control type from a JavaScript value */
function inferControl(value: unknown): InspectedProp["control"] {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string") {
    // Check if it looks like a color
    if (/^#[0-9a-fA-F]{3,8}$/.test(value) || /^(rgb|hsl)/.test(value))
      return "color";
    return "text";
  }
  if (Array.isArray(value)) return "object";
  return "text";
}
