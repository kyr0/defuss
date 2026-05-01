import mdx from "@mdx-js/rollup";
import { createServer } from "vite";
import defuss from "defuss-vite";

import type { DevOptions, Status } from "./types.js";
import { readConfig } from "./config.js";
import { validateProjectDir } from "./validation.js";
import { defussSsg } from "./vite.js";

/**
 * Start the Vite-backed development server for defuss-ssg.
 * Uses Vite's transform pipeline for true HMR — MDX files are
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

	// Read config early to pass MDX plugins to the main Vite server
	const config = await readConfig(projectDir, debug);

	const server = await createServer({
		root: projectDir,
		configFile: false,
		appType: "custom",
		server: {
			host,
			port,
			watch: {
				ignored: [
					"**/node_modules/**",
					"**/dist/**",
					"**/.ssg-temp/**",
					"**/.endpoints/**",
					"**/.rpc/**",
				],
			},
		},
		plugins: [
			defuss({ enableJsxDevMode: true }),
			mdx({
				jsxImportSource: "defuss",
				development: true,
				remarkPlugins: config.remarkPlugins,
				rehypePlugins: config.rehypePlugins,
			}),
			...defussSsg({
				projectDir,
				debug,
				writeDevOutput,
			}),
		],
	});

	await server.listen(port);
	server.printUrls();

	return {
		code: "OK",
		message: `Vite dev server running for ${projectDir}`,
	};
};
