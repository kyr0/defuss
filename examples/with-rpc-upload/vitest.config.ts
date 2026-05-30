import { defineConfig, type Plugin } from "vitest/config";
import defuss from "defuss-vite";
import { defussRpc } from "defuss-rpc/vite-plugin.js";

// Side-effect import: registers the "file-upload" handler via addUploadHandler()
import "./src/api/file-upload.js";

export default defineConfig({
  plugins: [
    defuss() as Plugin,
    defussRpc({
      api: {},
      port: 0,
      compression: false,
      watch: [],
    }) as Plugin,
  ],
  test: {
    name: "rpc-upload",
    include: ["test/**/*.test.ts"],
    testTimeout: 60000,
    hookTimeout: 15000,
  },
});
