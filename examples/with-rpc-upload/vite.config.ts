import { defineConfig, type Plugin } from "vite";
import defuss from "defuss-vite";
import { defussRpc } from "defuss-rpc/vite-plugin.js";
import tailwindcss from "@tailwindcss/vite";

// Side-effect import: registers the "file-upload" handler via addUploadHandler()
import "./src/api/file-upload.js";

export default defineConfig({
	plugins: [
		tailwindcss() as Plugin,
		defuss() as Plugin,
		defussRpc({
			api: {},
			port: 0,
			watch: ["src/api/**/*.ts"],
		}) as Plugin,
	],
});
