/**
 * Why: the CDN browser entry (dist/all.js). Unlike the npm entry it must not
 * import morph — the page already loaded morph's CDN bundle, which published
 * its API on `window.df$`. `installGlobal` upgrades that plain object into
 * the callable `df$`, preserving morph function identities, so the browser
 * never ships a second copy of the engine.
 */
import type * as Morph from "defuss-morph";
import type { DfDollar } from "./query.js";
import { installGlobal } from "./query.js";
export * from "./query.js";
/** CDN entry: upgrade the existing morph namespace without bundling morph. */
export const df$ = installGlobal() as DfDollar<typeof Morph>;
export default df$;
