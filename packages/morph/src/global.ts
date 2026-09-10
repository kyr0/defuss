import * as api from "./index.js";

/**
 * Why: the CDN bundle (dist/all.js / all.min.js) is also loaded via a plain
 * <script type="module" src="..."> tag — no ESM import statement, so the
 * module's exports are unreachable for the page. Evaluating the bundle
 * therefore declares a `df$` global and exposes the full public API on it:
 *
 *   <script type="module" src="https://cdn.jsdelivr.net/npm/defuss-morph@latest/dist/all.min.js"></script>
 *   <script type="module">
 *     window.df$.morph(document.getElementById("app"), "<p>Hi</p>");
 *     window.df$.updateDomWithVdom(app, [{ type: "input", attributes: { checked: false }, children: [] }], { window });
 *   </script>
 *
 * A pre-existing `df$` object is preserved (the API is assigned onto it);
 * a non-object value (or none) is replaced with a fresh object.
 */
declare global {
  var df$: typeof api | undefined;

  interface Window {
    df$: typeof api | undefined;
  }
}

if (typeof globalThis !== "undefined") {
  const g = globalThis as { df$: unknown };
  if (typeof g.df$ !== "object" || g.df$ === null) {
    g.df$ = {};
  }
  Object.assign(g.df$ as Record<string, unknown>, api);
}
