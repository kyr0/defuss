import { defineConfig } from "astro/config";

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// importing the defuss-astro integration
import defuss from "defuss-astro";

// importing the node adapter for SSR, preview mode
import node from "@astrojs/node";
import { writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  // add the defuss integration to Astro
  integrations: [
    defuss({
      include: ["src/**/*.tsx"],
    }),
    {
      name: "astro-bootstrap",
      hooks: {
        "astro:build:start": () => {
          const photos = Object.values(
            import.meta.glob("./public/photos/**/*.(jpg|png|tiff)", {
              eager: true,
            }),
          ).map((photo: { default: string }) =>
            photo.default.replace("/public", ""),
          );

          writeFileSync(
            resolve(__dirname, "public/photos.json"),
            JSON.stringify(photos, null, 2),
          );
        },
      },
    },
  ],

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
