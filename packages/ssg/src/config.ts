import { join, resolve } from "node:path";
import type { SsgConfig } from "./types.js";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { build as rolldownBuild } from "rolldown";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkFrontmatter from "remark-frontmatter";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
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

const resolveConfigPath = (projectDir: string): string | null => {
	for (const candidate of ["config.ts", "config.js"]) {
		const configPath = join(projectDir, candidate);
		if (existsSync(configPath)) {
			return configPath;
		}
	}

	return null;
};

const applyConfigDefaults = (config: SsgConfig): SsgConfig => {
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

type CompiledChunk = {
	type: "chunk";
	code: string;
	isEntry?: boolean;
};

const compileConfigModule = async (
	configPath: string,
	projectDir: string,
): Promise<string> => {
	const tsconfigPath = join(projectDir, "tsconfig.json");
	const result = await rolldownBuild({
		input: configPath,
		cwd: projectDir,
		platform: "node",
		tsconfig: existsSync(tsconfigPath) ? tsconfigPath : false,
		output: {
			format: "esm",
			sourcemap: false,
		},
	});
	const chunk = result.output.find(
		(output): output is CompiledChunk =>
			output.type === "chunk" && typeof output.code === "string",
	);

	if (!chunk) {
		throw new Error(`Failed to compile SSG config: ${configPath}`);
	}

	return chunk.code;
};

/**
 * Reads the SSG configuration from the project directory.
 * @param projectDir The path to the project directory.
 * @param debug Whether to enable debug logging.
 * @returns The SSG configuration.
 */
export const readConfig = async (
	projectDir: string,
	debug: boolean,
): Promise<SsgConfig> => {
	const resolvedProjectDir = resolve(projectDir);
	const configPath = resolveConfigPath(resolvedProjectDir);
	let config = {} as SsgConfig;

	if (configPath) {
		if (debug) {
			console.log(`Using config from ${configPath}`);
		}

		const code = await compileConfigModule(configPath, resolvedProjectDir);

		// Write to a temp file instead of a data URL to avoid Bun's NameTooLong error
		const tmpFile = join(tmpdir(), `defuss-ssg-config-${Date.now()}.mjs`);
		await writeFile(tmpFile, code, "utf-8");
		const module = await import(tmpFile);
		config = module.default;
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
	containerRuntime: undefined,
	viteConfig: {},
};
