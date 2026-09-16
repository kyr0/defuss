/**
 * Why: opt-in ambient declarations for the CDN global. Re-exports the
 * runtime from all.js and teaches TypeScript that a callable `df$` exists on
 * globalThis and Window. The normal package entries never introduce these
 * globals — global-script consumers import this module explicitly.
 */
import type { DfDollar } from "./query.js";
import type * as Morph from "defuss-morph";
export { df$, default } from "./all.js";
// Opt-in only; importing the normal package never introduces ambient globals.
declare global {
  var df$: DfDollar<typeof Morph>;
  interface Window {
    df$: DfDollar<typeof Morph>;
  }
}
