import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";
import { readFileSync } from "node:fs";

function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    result[key] = value;
  }
  return result;
}

const envFile = path.resolve(__dirname, ".env");
let env: Record<string, string> = {};
try {
  env = parseEnv(readFileSync(envFile, "utf-8"));
} catch {
  // .env not found, use defaults
}

export default defineConfig({
  resolve: {
    alias: {
      "defuss-openai": path.resolve(__dirname, "src/index.ts"),
      "defuss-env": path.resolve(__dirname, "test/defuss-env-browser-stub.ts"),
    },
  },
  define: {
    __BROWSER_ENV__: JSON.stringify({
      OPENAI_BASE_URL: env.OPENAI_BASE_URL || "http://127.0.0.1:8430/v1",
      OPENAI_MODEL: env.OPENAI_MODEL || "kyr0/zaya1-base-8b-4bit-MLX",
      OPENAI_API_KEY: env.OPENAI_API_KEY || "",
    }),
  },
  test: {
    include: ["test/e2e.browser.test.ts"],
    testTimeout: 120_000,
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      headless: true,
    },
  },
});
