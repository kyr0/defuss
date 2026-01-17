import { defineConfig, type Plugin } from "vite";

// import the defuss plugin, (not relevant to WASM use-cases, just for JSX to work)
import defuss from "defuss-vite";

export default defineConfig({
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
  // the plugin needs to be integrated so that the transpilation works
  plugins: [defuss() as Plugin],
});
