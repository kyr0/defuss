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
      jsonSizeLimit: "50mb",
      watch: ["src/rpc/**/*.ts", "src/lib/**/*.ts"],
    }),
  ],
  vite: {
    ssr: {
      noExternal: ["astro"],
      external: ["ultimate-express", "defuss-rpc", "pdf-to-img", "defuss-env"],
    },
    build: {
      rollupOptions: {
        external: ["ultimate-express", "defuss-rpc", "pdf-to-img", "defuss-env"],
      },
    },
    plugins: [tailwindcss() as any],
  },
  adapter: node({
    mode: "standalone",
  }),
});
