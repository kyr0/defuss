// File: estree.ts
// Constant, recursive ESTree → JSON evaluator + MDX JSX props extractor.
// - Handles objects, arrays, spreads, unary/binary/logical/conditional, template literals.
// - Produces strictly JSON-serializable output (null/boolean/number/string/array/object).
// - Non-constant / non-JSONable expressions return undefined and are omitted by the extractor.

// ----------------------- JSON Types -----------------------
export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [k: string]: Json };

const isJsonScalar = (v: unknown): v is null | boolean | number | string =>
  v === null ||
  typeof v === "boolean" ||
  typeof v === "number" ||
  typeof v === "string";

const isJson = (v: unknown): v is Json =>
  isJsonScalar(v) ||
  (Array.isArray(v) && v.every(isJson)) ||
  (typeof v === "object" && v !== null && Object.values(v).every(isJson));

// ----------------------- Options --------------------------
export interface EstreeToJsonOptions {
  /** How to treat sparse array holes: "null" (default) or "skip" (compact). */
  arrayHoles?: "null" | "skip";
  /** Treat `undefined` as `null` for JSON (default true). */
  normalizeUndefinedToNull?: boolean;
  /** If true, throw on any non-constant (instead of returning undefined). */
  strict?: boolean;
}

const DEFAULT_OPTS: Required<EstreeToJsonOptions> = {
  arrayHoles: "null",
  normalizeUndefinedToNull: true,
  strict: false,
};

// ----------------------- Helpers --------------------------
type Estree = any;

function truthy(v: Json): boolean {
  return !!(v as any);
}
function toInt(v: Json): number {
  return (typeof v === "number" ? v : Number(v)) | 0;
}
function toUint(v: Json): number {
  return (typeof v === "number" ? v : Number(v)) >>> 0;
}

function failOrUndef<T>(
  opts: Required<EstreeToJsonOptions>,
  msg: string,
): T | undefined {
  if (opts.strict) throw new Error(msg);
  return undefined;
}

function isEqualLoose(a: unknown, b: unknown): boolean {
  // biome-ignore lint/suspicious/noDoubleEquals: emulate JS abstract equality for constants
  return (a as any) == (b as any);
}
function isNotEqualLoose(a: unknown, b: unknown): boolean {
  // biome-ignore lint/suspicious/noDoubleEquals: emulate JS abstract inequality for constants
  return (a as any) != (b as any);
}

// ----------------------- Evaluator ------------------------
/**
 * Evaluate an ESTree expression to a JSON value.
 * Returns undefined if value is not compile-time constant or not JSON-serializable,
 * unless opts.strict=true, in which case it throws.
 */
export function estreeToJsonConst(
  node: Estree | null | undefined,
  options?: EstreeToJsonOptions,
): Json | undefined {
  const opts = { ...DEFAULT_OPTS, ...(options ?? {}) };
  if (!node) return failOrUndef(opts, "Missing ESTree node");

  switch (node.type) {
    case "Literal": {
      // JSON accepts string/number/boolean/null. Exclude bigint/regex.
      if (node.regex) return failOrUndef(opts, "RegExp literal not JSON");
      if (typeof node.value === "bigint")
        return failOrUndef(opts, "BigInt not JSON");
      if (isJsonScalar(node.value)) return node.value;
      return failOrUndef(opts, "Non-JSON literal");
    }

    case "ArrayExpression": {
      const out: Json[] = [];
      for (const el of node.elements) {
        if (el == null) {
          if (opts.arrayHoles === "null") out.push(null);
          // if "skip", omit index; results in compact array
          continue;
        }
        if (el.type === "SpreadElement") {
          const v = estreeToJsonConst(el.argument, opts);
          if (!Array.isArray(v))
            return failOrUndef(opts, "Spread in array not array-const");
          out.push(...v);
        } else {
          const v = estreeToJsonConst(el, opts);
          if (v === undefined)
            return failOrUndef(opts, "Array element not constant");
          out.push(v);
        }
      }
      return out;
    }

    case "ObjectExpression": {
      const o: Record<string, Json> = {};
      for (const p of node.properties) {
        if (p.type === "SpreadElement") {
          const v = estreeToJsonConst(p.argument, opts);
          if (!v || typeof v !== "object" || Array.isArray(v)) {
            return failOrUndef(opts, "Object spread not constant object");
          }
          Object.assign(o, v as Record<string, Json>);
          continue;
        }
        if (p.type !== "Property" || p.kind !== "init")
          return failOrUndef(opts, "Unsupported object property");
        // compute key
        let keyVal: unknown;
        if (p.key.type === "Identifier" && !p.computed) keyVal = p.key.name;
        else if (p.key.type === "Literal" && isJsonScalar(p.key.value))
          keyVal = p.key.value;
        else if (p.computed) {
          const k = estreeToJsonConst(p.key, opts);
          if (typeof k === "string" || typeof k === "number") keyVal = k;
          else return failOrUndef(opts, "Computed key not constant");
        } else return failOrUndef(opts, "Unsupported key form");
        const val = estreeToJsonConst(p.value, opts);
        if (val === undefined)
          return failOrUndef(opts, "Object value not constant");
        const key = String(keyVal); // <-- fixes TS2538
        o[key] = val;
      }
      return o;
    }

    case "UnaryExpression": {
      // + - ! void typeof
      const v = estreeToJsonConst(node.argument, opts);
      if (v === undefined) return failOrUndef(opts, "Unary arg not constant");
      switch (node.operator) {
        case "+":
          return typeof v === "number"
            ? +v
            : failOrUndef(opts, "Unary + on non-number");
        case "-":
          return typeof v === "number"
            ? -v
            : failOrUndef(opts, "Unary - on non-number");
        case "!":
          return !v as unknown as Json;
        case "void":
          return opts.normalizeUndefinedToNull
            ? null
            : failOrUndef(opts, "void -> undefined not JSON");
        case "typeof":
          return typeof v;
        case "~":
          return toInt(v) ^ -1;
        default:
          return failOrUndef(opts, `Unsupported unary ${node.operator}`);
      }
    }

    case "BinaryExpression": {
      const l = estreeToJsonConst(node.left, opts);
      const r = estreeToJsonConst(node.right, opts);
      if (l === undefined || r === undefined)
        return failOrUndef(opts, "Binary operand not constant");

      switch (node.operator) {
        case "==":
          return isEqualLoose(l, r);
        case "!=":
          return isNotEqualLoose(l, r);
        case "===":
          return (l as any) === (r as any);
        case "!==":
          return (l as any) !== (r as any);
        case "<":
          return (l as any) < (r as any);
        case "<=":
          return (l as any) <= (r as any);
        case ">":
          return (l as any) > (r as any);
        case ">=":
          return (l as any) >= (r as any);
        case "+": {
          if (typeof l === "number" && typeof r === "number") return l + r;
          // string concatenation semantics
          if (typeof l === "string" || typeof r === "string")
            return String(l) + String(r);
          return failOrUndef(opts, "Binary + on non-number/non-string");
        }
        case "-":
          return typeof l === "number" && typeof r === "number"
            ? l - r
            : failOrUndef(opts, "Binary - on non-number");
        case "*":
          return typeof l === "number" && typeof r === "number"
            ? l * r
            : failOrUndef(opts, "Binary * on non-number");
        case "/":
          return typeof l === "number" && typeof r === "number"
            ? l / r
            : failOrUndef(opts, "Binary / on non-number");
        case "%":
          return typeof l === "number" && typeof r === "number"
            ? l % r
            : failOrUndef(opts, "Binary % on non-number");
        case "**":
          return typeof l === "number" && typeof r === "number"
            ? l ** r
            : failOrUndef(opts, "Binary ** on non-number");
        case "|":
          return toInt(l) | toInt(r);
        case "&":
          return toInt(l) & toInt(r);
        case "^":
          return toInt(l) ^ toInt(r);
        case "<<":
          return toInt(l) << toInt(r);
        case ">>":
          return toInt(l) >> toInt(r);
        case ">>>":
          return toUint(l) >>> toUint(r);
        default:
          return failOrUndef(opts, `Unsupported binary ${node.operator}`);
      }
    }

    case "LogicalExpression": {
      const l = estreeToJsonConst(node.left, opts);
      if (l === undefined)
        return failOrUndef(opts, "Logical left not constant");
      switch (node.operator) {
        case "&&": {
          const r = estreeToJsonConst(node.right, opts);
          if (r === undefined)
            return failOrUndef(opts, "Logical && right not constant");
          return truthy(l) ? r : l;
        }
        case "||": {
          const r = estreeToJsonConst(node.right, opts);
          if (r === undefined)
            return failOrUndef(opts, "Logical || right not constant");
          return truthy(l) ? l : r;
        }
        case "??": {
          const r = estreeToJsonConst(node.right, opts);
          if (r === undefined)
            return failOrUndef(opts, "Logical ?? right not constant");
          // JSON has no undefined; treat null as "absent" proxy by policy
          return l === null ? r : l;
        }
        default:
          return failOrUndef(opts, `Unsupported logical ${node.operator}`);
      }
    }

    case "ConditionalExpression": {
      const t = estreeToJsonConst(node.test, opts);
      if (t === undefined)
        return failOrUndef(opts, "Conditional test not constant");
      const branch = truthy(t) ? node.consequent : node.alternate;
      return estreeToJsonConst(branch, opts);
    }

    case "TemplateLiteral": {
      let s = "";
      for (let i = 0; i < node.quasis.length; i++) {
        s += node.quasis[i].value.cooked ?? node.quasis[i].value.raw ?? "";
        if (i < node.expressions.length) {
          const v = estreeToJsonConst(node.expressions[i], opts);
          if (v === undefined)
            return failOrUndef(opts, "Template expr not constant");
          s += String(v);
        }
      }
      return s;
    }

    case "Identifier": {
      switch (node.name) {
        case "undefined":
          return opts.normalizeUndefinedToNull
            ? null
            : failOrUndef(opts, "undefined not JSON");
        case "null":
          return null;
        case "true":
          return true;
        case "false":
          return false;
        default:
          return failOrUndef(opts, `Identifier ${node.name} not constant`);
      }
    }

    case "ParenthesizedExpression":
      return estreeToJsonConst(node.expression, opts);

    case "ChainExpression":
      return estreeToJsonConst(node.expression, opts);

    // Disallowed / dynamic forms:
    case "CallExpression":
    case "NewExpression":
    case "MemberExpression":
    case "ArrowFunctionExpression":
    case "FunctionExpression":
    case "ThisExpression":
    case "AwaitExpression":
    case "YieldExpression":
    case "UpdateExpression":
    case "AssignmentExpression":
      return failOrUndef(opts, `Unsupported/dynamic node ${node.type}`);

    default:
      return failOrUndef(opts, `Unknown node ${node.type}`);
  }
}

// ----------------------- MDX JSX → { type, ...props } -----------------------
/**
 * Extracts constant JSON props from mdxJsxFlowElement/mdxJsxTextElement.
 * - Constant expressions and constant spreads are recursively folded via estreeToJsonConst.
 * - String attributes and boolean shorthand are supported.
 * - Non-constant attributes are omitted (or cause throw if options.strict=true).
 */
export function mdxJsxNodeToJsonProps(
  node: any,
  options?: EstreeToJsonOptions,
): { type: string } & Record<string, Json> {
  const opts = { ...DEFAULT_OPTS, ...(options ?? {}) };
  const out: Record<string, Json> = { type: node.name || "" };

  for (const attr of node.attributes ?? []) {
    // <X disabled />
    if (attr.type === "mdxJsxAttribute" && attr.value == null) {
      out[attr.name] = true;
      continue;
    }

    // <X title="hello" />
    if (attr.type === "mdxJsxAttribute" && typeof attr.value === "string") {
      out[attr.name] = attr.value;
      continue;
    }

    // <X num={123} obj={{a:1}} arr={[1,2]} s={"tos"} />
    if (
      attr.type === "mdxJsxAttribute" &&
      attr.value?.type === "mdxJsxAttributeValueExpression"
    ) {
      const expr = attr.value.data?.estree?.body?.[0]?.expression;
      const v = estreeToJsonConst(expr, opts);
      if (v !== undefined) {
        out[attr.name] = v;
      } else if (opts.strict) {
        throw new Error(`Non-constant attribute: ${attr.name}`);
      }
      continue;
    }

    // <X {...{a: 1, b: [1,2]}} />
    if (attr.type === "mdxJsxExpressionAttribute") {
      const expr = attr.data?.estree?.body?.[0]?.expression;
      const v = estreeToJsonConst(expr, opts);
      if (v && typeof v === "object" && !Array.isArray(v)) {
        Object.assign(out, v as Record<string, Json>);
      } else if (v === undefined && opts.strict) {
        throw new Error("Non-constant spread attribute");
      }
      // (no unnecessary continue)
    }
  }

  return out as any;
}
