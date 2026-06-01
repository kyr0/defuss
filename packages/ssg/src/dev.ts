import mdx from "@mdx-js/rollup";
import { createServer, type InlineConfig } from "vite";
import defuss from "defuss-vite";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DevOptions, Status } from "./types.js";
import { mergeUserViteConfig, readConfig } from "./config.js";
import { validateProjectDir } from "./validation.js";
import { defussSsg } from "./vite.js";

/**
 * Start the Vite-backed development server for defuss-ssg.
 * Uses Vite's transform pipeline for true HMR - MDX files are
 * transformed on-the-fly via ssrLoadModule, no temp servers needed.
 * Soft-reload uses Vite's built-in HMR WebSocket channel.
 */
export const dev = async ({
	projectDir,
	debug = false,
	host = true,
	port = 3000,
	writeDevOutput = true,
}: DevOptions): Promise<Status> => {
	const projectDirStatus = validateProjectDir(projectDir);
	if (projectDirStatus.code !== "OK") return projectDirStatus;

	// Resolve non-Vite settings first so the current Vite base can reflect them.
	const initialConfig = await readConfig(projectDir, debug);
	const currentViteConfig: InlineConfig = {
		root: projectDir,
		configFile: false,
		appType: "custom",
		server: {
			host,
			port,
			strictPort: false,
			watch: {
				ignored: [
					"**/node_modules/**",
					"**/dist/**",
					"**/.ssg-temp/**",
					"**/.endpoints/**",
					"**/.rpc/**",
					"**/.defuss-tauri/**",
				],
			},
		},
		plugins: [
			defuss({ enableJsxDevMode: true }),
			mdx({
				jsxImportSource: "defuss",
				development: true,
				remarkPlugins: initialConfig.remarkPlugins,
				rehypePlugins: initialConfig.rehypePlugins,
			}),
			...defussSsg({
				projectDir,
				debug,
				writeDevOutput,
			}),
		],
	};
	const config = await readConfig(projectDir, debug, {
		currentViteConfig,
	});

	const server = await createServer(
		mergeUserViteConfig(currentViteConfig, config.viteConfig),
	);

	await server.listen(port);
	
	// Write actual port to a file so Tauri can discover it
	const resolvedPort = server.httpServer?.address();
	const actualPort = typeof resolvedPort === "object" && resolvedPort ? resolvedPort.port : port;
	if (actualPort !== port) {
		console.log(`[defuss-ssg] port ${port} in use, using ${actualPort} instead`);
		try {
			writeFileSync(join(projectDir, ".defuss-port"), String(actualPort));
		} catch {
			// non-critical
		}
	}
	server.printUrls();

	return {
		code: "OK",
		message: `Vite dev server running for ${projectDir}`,
	};
};
