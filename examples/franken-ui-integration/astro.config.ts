import { defineConfig } from "astro/config";

// importing the defuss-astro integration
import defuss from "defuss-astro";

// importing the node adapter for SSR, preview mode
import node from "@astrojs/node";

// importing TailwindCSS and FrankenUI Vite plugins
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  // add the defuss integration to Astro
  integrations: [
    defuss({
      include: ["src/**/*.tsx"],
    }),
  ],

  vite: {
    ssr: {
      noExternal: ["astro"],
    },
    plugins: [
      tailwindcss() as any
    ],
  },

  // the node adapter allows for server-side rendering and preview mode
  adapter: node({
    mode: "standalone",
  }),
});
