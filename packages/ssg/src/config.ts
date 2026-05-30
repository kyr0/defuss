import { dirname, join, resolve } from "node:path";
import type { SsgConfig } from "./types.js";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { build as rolldownBuild, type Plugin as RolldownPlugin } from "rolldown";
import { pathToFileURL } from "node:url";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkFrontmatter from "remark-frontmatter";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { mergeConfig, type InlineConfig } from "vite";
import type { RehypePlugins, RemarkPlugins } from "./types.js";

const defaultRemarkPlugins: RemarkPlugins = [
	remarkParse,
	[remarkFrontmatter, ["yaml", "toml"]],
	[remarkMdxFrontmatter, { name: "meta" }],
	remarkGfm,
	remarkRehype,
	remarkMath,
];

const defaultRehypePlugins: RehypePlugins = [rehypeKatex, rehypeStringify];

export const SSG_CONFIG_MODULE_ID = "virtual:defuss-ssg/config";
const SSG_CONFIG_RESOLVED_ID = "\0virtual:defuss-ssg/config";
const BASE_VITE_CONFIG_MARKER = "__defussSsgBaseViteConfig";

export interface ReadConfigOptions {
	currentViteConfig?: InlineConfig;
}

export type VirtualConfigModuleState = {
	viteConfig: InlineConfig;
};

export type CompiledConfigModule = {
	entryFileName: string;
	outputFiles: Array<{
		fileName: string;
		type: "asset" | "chunk";
		content: string | Uint8Array;
		isEntry?: boolean;
	}>;
	stateKey: string;
};

export const resolveConfigPath = (projectDir: string): string | null => {
	for (const candidate of ["config.ts", "config.js"]) {
		const configPath = join(projectDir, candidate);
		if (existsSync(configPath)) {
			return configPath;
		}
	}

	return null;
};

export const applyConfigDefaults = (config: SsgConfig): SsgConfig => {
	config.pages = config.pages || configDefaults.pages;
	config.output = config.output || configDefaults.output;
	config.components = config.components || configDefaults.components;
	config.assets = config.assets || configDefaults.assets;
	config.plugins = config.plugins || configDefaults.plugins;
	config.tmp = config.tmp || configDefaults.tmp;
	config.remarkPlugins = config.remarkPlugins || configDefaults.remarkPlugins;
	config.rehypePlugins = config.rehypePlugins || configDefaults.rehypePlugins;
	config.rpc = config.rpc ?? configDefaults.rpc;
	config.containerRuntime =
		config.containerRuntime ?? configDefaults.containerRuntime;
	config.viteConfig = config.viteConfig ?? configDefaults.viteConfig;

	return config;
};

export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	if (value === null || typeof value !== "object") {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
};

export const cloneConfigValue = <T>(value: T): T => {
	if (Array.isArray(value)) {
		return value.map((entry) => cloneConfigValue(entry)) as T;
	}

	if (isPlainObject(value)) {
		const clone: Record<string, unknown> = {};
		for (const [key, entry] of Object.entries(value)) {
			clone[key] = cloneConfigValue(entry);
		}

		return clone as T;
	}

	return value;
};

export const createTaggedBaseViteConfig = (
	viteConfig: InlineConfig = {},
): InlineConfig => {
	const taggedConfig = cloneConfigValue(viteConfig) as InlineConfig &
		Record<string, unknown>;
	taggedConfig[BASE_VITE_CONFIG_MARKER] = true;
	return taggedConfig;
};

export const isTaggedBaseViteConfig = (
	viteConfig: unknown,
): viteConfig is InlineConfig & Record<string, unknown> =>
	isPlainObject(viteConfig) && viteConfig[BASE_VITE_CONFIG_MARKER] === true;

export const stripBaseViteConfigMarker = (viteConfig: InlineConfig): InlineConfig => {
	const strippedConfig = {
		...(viteConfig as Record<string, unknown>),
	} as Record<string, unknown>;
	delete strippedConfig[BASE_VITE_CONFIG_MARKER];
	return strippedConfig as InlineConfig;
};

export const setVirtualConfigModuleState = (
	stateKey: string,
	state: VirtualConfigModuleState,
): void => {
	(globalThis as Record<string, unknown>)[stateKey] = state;
};

export const clearVirtualConfigModuleState = (stateKey: string): void => {
	delete (globalThis as Record<string, unknown>)[stateKey];
};

export const createConfigModuleStateKey = (): string =>
	`__defussSsgConfigModule_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export const createConfigModulePlugin = (stateKey: string): RolldownPlugin => ({
	name: "rolldown:defuss-ssg-config",
	resolveId(id) {
		if (id === SSG_CONFIG_MODULE_ID) {
			return SSG_CONFIG_RESOLVED_ID;
		}

		return null;
	},
	load(id) {
		if (id !== SSG_CONFIG_RESOLVED_ID) {
			return null;
		}

		return [
			`const moduleState = globalThis[${JSON.stringify(stateKey)}];`,
			"if (!moduleState) {",
			'\tthrow new Error("Missing defuss-ssg config virtual module state");',
			"}",
			"export const viteConfig = moduleState.viteConfig;",
			"export default viteConfig;",
		].join("\n");
	},
});

export const isBareModuleId = (id: string): boolean =>
	!id.startsWith(".") && !id.startsWith("/") && !id.startsWith("\0");

export const compileConfigModule = async (
	configPath: string,
	projectDir: string,
): Promise<CompiledConfigModule> => {
	const stateKey = createConfigModuleStateKey();
	setVirtualConfigModuleState(stateKey, {
		viteConfig: createTaggedBaseViteConfig(),
	});

	const tsconfigPath = join(projectDir, "tsconfig.json");

	try {
		const result = await rolldownBuild({
			input: configPath,
			cwd: projectDir,
			platform: "node",
			external: (id) => id !== SSG_CONFIG_MODULE_ID && isBareModuleId(id),
			tsconfig: existsSync(tsconfigPath) ? tsconfigPath : false,
			plugins: [createConfigModulePlugin(stateKey)],
			output: {
				format: "esm",
				sourcemap: false,
			},
		});
		const chunk = result.output.find(
			(output) => output.type === "chunk" && "code" in output,
		);

		if (!chunk) {
			throw new Error(`Failed to compile SSG config: ${configPath}`);
		}

		const outputFiles = result.output.map((output) => ({
			fileName: output.fileName,
			type: output.type,
			content:
				output.type === "chunk" && "code" in output ? output.code : output.source,
			isEntry: output.type === "chunk" ? output.isEntry === true : false,
		}));
		const entryOutputFile = outputFiles.find(
			(outputFile) => outputFile.type === "chunk" && outputFile.isEntry,
		) ?? outputFiles.find((outputFile) => outputFile.type === "chunk");

		if (!entryOutputFile) {
			throw new Error(`Failed to determine compiled SSG config entry: ${configPath}`);
		}

		return {
			entryFileName: entryOutputFile.fileName,
			outputFiles,
			stateKey,
		};
	} catch (error) {
		clearVirtualConfigModuleState(stateKey);
		throw error;
	}
};

export const loadCompiledConfigModule = async (
	compiledConfigModule: CompiledConfigModule,
	configPath: string,
	projectDir: string,
	currentViteConfig?: InlineConfig,
): Promise<SsgConfig> => {
	setVirtualConfigModuleState(compiledConfigModule.stateKey, {
		viteConfig: createTaggedBaseViteConfig(currentViteConfig),
	});

	const tempDir = await mkdtemp(join(projectDir, ".defuss-ssg-config-"));
	for (const outputFile of compiledConfigModule.outputFiles) {
		const targetFile = join(tempDir, outputFile.fileName);
		await mkdir(dirname(targetFile), { recursive: true });
		await writeFile(targetFile, outputFile.content);
	}

	try {
		const entryFilePath = join(tempDir, compiledConfigModule.entryFileName);
		const module = await import(pathToFileURL(entryFilePath).href);
		return module.default as SsgConfig;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Failed to load compiled SSG config from ${configPath}: ${message}`,
		);
	} finally {
		await rm(tempDir, { recursive: true, force: true });
		clearVirtualConfigModuleState(compiledConfigModule.stateKey);
	}
};

export const mergeUserViteConfig = (
	currentViteConfig: InlineConfig,
	userViteConfig?: InlineConfig,
): InlineConfig => {
	if (!userViteConfig) {
		return currentViteConfig;
	}

	if (isTaggedBaseViteConfig(userViteConfig)) {
		return stripBaseViteConfigMarker(userViteConfig);
	}

	return mergeConfig(currentViteConfig, userViteConfig);
};

/**
 * Reads the SSG configuration from the project directory.
 * @param projectDir The path to the project directory.
 * @param debug Whether to enable debug logging.
 * @param options Optional caller-specific loader options.
 * @returns The SSG configuration.
 */
export const readConfig = async (
	projectDir: string,
	debug: boolean,
	options: ReadConfigOptions = {},
): Promise<SsgConfig> => {
	const resolvedProjectDir = resolve(projectDir);
	const configPath = resolveConfigPath(resolvedProjectDir);
	let config = {} as SsgConfig;

	if (configPath) {
		if (debug) {
			console.log(`Using config from ${configPath}`);
		}

		const compiledConfigModule = await compileConfigModule(
			configPath,
			resolvedProjectDir,
		);
		config = await loadCompiledConfigModule(
			compiledConfigModule,
			configPath,
			resolvedProjectDir,
			options.currentViteConfig,
		);
	}

	return applyConfigDefaults(config);
};

export const configDefaults: SsgConfig = {
	pages: "pages",
	output: "dist",
	components: "components",
	assets: "assets",
	tmp: ".ssg-temp",
	plugins: [],
	remarkPlugins: defaultRemarkPlugins,
	rehypePlugins: defaultRehypePlugins,
	rpc: true,
	containerRuntime: "docker",
	viteConfig: {},
};
