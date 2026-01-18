import { createFilter } from "vite";
import type { FilterPattern, PluginOption, ResolvedConfig } from "vite";
import { transform } from "@swc/core";

// info: the code in this file is an intended duplication of defuss-vite
// the reason is that Astro still depends on older Vite versions while
// defuss itself wants to use the latest Vite versions (7.x) 
// we hope for Astro to catch up with Vite 7.x soon
// in the meantime, we have to maintain duplicate code here

export interface DefussVitePluginOptions {
    /**
     * RegExp or glob to match files to be transformed
     */
    include?: FilterPattern;

    /**
     * RegExp or glob to match files to NOT be transformed
     */
    exclude?: FilterPattern;
}

export interface ExistingRawSourceMap {
    file?: string;
    mappings: string;
    names: string[];
    sourceRoot?: string;
    sources: string[];
    sourcesContent?: string[];
    version: number;
    x_google_ignoreList?: number[];
}

export type MaybeSourceMap =
    | ExistingRawSourceMap
    | string
    | null
    | { mappings: "" };

// Allows to ignore query parameters, as in Vue SFC virtual modules.
function parseId(url: string) {
    return { id: url.split("?", 2)[0] };
}

// makes sure that the JSX pragma is set to `tsx` and the JSX fragment pragma is set to `Fragment`
// so that JSX is correctly transpiled and tsx() is called to construct the virtual DOM call tree (functional AST)
export default function defussVitePlugin({
    include,
    exclude,
}: DefussVitePluginOptions = {}): PluginOption {
    let config: ResolvedConfig;

    const shouldTransform = createFilter(
        include || [/\.[cm]?[tj]sx?$/],
        exclude || [/node_modules/],
    );

    const jsxPlugin: PluginOption = {
        name: "vite:defuss-jsx",
        enforce: "pre",
        config() {
            return {
                esbuild: {
                    // we want Vite to handle JSX transformations
                    jsxImportSource: "defuss",
                    jsxFactory: "jsx",
                    jsxFragment: "Fragment",
                },
                optimizeDeps: {
                    // we want Vite to optimize the runtime code
                    include: ["defuss"],
                    // we don't want Vite to optimize this plugin code
                    exclude: ["defuss-vite"],
                },
                ssr: {
                    // LinkeDOM (used by defuss/render) imports perf_hooks
                    // which is actually just an empty placeholder package,
                    // therefore, we externalize it
                    external: ["perf_hooks"],
                },
            };
        },
        configResolved(resolvedConfig) {
            config = resolvedConfig;
        },
        async transform(code, url) {
            const { id } = parseId(url);

            if (!shouldTransform(id)) {
                return null;
            }

            const prevSourceMap = this.getCombinedSourcemap?.();
            const inputSourceMap = prevSourceMap
                ? JSON.stringify({ code, map: prevSourceMap })
                : undefined;

            const result = await transform(code, {
                jsc: {
                    parser: {
                        syntax: "typescript",
                        tsx: true,
                        dynamicImport: true,
                        decorators: true,
                    },
                    transform: {
                        react: {
                            development: true,
                            useBuiltins: false,
                            throwIfNamespace: false,
                            pragma: "jsx",
                            pragmaFrag: "Fragment",
                            runtime: "automatic",
                            importSource: "defuss",
                        },
                    },
                    target: "es2024",
                },
                sourceMaps: true,
                sourceFileName: id,
                filename: id,
                sourceRoot: config.root,
                inputSourceMap,
            });

            if (!result) return null;

            return {
                code: result.code || code,
                map: result.map,
            };
        },
    };
    return jsxPlugin as PluginOption;
}
