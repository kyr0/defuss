import { defineConfig } from "vitest/config";
import defuss from "defuss-vite";
import { defussRpc } from "defuss-rpc/vite-plugin.js";
import { ChatApi } from "./src/api/chat.js";
import { playwright } from "@vitest/browser-playwright";
import type { Plugin } from "vite";

export default defineConfig({
  plugins: [
    defuss() as Plugin,
    defussRpc({
      api: { ChatApi },
      port: 0,
      watch: ["src/api/**/*.ts"],
    }) as Plugin,
  ],
  test: {
    name: "rpc-chat-streaming",
    include: ["test/**/*.test.ts"],
    browser: {
      enabled: true,
      provider: playwright() as any,
      instances: [{ browser: "chromium" }],
      headless: true,
    },
    testTimeout: 30000,
    hookTimeout: 15000,
  },
});
