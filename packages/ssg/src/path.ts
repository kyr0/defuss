import { existsSync } from "node:fs";
import { extname, join, relative } from "node:path";
import type { SsgConfig } from "./types.js";

const DEFAULT_PAGES_DIR = "pages";
const DEFAULT_COMPONENTS_DIR = "components";
const DEFAULT_ASSETS_DIR = "assets";
const COMPONENTS_SOURCE_ALIASES = [DEFAULT_COMPONENTS_DIR, "csr"];
const PAGE_SOURCE_EXTENSIONS = [".mdx", ".md", ".html"] as const;

const normalizePath = (filePath: string): string => filePath.replace(/\\/g, "/");

const isDefaultPath = (value: string, defaultValue: string): boolean =>
	normalizePath(value) === defaultValue;

const createSourceDirCandidates = (
	candidates: string[],
): string[] => {
	const normalizedCandidates = candidates.map((candidate) => normalizePath(candidate));
	const sourceCandidates = normalizedCandidates.map((candidate) =>
		normalizePath(join("src", candidate)),
	);

	return [...new Set([...sourceCandidates, ...normalizedCandidates])];
};

const resolveSourceDir = (
	projectDir: string,
	candidates: string[],
	fallback: string,
): string => {
	for (const candidate of candidates) {
		if (existsSync(join(projectDir, candidate))) {
			return candidate;
		}
	}

	return normalizePath(fallback);
};

const getPageSourceExtensionPriority = (filePath: string): number => {
	const extension = extname(filePath).toLowerCase();
	const index = PAGE_SOURCE_EXTENSIONS.indexOf(
		extension as (typeof PAGE_SOURCE_EXTENSIONS)[number],
	);

	return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

const outputPathToSourceCandidates = (
	pageSourceRootDir: string,
	relativeOutputHtmlFilePath: string,
): string[] => {
	const sourceStem = normalizePath(relativeOutputHtmlFilePath).replace(
		/\.html$/i,
		"",
	);

	return PAGE_SOURCE_EXTENSIONS.map((extension) =>
		join(pageSourceRootDir, `${sourceStem}${extension}`),
	);
};

export interface ResolvedSsgPaths {
	pagesSourceDir: string;
	pagesSourceDirAbsolute: string;
	pagesSourceDirCandidates: string[];
	hasPagesSourceDir: boolean;
	componentsSourceDir: string;
	componentsSourceDirAbsolute: string;
	componentsSourceDirCandidates: string[];
	hasComponentsSourceDir: boolean;
	componentsPublicDir: string;
	assetsSourceDir: string;
	assetsSourceDirAbsolute: string;
	assetsSourceDirCandidates: string[];
	hasAssetsSourceDir: boolean;
	assetsPublicDir: string;
}

export const resolveSsgPaths = (
	projectDir: string,
	config: SsgConfig,
): ResolvedSsgPaths => {
	const pagesSourceDirCandidates = isDefaultPath(config.pages, DEFAULT_PAGES_DIR)
		? createSourceDirCandidates([DEFAULT_PAGES_DIR])
		: [normalizePath(config.pages)];
	const componentsSourceDirCandidates = isDefaultPath(
		config.components,
		DEFAULT_COMPONENTS_DIR,
	)
		? createSourceDirCandidates(COMPONENTS_SOURCE_ALIASES)
		: [normalizePath(config.components)];
	const assetsSourceDirCandidates = isDefaultPath(config.assets, DEFAULT_ASSETS_DIR)
		? createSourceDirCandidates([DEFAULT_ASSETS_DIR])
		: [normalizePath(config.assets)];

	const pagesSourceDir = resolveSourceDir(
		projectDir,
		pagesSourceDirCandidates,
		pagesSourceDirCandidates[0] ?? DEFAULT_PAGES_DIR,
	);
	const componentsSourceDir = resolveSourceDir(
		projectDir,
		componentsSourceDirCandidates,
		componentsSourceDirCandidates[0] ?? DEFAULT_COMPONENTS_DIR,
	);
	const assetsSourceDir = resolveSourceDir(
		projectDir,
		assetsSourceDirCandidates,
		assetsSourceDirCandidates[0] ?? DEFAULT_ASSETS_DIR,
	);

	const pagesSourceDirAbsolute = join(projectDir, pagesSourceDir);
	const componentsSourceDirAbsolute = join(projectDir, componentsSourceDir);
	const assetsSourceDirAbsolute = join(projectDir, assetsSourceDir);

	return {
		pagesSourceDir,
		pagesSourceDirAbsolute,
		pagesSourceDirCandidates,
		hasPagesSourceDir: existsSync(pagesSourceDirAbsolute),
		componentsSourceDir,
		componentsSourceDirAbsolute,
		componentsSourceDirCandidates,
		hasComponentsSourceDir: existsSync(componentsSourceDirAbsolute),
		componentsPublicDir: normalizePath(config.components),
		assetsSourceDir,
		assetsSourceDirAbsolute,
		assetsSourceDirCandidates,
		hasAssetsSourceDir: existsSync(assetsSourceDirAbsolute),
		assetsPublicDir: normalizePath(config.assets),
	};
};

export const getPageSourceRootDir = (
	projectDir: string,
	paths: ResolvedSsgPaths,
): string => (paths.hasPagesSourceDir ? paths.pagesSourceDirAbsolute : projectDir);

export const pageSourceFileToOutputPath = (
	pageSourceFile: string,
	pageSourceRootDir: string,
): string => {
	const relativePagePath = relative(pageSourceRootDir, pageSourceFile).replace(
		/\\/g,
		"/",
	);

	return relativePagePath.replace(/\.(mdx|md)$/i, ".html");
};

export const resolvePreferredPageSourceForOutputPath = (
	relativeOutputHtmlFilePath: string,
	pageSourceRootDir: string,
): string | null => {
	for (const candidate of outputPathToSourceCandidates(
		pageSourceRootDir,
		relativeOutputHtmlFilePath,
	)) {
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	return null;
};

export const selectPreferredPageSourceFiles = (
	pageSourceFiles: string[],
	pageSourceRootDir: string,
): string[] => {
	const selectedFiles = new Map<string, string>();
	const sortedSourceFiles = [...pageSourceFiles].sort((left, right) => {
		const leftOutputPath = pageSourceFileToOutputPath(left, pageSourceRootDir);
		const rightOutputPath = pageSourceFileToOutputPath(right, pageSourceRootDir);
		const outputPathCompare = leftOutputPath.localeCompare(rightOutputPath);

		if (outputPathCompare !== 0) {
			return outputPathCompare;
		}

		return (
			getPageSourceExtensionPriority(left) -
			getPageSourceExtensionPriority(right)
		);
	});

	for (const pageSourceFile of sortedSourceFiles) {
		const outputPath = pageSourceFileToOutputPath(
			pageSourceFile,
			pageSourceRootDir,
		);
		if (!selectedFiles.has(outputPath)) {
			selectedFiles.set(outputPath, pageSourceFile);
		}
	}

	return [...selectedFiles.values()];
};

export const resolvePageSourceFileForPath = (
	pathname: string,
	pageSourceRootDir: string,
	hasPagesSourceDir: boolean,
): string | null => {
	const outputCandidates =
		pathname === "/"
			? ["index.html"]
			: (() => {
				const trimmedPath = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
				if (trimmedPath.length === 0) {
					return ["index.html"];
				}

				if (extname(trimmedPath)) {
					return [trimmedPath];
				}

				return [`${trimmedPath}.html`, `${trimmedPath}/index.html`];
			})();

	if (!hasPagesSourceDir) {
		return outputCandidates.includes("index.html")
			? resolvePreferredPageSourceForOutputPath("index.html", pageSourceRootDir)
			: null;
	}

	for (const outputCandidate of outputCandidates) {
		const sourceFile = resolvePreferredPageSourceForOutputPath(
			outputCandidate,
			pageSourceRootDir,
		);
		if (sourceFile) {
			return sourceFile;
		}
	}

	return null;
};

export const filePathToRoute = (
	filePath: string,
	config: SsgConfig,
	cwd: string,
): string => {
	const paths = resolveSsgPaths(cwd, config);
	const pageSourceRootDir =
		paths.hasPagesSourceDir &&
		normalizePath(filePath).startsWith(
			`${normalizePath(paths.pagesSourceDirAbsolute)}/`,
		)
			? paths.pagesSourceDirAbsolute
			: cwd;
	let routePath = pageSourceFileToOutputPath(filePath, pageSourceRootDir);

	routePath = normalizePath(routePath);

	if (routePath === "index.html") {
		return "/";
	}

	if (routePath.endsWith("/index.html")) {
		routePath = routePath.slice(0, -"/index.html".length);
	} else {
		routePath = routePath.replace(/\.html$/i, "");
	}

	if (!routePath.startsWith("/")) {
		routePath = `/${routePath}`;
	}

	return routePath;
};
