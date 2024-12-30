import type { FilterPattern } from "@rollup/pluginutils";

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