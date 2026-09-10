/**
 * CDN bundle entry (dist/all.js / dist/all.min.js): the full public API plus
 * the `df$` global registration side effect (see global.ts). The npm library
 * entries (src/index.ts → dist/index.mjs/.cjs) stay side-effect-free.
 */
import "./global.js";
export * from "./index.js";
