import { defineConfig } from "vitest/config";
import defuss from "defuss-vite";
import { defussRpc } from "defuss-rpc/vite-plugin.js";
import { playwright } from "@vitest/browser-playwright";
import type { Plugin } from "vite";
import RpcApi from "./src/rpc.js";

export default defineConfig({
  plugins: [
    defuss() as Plugin,
    defussRpc({
      api: RpcApi,
      port: 0,
      watch: ["src/rpc/**/*.ts", "src/lib/**/*.ts", "src/models/**/*.ts"],
    }) as Plugin,
  ],
  test: {
    name: "with-shadcn-admin",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      headless: true,
    },
    testTimeout: 30000,
    hookTimeout: 10000,
  },
});
