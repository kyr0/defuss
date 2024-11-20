import type { FilterPattern } from "@rollup/pluginutils";
import type { ParserOptions } from "@babel/parser";

export type BabelOptions = Omit<
	any,
	| "ast"
	| "filename"
	| "root"
	| "sourceFileName"
	| "sourceMaps"
	| "inputSourceMap"
>;

export interface DefussVitePluginOptions {

	/**
	 * RegExp or glob to match files to be transformed
	 */
	include?: FilterPattern;

	/**
	 * RegExp or glob to match files to NOT be transformed
	 */
	exclude?: FilterPattern;

	/**
	 * Babel configuration applied in both dev and prod.
	 */
	babel?: BabelOptions;
}

export interface DefussBabelOptions extends BabelOptions {
	plugins: Extract<BabelOptions["plugins"], any[]>;
	presets: Extract<BabelOptions["presets"], any[]>;
	overrides: Extract<BabelOptions["overrides"], any[]>;
	parserOpts: ParserOptions & {
		plugins: Extract<ParserOptions["plugins"], any[]>;
	};
}