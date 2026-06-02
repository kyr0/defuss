import mdx from "@mdx-js/rollup";
import glob from "fast-glob";
import {
	build as viteBuild,
	createServer,
	type InlineConfig,
	type PluginOption,
} from "vite";
import defuss from "defuss-vite";

import {
	renderToString,
	renderSync,
	getBrowserGlobals,
	getDocument,
	type VNode,
} from "defuss/server";

import { createRequire } from "node:module";
import { resolve, join, dirname, relative, sep, extname } from "node:path";
import { cp, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	rmSync,
	symlinkSync,
} from "node:fs";
import type {
	BuildOptions,
	PluginFnPageDom,
	PluginFnPageHtml,
	PluginFnPageVdom,
	PluginFnPrePost,
	SsgConfig,
	Status,
} from "./types.js";
import { createContentModulePlugin } from "./content-vite.js";
import { mergeUserViteConfig, readConfig } from "./config.js";
import { applyAutoHydrate } from "./hydration.js";
import {
	getPageSourceRootDir,
	pageSourceFileToOutputPath,
	resolvePreferredPageSourceForOutputPath,
	resolveSsgPaths,
	selectPreferredPageSourceFiles,
} from "./path.js";
import { validateProjectDir } from "./validation.js";
import { buildEndpoints } from "./endpoints.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isHtmlLikePageSource = (filePath: string): boolean => {
	const extension = extname(filePath).toLowerCase();
	return extension === "" || extension === ".md" || extension === ".mdx" || extension === ".html";
};

const normalizePath = (filePath: string): string => filePath.replace(/\\/g, "/");

const isPathInOrUnder = (filePath: string, dirPath: string): boolean => {
	const normalizedFilePath = normalizePath(filePath).replace(/\/+$/, "");
	const normalizedDirPath = normalizePath(dirPath).replace(/\/+$/, "");

	return (
		normalizedFilePath === normalizedDirPath ||
		normalizedFilePath.startsWith(`${normalizedDirPath}/`)
	);
};

const isRootIndexPageSource = (filePath: string): boolean =>
	/^index(?:\.mdx?|\.html)?$/i.test(normalizePath(filePath));

const resolveLocalHelperFile = (
	sourceRelativePath: string,
	builtRelativePath: string,
): string => {
	const candidates = [
		resolve(__dirname, sourceRelativePath),
		resolve(__dirname, "..", "src", sourceRelativePath),
		resolve(__dirname, builtRelativePath),
	];

	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	return resolve(__dirname, builtRelativePath);
};

const loadProjectTailwindVitePlugins = async (
	projectDir: string,
	debug: boolean,
): Promise<PluginOption[]> => {
	const requireFromBuild = createRequire(import.meta.url);

	try {
		const resolvedPluginPath = requireFromBuild.resolve("@tailwindcss/vite", {
			paths: [projectDir],
		});
		const tailwindModule = await import(
			pathToFileURL(resolvedPluginPath).href
		);

		if (typeof tailwindModule.default !== "function") {
			return [];
		}

		const plugin = tailwindModule.default();
		if (!plugin) {
			return [];
		}

		return Array.isArray(plugin)
			? (plugin as PluginOption[])
			: [plugin as PluginOption];
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const isMissingPlugin = message.includes("@tailwindcss/vite");

		if (!isMissingPlugin && debug) {
			console.warn("[build] Failed to load @tailwindcss/vite from project:", error);
		}

		return [];
	}
};

const injectStylesheetLinks = (html: string, hrefs: string[]): string => {
	const missingHrefs = hrefs.filter((href) => !html.includes(`href="${href}"`));
	if (missingHrefs.length === 0) {
		return html;
	}

	const linkTags = missingHrefs
		.map((href) => `<link rel="stylesheet" href="${href}">`)
		.join("");

	if (html.includes("</head>")) {
		return html.replace("</head>", `${linkTags}</head>`);
	}

	return `${linkTags}${html}`;
};

const normalizeComponentStylesheet = (css: string): string => {
	const compiledTailwindBanner = "/*! tailwindcss";
	const compiledTailwindIndex = css.indexOf(compiledTailwindBanner);

	if (compiledTailwindIndex <= 0) {
		return css;
	}

	const prefix = css.slice(0, compiledTailwindIndex).trimStart();
	const hasRawTailwindPrelude =
		prefix.startsWith("@layer theme, base, components, utilities;") &&
		prefix.includes("@theme default");

	if (!hasRawTailwindPrelude) {
		return css;
	}

	return css.slice(compiledTailwindIndex);
};

const normalizeComponentStylesheets = async (
	componentsOutputDir: string,
): Promise<void> => {
	const cssFiles = await glob.async(join(componentsOutputDir, "**/*.css"));

	for (const cssFile of cssFiles) {
		const currentCss = await readFile(cssFile, "utf-8");
		const normalizedCss = normalizeComponentStylesheet(currentCss);

		if (normalizedCss !== currentCss) {
			await writeFile(cssFile, normalizedCss);
		}
	}
};

const getComponentStylesheetHrefs = async (
	componentsOutputDir: string,
	componentsPublicDir: string,
): Promise<string[]> => {
	if (!existsSync(componentsOutputDir)) {
		return [];
	}

	const cssFiles = await glob.async(join(componentsOutputDir, "**/*.css"));
	return cssFiles
		.sort((left, right) => left.localeCompare(right))
		.map((cssFile) =>
			`/${normalizePath(join(componentsPublicDir, relative(componentsOutputDir, cssFile)))}`,
		);
};

const injectComponentStylesheetsIntoOutputHtml = async (
	outputProjectDir: string,
	componentsOutputDir: string,
	componentsPublicDir: string,
): Promise<void> => {
	if (!existsSync(outputProjectDir)) {
		return;
	}

	const stylesheetHrefs = await getComponentStylesheetHrefs(
		componentsOutputDir,
		componentsPublicDir,
	);
	if (stylesheetHrefs.length === 0) {
		return;
	}

	const htmlFiles = await glob.async(join(outputProjectDir, "**/*.html"));
	for (const htmlFile of htmlFiles) {
		const currentHtml = await readFile(htmlFile, "utf8");
		const nextHtml = injectStylesheetLinks(currentHtml, stylesheetHrefs);
		if (nextHtml !== currentHtml) {
			await writeFile(htmlFile, nextHtml);
		}
	}
};

/**
 * A single, complete build process for a static site project.
 * @param projectDir The root directory of the project to build
 */
export const build = async ({
	projectDir,
	debug = false,
	mode = "build",
	changedFile,
}: BuildOptions): Promise<Status> => {
	const projectDirStatus = validateProjectDir(projectDir);
	if (projectDirStatus.code !== "OK") return projectDirStatus;

	// TODO: implement detailed error handing and status tracking (see setup.ts)

	const startTime = performance.now();
	const logDebug = (...args: unknown[]) => {
		if (debug) {
			console.log(...args);
		}
	};
	const timeDebug = (label: string) => {
		if (debug) {
			console.time(label);
		}
	};
	const timeEndDebug = (label: string) => {
		if (debug) {
			console.timeEnd(label);
		}
	};

	timeDebug("[build] readConfig");
	const config = (await readConfig(projectDir, debug)) as SsgConfig;
	timeEndDebug("[build] readConfig");
	const projectPaths = resolveSsgPaths(projectDir, config);

	if (debug) {
		console.log("Using config:", config);
	}

	// construct relative paths
	const inputPagesDir = projectPaths.pagesSourceDirAbsolute;
	const inputComponentsDir = projectPaths.componentsSourceDirAbsolute;
	const inputAssetsDir = projectPaths.assetsSourceDirAbsolute;
	const inputPublicDir = join(projectDir, "public");
	const hasInputPagesDir = projectPaths.hasPagesSourceDir;
	const tmpPagesDir = join(config.tmp, projectPaths.pagesSourceDir);
	const tmpComponentsDir = join(config.tmp, projectPaths.componentsSourceDir);
	const tmpPageSourceRootDir = hasInputPagesDir
		? tmpPagesDir
		: getPageSourceRootDir(config.tmp, resolveSsgPaths(config.tmp, config));

	const outputProjectDir = join(projectDir, config.output);
	const outputPagesDir = outputProjectDir;
	const outputComponentsDir = join(
		projectDir,
		config.output,
		projectPaths.componentsPublicDir,
	);
	const outputAssetsDir = join(
		projectDir,
		config.output,
		projectPaths.assetsPublicDir,
	);

	if (debug) {
		console.log("Input pages dir:", inputPagesDir);
		console.log("Input components dir:", inputComponentsDir);
		console.log("Input assets dir:", inputAssetsDir);
		console.log("Input public dir:", inputPublicDir);
		console.log("Temp pages dir:", tmpPagesDir);
		console.log("Temp components dir:", tmpComponentsDir);
		console.log("Output pages dir:", outputPagesDir);
		console.log("Output components dir:", outputComponentsDir);
		console.log("Output assets dir:", outputAssetsDir);
	}

	// -- Determine what to rebuild --------------------------------------
	// For incremental builds (serve mode with changedFile), figure out if
	// it's a page, component, or asset change so we can skip unneeded work.
	type ChangeKind =
		| "page"
		| "endpoint"
		| "component"
		| "asset"
		| "config"
		| "full";
	let changeKind: ChangeKind = "full";
	let changedRelative = ""; // path relative to projectDir

	if (changedFile) {
		// Normalise to a path relative to the project directory
		changedRelative = changedFile.startsWith(projectDir)
			? normalizePath(changedFile.slice(projectDir.length).replace(/^\//, ""))
			: changedFile;

		if (isPathInOrUnder(changedRelative, projectPaths.pagesSourceDir)) {
			changeKind = isHtmlLikePageSource(changedRelative)
				? "page"
				: "endpoint";
		} else if (!hasInputPagesDir && isRootIndexPageSource(changedRelative)) {
			changeKind = "page";
		} else if (isPathInOrUnder(changedRelative, projectPaths.componentsSourceDir)) {
			changeKind = "component";
		} else if (isPathInOrUnder(changedRelative, projectPaths.assetsSourceDir)) {
			changeKind = "asset";
		} else if (isPathInOrUnder(changedRelative, "public")) {
			changeKind = "asset";
		} else if (
			changedRelative === "config.ts" ||
			changedRelative === "config.js"
		) {
			changeKind = "config";
		}

		if (debug) {
			console.log(
				`Incremental build - changeKind: ${changeKind}, file: ${changedRelative}`,
			);
		}
		logDebug(
			`[build] changeKind=${changeKind}, changedRelative=${changedRelative}`,
		);
	}

	const isFullBuild = changeKind === "full" || changeKind === "config";
	const tempExists = existsSync(config.tmp);
	const shouldCopyToTemp = (src: string): boolean => {
		const relative = src.startsWith(projectDir)
			? normalizePath(src.slice(projectDir.length).replace(/^[\\/]+/, ""))
			: src;
		const firstSegment = relative.split(/[\\/]/)[0];

		return !(
			// built-in support for a few standard web dev 
			// dist folders plus defuss/Vite/git-specific behaviour
			firstSegment === "node_modules" ||
			firstSegment === config.output ||
			firstSegment === ".endpoints" ||
			firstSegment === ".ssg-temp" ||
			firstSegment === ".defuss-tauri" ||
			firstSegment === "dist-tauri" ||
			firstSegment === "dist-tauri-build" ||
			firstSegment === "dist-tauri-dev" ||
			firstSegment === ".git" ||
			firstSegment === "public" ||
			projectPaths.assetsSourceDirCandidates.some((candidateDir) =>
				isPathInOrUnder(relative, candidateDir),
			)
		);
	};

	// -- Pre plugins (full build only) ---------------------------------
	if (isFullBuild) {
		timeDebug("[build] pre-plugins");
		for (const plugin of config.plugins || []) {
			if (
				plugin.phase === "pre" &&
				(plugin.mode === mode || plugin.mode === "both")
			) {
				timeDebug(`[build] pre-plugin:${plugin.name}`);
				if (debug) {
					console.log(`Running pre-plugin: ${plugin.name}`);
				}
				await (plugin.fn as PluginFnPrePost)(projectDir, config);
				timeEndDebug(`[build] pre-plugin:${plugin.name}`);
			}
		}
		timeEndDebug("[build] pre-plugins");
	}

	// -- Prepare temp folder --------------------------------------------
	timeDebug("[build] prepare-temp");
	if (isFullBuild || !tempExists) {
		// Full rebuild: nuke & recreate temp
		if (tempExists) {
			timeDebug("[build] prepare-temp:rmSync");
			rmSync(config.tmp, { recursive: true });
			timeEndDebug("[build] prepare-temp:rmSync");
		}

		timeDebug("[build] prepare-temp:cp");
		mkdirSync(config.tmp, { recursive: true });
		for (const sourceEntryName of readdirSync(projectDir)) {
			const sourceEntry = join(projectDir, sourceEntryName);
			const tempEntry = join(config.tmp, sourceEntryName);
			if (!shouldCopyToTemp(sourceEntry)) {
				continue;
			}

			await cp(sourceEntry, tempEntry, {
				recursive: true,
				filter: shouldCopyToTemp,
			});
		}
		timeEndDebug("[build] prepare-temp:cp");

		// Symlink node_modules into temp so esbuild can resolve packages
		const srcNodeModules = join(projectDir, "node_modules");
		const tmpNodeModules = join(config.tmp, "node_modules");
		if (existsSync(srcNodeModules) && !existsSync(tmpNodeModules)) {
			symlinkSync(srcNodeModules, tmpNodeModules, "dir");
		}
	} else {
		// Incremental: only copy the changed file into temp
		const srcFile = join(projectDir, changedRelative);
		const destFile = join(config.tmp, changedRelative);

		// Ensure parent dir exists
		const destDir = dirname(destFile);
		if (!existsSync(destDir)) {
			mkdirSync(destDir, { recursive: true });
		}

		if (existsSync(srcFile)) {
			await cp(srcFile, destFile);
		}
	}
	timeEndDebug("[build] prepare-temp");

	// Copy runtime helper into temp components.
	mkdirSync(tmpComponentsDir, { recursive: true });
	timeDebug("[build] copy-hydration");
	await cp(
		resolveLocalHelperFile("runtime.ts", "runtime.mjs"),
		join(tmpComponentsDir, "runtime.ts"),
	);
	timeEndDebug("[build] copy-hydration");

	// -- Clean stale component .js outputs ------------------------------
	// Page SSR loading should resolve source .tsx files so auto-hydration
	// keeps sourceInfo. Removing old built .js files avoids those outputs
	// shadowing the source modules during the page render step.
	if (changeKind === "component" || isFullBuild) {
		const staleJsFiles = await glob.async(join(tmpComponentsDir, "**/*.js"));
		for (const f of staleJsFiles) {
			rmSync(f);
		}
	}

	// -- Collect page source files for Vite SSR loading -----------------
	let pageSourceFiles: string[] = [];
	if (changeKind !== "asset" && changeKind !== "endpoint") {
		timeDebug("[build] collect-pages");
		if (changeKind === "page") {
			const changedPageSourceFile = join(config.tmp, changedRelative);
			const changedOutputPath = pageSourceFileToOutputPath(
				changedPageSourceFile,
				tmpPageSourceRootDir,
			);
			const preferredPageSourceFile = resolvePreferredPageSourceForOutputPath(
				changedOutputPath,
				tmpPageSourceRootDir,
			);
			pageSourceFiles = preferredPageSourceFile ? [preferredPageSourceFile] : [];
		} else if (hasInputPagesDir) {
			pageSourceFiles = selectPreferredPageSourceFiles(
				await glob.async([
					join(tmpPagesDir, "**/*.md"),
					join(tmpPagesDir, "**/*.mdx"),
					join(tmpPagesDir, "**/*.html"),
				]),
				tmpPageSourceRootDir,
			);
		} else {
			const preferredRootIndexFile = resolvePreferredPageSourceForOutputPath(
				"index.html",
				tmpPageSourceRootDir,
			);
			pageSourceFiles = preferredRootIndexFile ? [preferredRootIndexFile] : [];
		}
		timeEndDebug("[build] collect-pages");
	}

	// -- Render pages to HTML -------------------------------------------
	if (changeKind !== "asset" && changeKind !== "endpoint") {
		timeDebug("[build] render-pages");
		const currentPageModuleViteConfig: InlineConfig = {
			root: config.tmp,
			configFile: false,
			appType: "custom",
			logLevel: debug ? "info" : "error",
			optimizeDeps: {
				noDiscovery: true,
			},
			server: {
				middlewareMode: true,
			},
			plugins: [
				createContentModulePlugin({
					projectDir,
					pagesDir: config.pages,
				}),
				defuss({ enableJsxDevMode: true }),
				mdx({
					jsxImportSource: "defuss",
					development: true,
					remarkPlugins: config.remarkPlugins,
					rehypePlugins: config.rehypePlugins,
				}),
			],
		};
		const pageModuleConfig = await readConfig(projectDir, debug, {
			currentViteConfig: currentPageModuleViteConfig,
		});
		const pageModuleServer = await createServer(
			mergeUserViteConfig(
				currentPageModuleViteConfig,
				pageModuleConfig.viteConfig,
			),
		);

		try {
			let inputFiles: string[];

			if (changeKind === "page") {
				inputFiles = pageSourceFiles.filter((pageFile) => existsSync(pageFile));
			} else {
				if (changeKind === "component") {
					logDebug(
						"[build] component-dep: rendering all pages because Vite SSR loading has no esbuild metafile dependency graph",
					);
				}
				inputFiles = pageSourceFiles;
			}

			if (!existsSync(outputProjectDir)) {
				mkdirSync(outputProjectDir, { recursive: true });
			}

			for (const inputFile of inputFiles) {
				const relativeOutputHtmlFilePath = pageSourceFileToOutputPath(
					inputFile,
					tmpPageSourceRootDir,
				);

				const pageLabel = relativeOutputHtmlFilePath;
				const finalOutputFile = join(
					projectDir,
					config.output,
					relativeOutputHtmlFilePath,
				);
				const finalOutputDir = dirname(finalOutputFile);
				if (!existsSync(finalOutputDir)) {
					mkdirSync(finalOutputDir, { recursive: true });
				}

				if (debug) {
					console.log("Processing page source file:", inputFile);
					console.log("Relative output HTML path:", relativeOutputHtmlFilePath);
				}

				if (extname(inputFile).toLowerCase() === ".html") {
					timeDebug(`[build] page:${pageLabel} copyHtml`);
					await cp(inputFile, finalOutputFile);
					timeEndDebug(`[build] page:${pageLabel} copyHtml`);
					continue;
				}

				timeDebug(`[build] page:${pageLabel} ssrLoadModule`);
				const modulePath = `/${relative(config.tmp, inputFile).split(sep).join("/")}`;
				const exports = (await pageModuleServer.ssrLoadModule(modulePath)) as Record<
					string,
					any
				>;
				timeEndDebug(`[build] page:${pageLabel} ssrLoadModule`);

				timeDebug(`[build] page:${pageLabel} vdom`);
				let vdom = exports.default(exports) as VNode;
				timeEndDebug(`[build] page:${pageLabel} vdom`);
				vdom = applyAutoHydrate(
					vdom,
					tmpComponentsDir,
					projectPaths.componentsPublicDir,
					relativeOutputHtmlFilePath,
				);

				// run any "page-vdom" plugins
				for (const plugin of config.plugins || []) {
					if (
						plugin.phase === "page-vdom" &&
						(plugin.mode === mode || plugin.mode === "both")
					) {
						timeDebug(`[build] page:${pageLabel} plugin:${plugin.name}`);
						if (debug) {
							console.log(`Running page-vdom plugin: ${plugin.name}`);
						}
						vdom = await (plugin.fn as PluginFnPageVdom)(
							vdom,
							relativeOutputHtmlFilePath,
							projectDir,
							config,
							exports,
						);
						timeEndDebug(`[build] page:${pageLabel} plugin:${plugin.name}`);
					}
				}

				timeDebug(`[build] page:${pageLabel} renderSync`);
				const browserGlobals = getBrowserGlobals();
				const document = getDocument(false, browserGlobals);
				browserGlobals.document = document;

				let el = renderSync(vdom, document.documentElement, {
					browserGlobals,
				}) as HTMLElement;
				timeEndDebug(`[build] page:${pageLabel} renderSync`);

				// run any "page-dom" plugins
				for (const plugin of config.plugins || []) {
					if (
						plugin.phase === "page-dom" &&
						(plugin.mode === mode || plugin.mode === "both")
					) {
						timeDebug(`[build] page:${pageLabel} dom-plugin:${plugin.name}`);
						if (debug) {
							console.log(`Running page-dom plugin: ${plugin.name}`);
						}
						el = await (plugin.fn as PluginFnPageDom)(
							el,
							relativeOutputHtmlFilePath,
							projectDir,
							config,
						);
						timeEndDebug(
							`[build] page:${pageLabel} dom-plugin:${plugin.name}`,
						);
					}
				}

				timeDebug(`[build] page:${pageLabel} renderToString`);
				let html = renderToString(el);
				timeEndDebug(`[build] page:${pageLabel} renderToString`);

				// run any "page-html" plugins
				for (const plugin of config.plugins || []) {
					if (
						plugin.phase === "page-html" &&
						(plugin.mode === mode || plugin.mode === "both")
					) {
						timeDebug(`[build] page:${pageLabel} html-plugin:${plugin.name}`);
						if (debug) {
							console.log(`Running page-html plugin: ${plugin.name}`);
						}
						html = await (plugin.fn as PluginFnPageHtml)(
							html,
							relativeOutputHtmlFilePath,
							projectDir,
							config,
						);
						timeEndDebug(
							`[build] page:${pageLabel} html-plugin:${plugin.name}`,
						);
					}
				}

				timeDebug(`[build] page:${pageLabel} writeFile`);
				await writeFile(finalOutputFile, html);
				timeEndDebug(`[build] page:${pageLabel} writeFile`);
			}
		} finally {
			await pageModuleServer.close();
			timeEndDebug("[build] render-pages");
		}
	}

	// Use a subdirectory for Vite output to avoid "outDir must not be the same
	// directory of root" warning.
	const tmpComponentOutDir = join(tmpComponentsDir, ".vite-output");

	// -- Vite: compile components (client-side JS) ----------------------
	if (isFullBuild || changeKind === "component") {
		timeDebug("[build] vite-components");

		const componentEntryFiles = await glob.async([
			join(tmpComponentsDir, "**/*.tsx"),
			join(tmpComponentsDir, "**/*.ts"),
		]);
		const componentEntries = Object.fromEntries(
			componentEntryFiles.map((entryFile) => [
				relative(tmpComponentsDir, entryFile).replace(/\.[^.]+$/, ""),
				resolve(entryFile),
			]),
		);
		const componentBuildPlugins = [
			defuss(),
			...(await loadProjectTailwindVitePlugins(projectDir, debug)),
		];
		const currentComponentViteConfig: InlineConfig = {
			root: resolve(tmpComponentsDir),
			configFile: false,
			publicDir: false,
			plugins: componentBuildPlugins,
			build: {
				lib: {
					entry: componentEntries,
					formats: ["es"],
					fileName: (_format: string, entryName: string) => `${entryName}.js`,
				},
				target: "esnext",
				outDir: resolve(tmpComponentOutDir),
				emptyOutDir: false,
				minify: false,
				rollupOptions: {
					output: {
						chunkFileNames: "chunks/[name]-[hash].js",
					},
				},
			},
		};
		const componentBuildConfig = await readConfig(projectDir, debug, {
			currentViteConfig: currentComponentViteConfig,
		});

		await viteBuild(
			mergeUserViteConfig(
				currentComponentViteConfig,
				componentBuildConfig.viteConfig,
			),
		);
		await normalizeComponentStylesheets(tmpComponentOutDir);
		timeEndDebug("[build] vite-components");
	}

	// -- Build endpoints (.ts/.js files in pages) -----------------------
	if (isFullBuild || changeKind === "page" || changeKind === "endpoint") {
		timeDebug("[build] build-endpoints");
		await buildEndpoints(projectDir, config, debug);
		timeEndDebug("[build] build-endpoints");
	}

	// -- Copy outputs ---------------------------------------------------
	timeDebug("[build] copy-outputs");
	if (isFullBuild || changeKind === "component") {
		await cp(tmpComponentOutDir, outputComponentsDir, { recursive: true });
	}

	if (isFullBuild || changeKind === "asset") {
		if (existsSync(inputAssetsDir)) {
			await cp(inputAssetsDir, outputAssetsDir, { recursive: true });
		}

		if (existsSync(inputPublicDir)) {
			await cp(inputPublicDir, outputProjectDir, { recursive: true });
		}
	}

	if (isFullBuild || changeKind === "page" || changeKind === "component") {
		await injectComponentStylesheetsIntoOutputHtml(
			outputProjectDir,
			outputComponentsDir,
			projectPaths.componentsPublicDir,
		);
	}
	timeEndDebug("[build] copy-outputs");

	// -- Post plugins ---------------------------------------------------
	// Run post plugins on full build, or when components change (may affect styles).
	// Skip for single-page edits to save time.
	if (isFullBuild || changeKind === "component") {
		timeDebug("[build] post-plugins");
		for (const plugin of config.plugins || []) {
			if (
				plugin.phase === "post" &&
				(plugin.mode === mode || plugin.mode === "both")
			) {
				if (debug) {
					console.log(`Running post-plugin: ${plugin.name}`);
				}
				await (plugin.fn as PluginFnPrePost)(projectDir, config);
			}
		}
		timeEndDebug("[build] post-plugins");
	}

	// remove the temporary folder after a production build (not in serve mode)
	if (mode === "build" && !debug) {
		rmSync(config.tmp, { recursive: true });
	}

	const endTime = performance.now();
	const totalTime = (endTime - startTime) / 1000;
	const label = isFullBuild
		? "Full build"
		: `Incremental build (${changeKind}: ${changedRelative})`;
	console.log(`${label} completed in ${totalTime.toFixed(2)} seconds.`);

	return { code: "OK", message: "Build completed successfully" };
};
