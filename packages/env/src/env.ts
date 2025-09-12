import { readFileSync } from "node:fs";

/** Hard cap for .env file size (bytes). */
const MAX_FILE_BYTES = 256 * 1024; // 256 KiB
/** Hard cap for a single value length (characters). */
const MAX_VALUE_CHARS = 64 * 1024; // 64 KiB-equivalent chars

/** Map of environment keys to string values. */
export type EnvMap = Record<string, string>;

/** Node guard (avoid accidental browser bundling execution). */
const isNode =
  typeof process !== "undefined" &&
  !!(process as any)?.versions?.node &&
  typeof readFileSync === "function";

/** Strict POSIX-ish env key format. */
export function isValidEnvKey(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

/** Remove an inline comment outside of quotes. */
function stripInlineComment(str: string): string {
  let i = 0;
  let inS = false;
  let inD = false;
  for (; i < str.length; i++) {
    const c = str[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === "#" && !inS && !inD) break;
  }
  return str.slice(0, i).trim();
}

/** Find the first unquoted '='; returns [key, value] or null. */
function splitKeyVal(str: string): [string, string] | null {
  let i = 0;
  let inS = false;
  let inD = false;
  for (; i < str.length; i++) {
    const c = str[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === "=" && !inS && !inD) break;
  }
  if (i <= 0 || i === str.length) return null;
  const key = str.slice(0, i).trim();
  const val = str.slice(i + 1).trim();
  return key ? [key, val] : null;
}

/** Unescape common sequences for double-quoted values. */
function unescapeDoubleQuoted(v: string): string {
  return v
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

// ------------------------------- API ------------------------------------

/**
 * Parse a .env file **content** into a key/value map.
 *
 * Supported syntax:
 * - Optional leading `export `.
 * - Inline comments (`# ...`) outside of quotes.
 * - `KEY=VALUE` with strict keys: `/^[A-Za-z_][A-Za-z0-9_]*$/`.
 * - Values can be:
 *   - unquoted: parsed as-is after trimming (comment removed if outside quotes).
 *   - single-quoted: content taken literally (no escapes).
 *   - double-quoted: supports `\n \r \t \" \\` escapes.
 *
 * Not supported by design: variable expansion, multiline values, here-docs, arrays.
 *
 * Enforces a hard cap on individual value length (`MAX_VALUE_CHARS`).
 *
 * @param content Raw text (e.g., from fs.readFileSync).
 * @returns Parsed key/value map.
 * @throws  If a value exceeds size cap.
 */
export function parse(content: string): EnvMap {
  // Strip BOM and normalize newlines
  if (content.length && content.charCodeAt(0) === 0xfeff)
    content = content.slice(1);
  const lines = content.split(/\r?\n/);

  const env: EnvMap = {};
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // allow optional "export "
    const noExport = trimmed.startsWith("export ")
      ? trimmed.slice(7).trim()
      : trimmed;

    // drop inline comment (outside quotes)
    const logical = stripInlineComment(noExport);
    if (!logical) continue;

    const kv = splitKeyVal(logical);
    if (!kv) continue;

    const [k0, rawV0] = kv;
    const key = k0.trim();
    if (!isValidEnvKey(key)) continue; // strict: ignore invalid keys

    let v = rawV0;

    // strip symmetric single or double quotes
    let isDQ = false;
    if (
      v.length >= 2 &&
      v[0] === v[v.length - 1] &&
      (v[0] === '"' || v[0] === "'")
    ) {
      isDQ = v[0] === '"';
      v = v.slice(1, -1);
      if (isDQ) v = unescapeDoubleQuoted(v);
    }

    // Skip entries with empty values (after comment stripping and quote processing)
    if (v === "" && rawV0.trim() === "") continue;

    if (v.length > MAX_VALUE_CHARS) {
      throw new Error(
        `Value for ${key} exceeds maximum length of ${MAX_VALUE_CHARS} characters`,
      );
    }

    env[key] = v;
  }

  return env;
}

/**
 * Load and parse a .env file from disk **synchronously**.
 *
 * Safety characteristics:
 * - Fails if file exceeds `MAX_FILE_BYTES`.
 * - Does **not** mutate `process.env` unless `inject` is true.
 * - When injecting, does **not** override existing variables unless `override` is true.
 *
 * @param filePath Path to the .env file. Default: ".env".
 * @param inject   If true, write parsed values into `process.env`. Default: true.
 * @param override If true, allow overwriting existing `process.env` values. Default: true.
 * @returns        Parsed key/value map.
 * @throws         If not in Node, file too large, or value exceeds size cap.
 */
export function load(
  filePath = ".env",
  inject = true,
  override = true,
): EnvMap {
  if (!isNode) throw new Error("Env loader must run on Node.js (server-only).");

  const buf = readFileSync(filePath);
  if (buf.byteLength > MAX_FILE_BYTES) {
    throw new Error(
      `Refusing to read ${filePath}: size ${buf.byteLength} > ${MAX_FILE_BYTES} bytes`,
    );
  }

  const env = parse(buf.toString("utf-8"));

  if (inject) {
    for (const [k, v] of Object.entries(env)) {
      if (!override && process.env[k] !== undefined) continue;
      process.env[k] = v;
    }
  }

  return env;
}

/** Private, in-memory key/value store (not persisted). */
let _secrets: EnvMap = {};

/**
 * Retrieve a variable by checking (1) in-memory store, then (2) `process.env`,
 * falling back to `fallback` if not found.
 *
 * @param name     Variable name.
 * @param fallback Optional fallback value.
 * @returns        The value or `undefined` if missing and no fallback provided.
 */
export function getEnv(name: string, fallback?: string): string | undefined {
  return (
    _secrets?.[name] ?? (isNode ? process.env[name] : undefined) ?? fallback
  );
}

/**
 * Set/override a variable **only** in the in-memory store (does not touch `process.env`).
 *
 * @param name  Variable name.
 * @param value Value to store.
 */
export function setEnv(name: string, value: string): void {
  if (!_secrets) _secrets = {};
  _secrets[name] = value;
}
