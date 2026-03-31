import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";
import defuss from "defuss-astro";

export default defineConfig({
  integrations: [
    defuss({
      include: ["src/**/*.tsx"],
    }),
  ],
  vite: {
    ssr: {
      noExternal: ["astro"],
    },
    plugins: [tailwindcss() as any],
  },
  adapter: node({
    mode: "standalone",
  }),
});
