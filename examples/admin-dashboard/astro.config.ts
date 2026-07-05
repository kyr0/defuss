import { defineConfig } from "astro/config";
import defuss from "defuss-astro";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";
import { defussRpc } from "defuss-rpc/astro.js";
import RpcApi from "./src/rpc.js";

export default defineConfig({
  integrations: [
    defuss({
      include: ["src/**/*.tsx"],
    }),
    defussRpc({
      api: RpcApi,
      port: 0,
      watch: ["src/rpc/**/*.ts", "src/lib/**/*.ts", "src/models/**/*.ts"],
    }),
  ],
  vite: {
    ssr: {
      noExternal: ["astro"],
      // defuss-rpc's Astro middleware entrypoint is bundled by Astro, which
      // pulls in defuss-express -> ultimate-express. ultimate-express ships
      // CJS that uses `function static(...)` (valid in sloppy mode only), and
      // Vite 8's oxc parser rejects it in strict mode. Externalize the whole
      // chain so rolldown never parses ultimate-express during the build.
      external: ["ultimate-express", "defuss-express", "defuss-rpc"],
    },
    build: {
      rollupOptions: {
        external: [/^ultimate-express$/, /^defuss-express$/, /^defuss-rpc(?:\/.*)?$/],
      },
    },
    plugins: [tailwindcss() as any],
  },
  adapter: node({
    mode: "standalone",
  }),
});
