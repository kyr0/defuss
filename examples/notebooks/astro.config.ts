import { defineConfig } from "astro/config";

// importing the defuss-astro integration
import defuss from "defuss-astro";

// importing the node adapter for SSR, preview mode
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  // add the defuss integration to Astro
  integrations: [
    defuss({
      include: ["src/**/*.tsx"],
    }),
  ],

  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },

  vite: {
    ssr: {
      noExternal: ["astro"],
    },
  },

  // the node adapter allows for server-side rendering and preview mode
  adapter: node({
    mode: "standalone",
  }),
});
