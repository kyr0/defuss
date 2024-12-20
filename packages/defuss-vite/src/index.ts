import { createFilter } from "@rollup/pluginutils";
import type { ParserPlugin, ParserOptions } from "@babel/parser";
import type { Plugin, ResolvedConfig } from "vite";
import { transformAsync } from "@babel/core";
import { fileURLToPath } from "node:url";
import type { DefussBabelOptions, DefussVitePluginOptions } from './types.js';

// Allows to ignore query parameters, as in Vue SFC virtual modules.
function parseId(url: string) {
	return { id: url.split("?", 2)[0] };
}

const babelCwd = fileURLToPath(new URL('../', import.meta.url));

// makes sure that the JSX pragma is set to `tsx` and the JSX fragment pragma is set to `Fragment`
// so that JSX is correctly transpiled and tsx() is called to construct the virtual DOM call tree (functional AST)
export default function defussVitePlugin({
    include,
    exclude,
    babel,
}: DefussVitePluginOptions = {}): Plugin[] {
    const baseParserOptions = ["importMeta", "explicitResourceManagement", "topLevelAwait"];
    let config: ResolvedConfig;

    if (!babel) {
        babel = {};
    }

    if (!babel.cwd) {
        babel.cwd = babelCwd;
    }

    const babelOptions: DefussBabelOptions = {
        babelrc: false,
        configFile: false,
        ...babel,
        plugins: babel?.plugins || [],
        presets: babel?.presets || [],
        overrides: babel?.overrides || [],
        parserOpts: {
            ...(babel?.parserOpts || {}),
            plugins: (babel?.parserOpts?.plugins || []) as Extract<ParserOptions["plugins"], any[]>,
        },
    };

    const shouldTransform = createFilter(include || [/\.[cm]?[tj]sx?$/], exclude || [/node_modules/]);

    const jsxPlugin: Plugin = {
        name: "vite:defuss-jsx",
        enforce: "pre",
        config() {
            return {
                esbuild: {
                    // we want Vite to handle JSX transformations
                    jsxImportSource: "defuss",
                    jsxFactory: 'jsx',
                    jsxFragment: 'Fragment',
                },
                optimizeDeps: {
                    // we want Vite to optimize the runtime code
                    include: ['defuss'],
                    // we don't want Vite to optimize this plugin code
                    exclude: ['defuss-vite'],
                },
                ssr: {
                    // LinkeDOM (used by defuss/render) imports perf_hooks 
                    // which is actually just an empty placeholder package, 
                    // therefore, we externalize it
                    external: ['perf_hooks'] 
                },
            };
        },
        configResolved(resolvedConfig) {
            config = resolvedConfig;
        },
        async transform(code, url) {
            const { id } = parseId(url);

            if (!shouldTransform(id)) return;

            const parserPlugins: ParserPlugin[] = [
                ...baseParserOptions,
                "classProperties",
                "classPrivateProperties",
                "classPrivateMethods",
                !id.endsWith(".ts") && "jsx",
                /\.tsx?$/.test(id) && "typescript",
            ].filter(Boolean) as ParserPlugin[];

            const result = await transformAsync(code, {
                ...babelOptions,
                ast: true,
                root: config.root,
                filename: id,
                parserOpts: {
                    ...babelOptions.parserOpts,
                    sourceType: "module",
                    allowAwaitOutsideFunction: true,
                    plugins: parserPlugins,
                },
                generatorOpts: {
                    ...babelOptions.generatorOpts,
                    decoratorsBeforeExport: true,
                },
                plugins: [
                    ...babelOptions.plugins,
                    [
                        "@babel/plugin-transform-react-jsx",

                        /** Options
                         * 
                            filter?: (node: t.Node, pass: PluginPass) => boolean;
                            importSource?: string;
                            pragma?: string;
                            pragmaFrag?: string;
                            pure?: string;
                            runtime?: "automatic" | "classic";
                            throwIfNamespace?: boolean;
                            useBuiltIns: boolean;
                            useSpread?: boolean;
                         */
                        {
                            runtime: "automatic",   // Automatically imports jsx from "defuss"
                            importSource: "defuss", // Automatically imports jsx from "defuss"
                            //pragma: "jsx",          // Use jsx() for all JSX, including fragments
                            //pragmaFrag: "jsx",      // Use jsx() for fragments as well
                            throwIfNamespace: false // Bypass namespace tag error
                        },
                    ],
                ],
                sourceMaps: true,
                inputSourceMap: false as any,
            });

            if (!result) return;

            return {
                code: result.code || code,
                map: result.map,
            };
        },
    };
    return [jsxPlugin];
}

export * from './types.js';