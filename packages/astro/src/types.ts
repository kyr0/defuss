import type { SSRResult } from "astro";
import type { DefussVitePluginOptions } from "./defuss-vite-plugin.js";

export type RendererContext = {
  result: SSRResult;
};

export type ArrayObjectMapping = [string, number | string][];

export interface Options
  extends Pick<DefussVitePluginOptions, "exclude" | "include"> {
  devtools?: boolean;
  enableSvgOptimization?: boolean;
  enableCssOptimization?: boolean;
}
