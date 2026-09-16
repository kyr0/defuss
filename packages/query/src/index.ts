/**
 * Why: the npm library entry. It injects the real morph module into the
 * factory and stays side-effect-free: importing `defuss-query` never reads
 * or writes `globalThis.df$`. The CDN entries (all.ts / global.ts) own the
 * global-install path.
 */
import * as morphApi from "defuss-morph";
import { createDf$ } from "./query.js";
export * from "./query.js";
/** ESM/CJS entry: does not read or write globalThis.df$. */
export const df$ = createDf$(morphApi);
export default df$;
