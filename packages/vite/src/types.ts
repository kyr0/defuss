import type { FilterPattern } from "vite";

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
	 * Controls whether the SWC JSX transform runs in development mode.
	 *
	 * In development mode, SWC injects extra debug metadata into the compiled
	 * JSX output: `fileName`, `lineNumber` and `columnNumber`. This is useful
	 * for debugging and error tracing, but should never appear in production
	 * bundles as it inflates bundle size and leaks absolute local file paths.
	 *
	 * - `true`      — always inject debug metadata (force dev mode)
	 * - `false`     — always strip debug metadata (force production mode)
	 * - `undefined` — automatic: uses Vite's `config.command` to decide.
	 *                 `vite serve` → `true`, `vite build` → `false`
	 *
	 * @default undefined (automatic — recommended)
	 */
	enableJsxDevMode?: boolean;
}
