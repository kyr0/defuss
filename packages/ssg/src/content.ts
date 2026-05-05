import { readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";

import fastGlob from "fast-glob";
import toml from "toml";
import { parse as parseYaml } from "yaml";

import { filePathToRoute } from "./path.js";
import type { ContentEntry, ContentGlobOptions, SsgConfig } from "./types.js";

const PAGE_ROUTE_EXTENSIONS = new Set([".html", ".md", ".mdx"]);

const normalizePath = (value: string): string => value.replace(/\\/g, "/");

const coerceMeta = (value: unknown): Record<string, unknown> => {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}

	return {};
};

const parseFrontmatter = (
	source: string,
	filePath: string,
): Record<string, unknown> => {
	const normalizedSource = source.replace(/^\uFEFF/, "");
	const yamlMatch = normalizedSource.match(
		/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
	);

	if (yamlMatch) {
		try {
			return coerceMeta(parseYaml(yamlMatch[1]));
		} catch (error) {
			throw new Error(
				`Failed to parse YAML frontmatter in ${filePath}: ${(error as Error).message}`,
			);
		}
	}

	const tomlMatch = normalizedSource.match(
		/^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+(?:\r?\n|$)/,
	);

	if (tomlMatch) {
		try {
			return coerceMeta(toml.parse(tomlMatch[1]));
		} catch (error) {
			throw new Error(
				`Failed to parse TOML frontmatter in ${filePath}: ${(error as Error).message}`,
			);
		}
	}

	return {};
};

const stripSlugSuffix = (value: string): string => {
	let normalized = value.replace(/\.(mdx?|html?)$/i, "");

	if (normalized === "index") {
		return "";
	}

	if (normalized.endsWith("/index")) {
		normalized = normalized.slice(0, -"/index".length);
	}

	return normalized;
};

const isWithinDirectory = (filePath: string, directory: string): boolean => {
	const relativePath = normalizePath(relative(directory, filePath));
	return relativePath.length > 0 && !relativePath.startsWith("../");
};

const resolveRouteInfo = (
	filePath: string,
	cwd: string,
	pagesDir: string,
): Pick<ContentEntry, "route" | "slug"> => {
	const relativePath = normalizePath(relative(cwd, filePath));
	const slug = stripSlugSuffix(relativePath);
	const pagesRoot = resolve(cwd, pagesDir);
	const extension = extname(filePath).toLowerCase();

	if (
		!PAGE_ROUTE_EXTENSIONS.has(extension) ||
		!isWithinDirectory(filePath, pagesRoot)
	) {
		return {
			route: undefined,
			slug,
		};
	}

	const routeConfig = {
		pages: pagesDir,
		components: "components",
		assets: "assets",
	} as SsgConfig;
	const route = filePathToRoute(filePath, routeConfig, cwd);

	return {
		route,
		slug: route.replace(/^\//, ""),
	};
};

export const glob = async (
	patterns: string | string[],
	options: ContentGlobOptions = {},
): Promise<ContentEntry[]> => {
	const cwd = resolve(options.cwd ?? process.cwd());
	const pagesDir = options.pagesDir ?? "pages";
	const matchedFiles = await fastGlob(patterns, {
		absolute: true,
		cwd,
		ignore: options.ignore,
		onlyFiles: true,
		unique: true,
	});

	const entries = await Promise.all(
		matchedFiles
			.map((filePath) => resolve(filePath))
			.sort((left, right) => left.localeCompare(right))
			.map(async (filePath) => {
				const source = await readFile(filePath, "utf8");
				const relativePath = normalizePath(relative(cwd, filePath));
				const { route, slug } = resolveRouteInfo(filePath, cwd, pagesDir);

				return {
					filePath: normalizePath(filePath),
					relativePath,
					route,
					slug,
					meta: parseFrontmatter(source, filePath),
				} satisfies ContentEntry;
			}),
	);

	return entries.sort((left, right) =>
		left.relativePath.localeCompare(right.relativePath),
	);
};