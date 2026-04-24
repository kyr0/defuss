import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";

export default defineConfig({
  optimizeDeps: {
    exclude: [
      "onnxruntime-web",
      "onnxruntime-web/wasm",
      "onnxruntime-web/webgpu",
      "onnxruntime-common",
    ],
  },
  resolve: {
    alias: {
      "defuss-vad/tenvad": path.resolve(__dirname, "src/tenvad-web.ts"),
      "defuss-vad/tenvad-node": path.resolve(__dirname, "src/tenvad-node.ts"),
      "defuss-vad/tenvad-web": path.resolve(__dirname, "src/tenvad-web.ts"),
      "defuss-vad/firered": path.resolve(__dirname, "src/firered-web.ts"),
      "defuss-vad/firered-node": path.resolve(__dirname, "src/firered-node.ts"),
      "defuss-vad/firered-web": path.resolve(__dirname, "src/firered-web.ts"),
      "defuss-vad/firered-webgpu": path.resolve(__dirname, "src/firered-webgpu.ts"),
      "defuss-vad/silero": path.resolve(__dirname, "src/silero-web.ts"),
      "defuss-vad/silero-node": path.resolve(__dirname, "src/silero-node.ts"),
      "defuss-vad/silero-web": path.resolve(__dirname, "src/silero-web.ts"),
      "defuss-vad/types": path.resolve(__dirname, "src/types.ts"),
      "defuss-vad/wav": path.resolve(__dirname, "src/wav.ts"),
    },
  },
  test: {
    include: ["test/*.browser.test.ts"],
    testTimeout: 120_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"],
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage/browser",
    },
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      headless: true,
    },
  },
});
