import { defineConfig, type Plugin } from "vitest/config";
import defuss from "defuss-vite";
import { defussRpc } from "defuss-rpc/vite-plugin.js";
import { FileUploadApi } from "./src/api/file-upload.js";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  plugins: [
    defuss() as Plugin,
    defussRpc({
      api: { FileUploadApi },
      port: 0,
      watch: ["src/api/**/*.ts"],
    }) as Plugin,
  ],
  test: {
    name: "rpc-upload",
    include: ["test/**/*.test.ts"],
    browser: {
      enabled: true,
      provider: playwright() as any,
      instances: [{ browser: "chromium" }],
      headless: true,
    },
    testTimeout: 60000,
    hookTimeout: 15000,
  },
});
