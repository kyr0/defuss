import { defineConfig } from "vite";
import { crx, defineManifest } from "@crxjs/vite-plugin";
import manifestJson from "./manifest.json";
import sourcemaps from "rollup-plugin-sourcemaps";
import defuss from "defuss-vite";
import tailwindcss from "@tailwindcss/vite";

const manifest = defineManifest(manifestJson);

export default defineConfig({
  build: {
    modulePreload: { polyfill: false },
    minify: false,
    rollupOptions: {
      treeshake: false,
      plugins: [
        sourcemaps({
          include: "node_modules/**",
        }),
        {
          name: "worker-window-shim",
          renderChunk(code, chunk) {
            // Service workers don't have `window`; Vite's preload helper uses it
            if (chunk.fileName.includes("worker")) {
              return code.replace(/\bwindow\b/g, "globalThis");
            }
          },
        },
      ],
    },
    sourcemap: "inline",
  },
  plugins: [defuss(), tailwindcss(), crx({ manifest })],
});
