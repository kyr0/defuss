import { describe, it, expect, afterEach } from "vitest";
import {
  parse,
  load,
  getEnv,
  setEnv,
  isValidEnvKey,
  type EnvMap,
} from "./env.js";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), "env-tests-"));
  return {
    dir,
    write(name: string, content: string | Buffer) {
      const p = join(dir, name);
      writeFileSync(p, content);
      return p;
    },
    cleanup() {
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    },
  };
}

const FILE_CAP_BYTES = 256 * 1024; // mirror current impl
const VALUE_CAP_CHARS = 64 * 1024; // mirror current impl

// Helpers to snapshot/restore a small subset of process.env without copying everything.
function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const backup: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) {
    backup[k] = process.env[k];
    const v = vars[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(backup)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

describe("isValidEnvKey", () => {
  it("accepts POSIX-ish keys", () => {
    expect(isValidEnvKey("FOO")).toBe(true);
    expect(isValidEnvKey("_FOO")).toBe(true);
    expect(isValidEnvKey("A1_B2_C3")).toBe(true);
  });

  it("rejects invalid keys", () => {
    expect(isValidEnvKey("1FOO")).toBe(false);
    expect(isValidEnvKey("FOO-BAR")).toBe(false);
    expect(isValidEnvKey("FOO BAR")).toBe(false);
    expect(isValidEnvKey("FOO.BAR")).toBe(false);
    expect(isValidEnvKey("")).toBe(false);
  });
});

describe("parse", () => {
  it("handles empty string after BOM removal", () => {
    // Line 43-44: content.length check after BOM removal
    const content = "\uFEFF"; // BOM only
    const env = parse(content);
    expect(env).toEqual({});
  });

  it("handles quote state transitions in stripInlineComment", () => {
    // Line 50: Test the quote state logic in stripInlineComment
    const content = `FOO='"mixed quotes"'#comment`;
    const env = parse(content);
    expect(env.FOO).toBe('"mixed quotes"');
  });

  it("handles lines that become empty after stripping comments", () => {
    // Line 103: logical check after stripInlineComment
    const content = `
      # full comment line
      FOO=  # comment only, no value
      BAR=value
    `;
    const env = parse(content);
    expect(env).toEqual({ BAR: "value" });
  });

  it("parses unquoted values and strips inline comments", () => {
    const content = `
      FOO=bar   # a comment
      BAR=baz#comment
      # full line comment
      BAZ=qux
    `;
    const env = parse(content);
    expect(env).toEqual<EnvMap>({
      FOO: "bar",
      BAR: "baz",
      BAZ: "qux",
    });
  });

  it("respects quoted '#' and '=' in values", () => {
    const content = `
      A="has # hash and = equals"
      B='also # hash = equals'
      C="https://example.com?a=b&c=d=e#frag"
      D=https://example.com?a=b&c=d=e#frag
    `;
    const env = parse(content);
    expect(env.A).toBe("has # hash and = equals");
    // In single quotes, everything is literal, including the double quote inside.
    expect(env.B).toBe("also # hash = equals");
    expect(env.C).toBe("https://example.com?a=b&c=d=e#frag");
    expect(env.D).toBe("https://example.com?a=b&c=d=e");
  });

  it("supports export prefix", () => {
    const content = `
      export HELLO=world
      export FOO="bar baz"
    `;
    const env = parse(content);
    expect(env.HELLO).toBe("world");
    expect(env.FOO).toBe("bar baz");
  });

  it("handles double-quoted escapes", () => {
    const content = String.raw`
      DQ="line1\nline2\r\n\tindent\"quote\\slash"
      SQ='line1\nline2\r\n\tindent\"quote\\slash'
    `;
    const env = parse(content);
    expect(env.DQ).toBe('line1\nline2\r\n\tindent"quote\\slash');
    // Single-quoted: no unescaping; content is literal.
    expect(env.SQ).toBe(String.raw`line1\nline2\r\n\tindent\"quote\\slash`);
  });

  it("ignores invalid keys and lines without '='", () => {
    const content = `
      1BAD=value
      ALSO.BAD=123
      JUSTTEXT
      _OK=1
      OK2=2
    `;
    const env = parse(content);
    expect(env).toEqual({ _OK: "1", OK2: "2" });
  });

  it("supports CRLF and BOM", () => {
    const content = '\uFEFFFOO=bar\r\nBAR="baz"\r\n';
    const env = parse(content);
    expect(env.FOO).toBe("bar");
    expect(env.BAR).toBe("baz");
  });

  it("throws on value longer than cap", () => {
    const big = "x".repeat(VALUE_CAP_CHARS + 1);
    const content = `BIG=${big}`;
    expect(() => parse(content)).toThrow(/exceeds maximum length/i);
  });
});

describe("load", () => {
  it("loads from disk and does not inject by default", () => {
    const tmp = tempDir();
    try {
      const p = tmp.write("a.env", `FOO=bar\nBAR="baz"`);
      const snapshot = { FOO: undefined, BAR: undefined };
      withEnv(snapshot, () => {
        const env = load(p);
        expect(env.FOO).toBe("bar");
        expect(env.BAR).toBe("baz");
        // No injection by default
        expect(process.env.FOO).toBeUndefined();
        expect(process.env.BAR).toBeUndefined();
      });
    } finally {
      tmp.cleanup();
    }
  });

  it("injects when requested without overriding existing values", () => {
    const tmp = tempDir();
    try {
      const p = tmp.write("b.env", "X=from-file\nY=from-file");
      withEnv({ X: "existing", Y: undefined }, () => {
        const env = load(p, true /* inject */, false /* override */);
        expect(env.X).toBe("from-file");
        expect(env.Y).toBe("from-file");
        // X remains existing, Y injected
        expect(process.env.X).toBe("existing");
        expect(process.env.Y).toBe("from-file");
      });
    } finally {
      tmp.cleanup();
    }
  });

  it("injects with override=true", () => {
    const tmp = tempDir();
    try {
      const p = tmp.write("c.env", "X=from-file\nZ=zzz");
      withEnv({ X: "existing", Z: undefined }, () => {
        const env = load(p, true /* inject */, true /* override */);
        expect(env.X).toBe("from-file");
        expect(process.env.X).toBe("from-file");
        expect(process.env.Z).toBe("zzz");
      });
    } finally {
      tmp.cleanup();
    }
  });

  it("enforces file size cap", () => {
    const tmp = tempDir();
    try {
      const big = Buffer.alloc(FILE_CAP_BYTES + 1, 0x61); // 'a'
      const p = tmp.write("too-big.env", big);
      expect(() => load(p)).toThrow(/Refusing to read .*size .* > .* bytes/);
    } finally {
      tmp.cleanup();
    }
  });

  it("parses realistic mixed file", () => {
    const tmp = tempDir();
    try {
      const content = `
        # comment
        export HOST=localhost
        PORT=8080   # dev port
        URL="http://\${HOST}:${"PORT"}" # no expansion expected, keep literally
        PATH_PART='C:\\Program Files\\node' # literal
        NOTE=hello#world
        MIXED="a=b#c" # keep inside quotes
      `;
      const p = tmp.write("mixed.env", content);
      const env = load(p);
      expect(env.HOST).toBe("localhost");
      expect(env.PORT).toBe("8080");
      // No expansion: keep literal ${HOST}:${PORT}
      expect(env.URL).toBe(`http://\${HOST}:${"PORT"}`);
      expect(env.PATH_PART).toBe(String.raw`C:\Program Files\node`);
      expect(env.NOTE).toBe("hello");
      expect(env.MIXED).toBe("a=b#c");
    } finally {
      tmp.cleanup();
    }
  });
});

describe("getEnv / setEnv interaction", () => {
  // We cannot import _secrets (module private), but we can interact through setEnv().
  const UNIQUE = `TEST_KEY_${Math.random().toString(36).slice(2)}`;
  const OTHER = `TEST_KEY_${Math.random().toString(36).slice(2)}`;

  afterEach(() => {
    // ensure cleanliness
    delete (process.env as any)[UNIQUE];
    delete (process.env as any)[OTHER];
  });

  it("handles case when _secrets is null/undefined", () => {
    // Line 191: _secrets?.[name] optional chaining
    const TEMP_KEY = `TEMP_${Math.random().toString(36).slice(2)}`;

    // This is tricky since _secrets is private, but we can test the behavior
    // by ensuring getEnv works even in edge cases
    withEnv({ [TEMP_KEY]: "from-process" }, () => {
      expect(getEnv(TEMP_KEY)).toBe("from-process");
    });
  });

  it("returns undefined when no fallback provided", () => {
    // Test getEnv without fallback parameter
    const NONEXISTENT = `NONEXISTENT_${Math.random().toString(36).slice(2)}`;
    expect(getEnv(NONEXISTENT)).toBeUndefined();
  });

  it("initializes _secrets when it's null", () => {
    // Line 202: if (!_secrets) _secrets = {};
    // This tests the initialization path of _secrets
    const TEST_KEY = `INIT_TEST_${Math.random().toString(36).slice(2)}`;

    // Call setEnv which should initialize _secrets if needed
    setEnv(TEST_KEY, "test-value");
    expect(getEnv(TEST_KEY)).toBe("test-value");
  });

  it("prefers in-memory store over process.env, then fallback", () => {
    withEnv({ [UNIQUE]: undefined }, () => {
      // nothing set yet -> fallback returned
      expect(getEnv(UNIQUE, "fb")).toBe("fb");

      // process.env set -> read from process.env
      process.env[UNIQUE] = "env";
      expect(getEnv(UNIQUE, "fb")).toBe("env");

      // in-memory set -> overrides process.env
      setEnv(UNIQUE, "mem");
      expect(getEnv(UNIQUE, "fb")).toBe("mem");
    });
  });

  it("setEnv does not mutate process.env", () => {
    withEnv({ [OTHER]: undefined }, () => {
      setEnv(OTHER, "mem-only");
      expect(process.env[OTHER]).toBeUndefined();
      expect(getEnv(OTHER)).toBe("mem-only");
    });
  });
});

describe("edge cases and error conditions", () => {
  it("handles malformed quote combinations", () => {
    // Test quote handling edge cases
    const content = `
      UNMATCHED="unclosed quote
      MIXED='single"double'
      EMPTY=""
      EMPTY_SINGLE=''
    `;
    const env = parse(content);
    expect(env.MIXED).toBe('single"double');
    expect(env.EMPTY).toBe("");
    expect(env.EMPTY_SINGLE).toBe("");
  });

  it("handles values with only whitespace", () => {
    const content = `SPACES="   "\nTABS="\\t\\t"\nMIXED=" \\t \\n "`;
    const env = parse(content);
    expect(env.SPACES).toBe("   ");
    expect(env.TABS).toBe("\t\t");
    expect(env.MIXED).toBe(" \t \n ");
  });

  it("handles export with only key, no value", () => {
    const content = `
      export JUST_KEY
      export VALID_KEY=value
    `;
    const env = parse(content);
    expect(env.VALID_KEY).toBe("value");
    expect(env.JUST_KEY).toBeUndefined();
  });
});
