import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { PluginOption, ViteDevServer } from "vite";

export const CONTENT_MODULE_ID = "virtual:defuss-ssg/content";
export const CONTENT_RESOLVED_ID = "\0virtual:defuss-ssg/content";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const resolveContentHelperFile = (): string => {
	const candidates = [
		join(__dirname, "content.ts"),
		join(__dirname, "..", "src", "content.ts"),
		join(__dirname, "content.mjs"),
	];

	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	return resolve(__dirname, "content.mjs");
};

type ResolvedValue<T> = T | (() => T);

const resolveValue = <T>(value: ResolvedValue<T>): T =>
	typeof value === "function" ? (value as () => T)() : value;

export interface DefussSsgContentModuleOptions {
	projectDir: ResolvedValue<string>;
	pagesDir: ResolvedValue<string>;
}

export const createContentModulePlugin = ({
	projectDir,
	pagesDir,
}: DefussSsgContentModuleOptions): PluginOption => ({
	name: "vite:defuss-ssg-content",
	enforce: "pre",
	resolveId(id) {
		if (id === CONTENT_MODULE_ID) {
			return CONTENT_RESOLVED_ID;
		}

		return null;
	},
	load(id) {
		if (id !== CONTENT_RESOLVED_ID) {
			return null;
		}

		const helperFilePath = resolveContentHelperFile();
		const resolvedProjectDir = resolve(resolveValue(projectDir));
		const resolvedPagesDir = resolveValue(pagesDir);

		return [
			`import { glob as rawGlob } from ${JSON.stringify(helperFilePath)};`,
			`const defaultOptions = { cwd: ${JSON.stringify(resolvedProjectDir)}, pagesDir: ${JSON.stringify(resolvedPagesDir)} };`,
			"export const glob = (patterns, options = {}) => rawGlob(patterns, { ...defaultOptions, ...options });",
		].join("\n");
	},
});

export const invalidateContentModule = (
	server: ViteDevServer,
	timestamp: number,
): void => {
	for (const environment of Object.values(server.environments)) {
		const module = environment.moduleGraph.getModuleById(CONTENT_RESOLVED_ID);
		if (!module) {
			continue;
		}

		environment.moduleGraph.invalidateModule(
			module,
			new Set(),
			timestamp,
			true,
		);
	}
};

export const hasContentModuleImporters = (
	server: ViteDevServer,
): boolean => {
	for (const environment of Object.values(server.environments)) {
		const module = environment.moduleGraph.getModuleById(CONTENT_RESOLVED_ID);
		if (module && module.importers.size > 0) {
			return true;
		}
	}

	return false;
};