import { defineConfig, type Plugin } from "vite";
import defuss from "defuss-vite";
import { defussRpc } from "defuss-rpc/vite-plugin.js";
import { FileUploadApi } from "./src/api/file-upload.js";

export default defineConfig({
  plugins: [
    defuss() as Plugin,
    defussRpc({
      api: { FileUploadApi },
      port: 0,
      watch: ["src/api/**/*.ts"],
    }) as Plugin,
  ],
});
