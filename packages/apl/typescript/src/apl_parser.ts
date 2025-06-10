// apl_parser.ts
/**
 * Universal Prompt Language (APL) Parser
 *
 * This parser reads a simple text format for defining workflow steps
 * with pre- and post-processing code, and user/system prompts.
 *
 * Usage:
 * ```typescript
 * import { parseApl } from "./aplParser.ts";
 * const ast = parseApl(await Deno.readTextFile("workflow.apl"));
 * console.log(ast["greet"].prompt.system);
 * ```
 */

export interface Prompt {
  system: string;
  user: string;
}
export interface Step {
  name: string;
  slug: string;
  preMeta: Record<string, unknown>;
  preCode: string;
  prompt: Prompt;
  postCode: string;
}

const PHASE_RE = /^\s*#\s*(pre|prompt|post)\s*:\s*(.*?)\s*$/i;
const SUB_RE = /^\s*##\s*(system|user)\s*(?:[:\-\s]*)$/i;
const DASH_RE = /^\s*---\s*$/;
const NUM_RE = /^-?\d+(?:\.\d+)?$/;

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

function cast(val: string): unknown {
  val = val.trim();
  if (val.startsWith("[") && val.endsWith("]"))
    return val
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  if (NUM_RE.test(val))
    return val.includes(".")
      ? Number.parseFloat(val)
      : Number.parseInt(val, 10);
  return val;
}

function parseMeta(
  lines: string[],
  idx: number,
): [Record<string, unknown>, number] {
  const meta: Record<string, unknown> = {};
  idx++; // skip opening ---
  while (idx < lines.length && !DASH_RE.test(lines[idx])) {
    const pos = lines[idx].indexOf(":");
    if (pos > -1)
      meta[lines[idx].slice(0, pos).trim()] = cast(lines[idx].slice(pos + 1));
    idx++;
  }
  return [meta, idx + 1]; // skip closing ---
}

export function parseApl(text: string): Record<string, Step> {
  const lines = text.split(/\r?\n/);
  const steps: Record<string, Step> = {};
  let i = 0;

  while (i < lines.length) {
    const m = lines[i].match(PHASE_RE);
    if (!m) {
      i++;
      continue;
    }

    const phase = m[1].toLowerCase();
    const name = m[2].trim();
    const step =
      steps[name] ??
      // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
      (steps[name] = {
        name,
        slug: slug(name),
        preMeta: {},
        preCode: "",
        prompt: { system: "", user: "" },
        postCode: "",
      });
    i++;

    if (phase === "pre") {
      if (i < lines.length && DASH_RE.test(lines[i])) {
        const [meta, next] = parseMeta(lines, i);
        Object.assign(step.preMeta, meta);
        i = next;
      }
      const buf: string[] = [];
      while (i < lines.length && !PHASE_RE.test(lines[i])) buf.push(lines[i++]);
      step.preCode = buf.join("\n").trimEnd();
    } else if (phase === "prompt") {
      let cur: "system" | "user" | null = null;
      let buf: string[] = [];
      const flush = () => {
        if (cur) step.prompt[cur] = buf.join("\n").trimEnd();
      };
      while (i < lines.length && !PHASE_RE.test(lines[i])) {
        const s = lines[i].match(SUB_RE);
        if (s) {
          flush();
          cur = s[1].toLowerCase() as "system" | "user";
          buf = [];
          i++;
          continue;
        }
        buf.push(lines[i++]);
      }
      flush();
    } else {
      // post
      const buf: string[] = [];
      while (i < lines.length && !PHASE_RE.test(lines[i])) buf.push(lines[i++]);
      step.postCode = buf.join("\n").trimEnd();
    }
  }
  return steps;
}
