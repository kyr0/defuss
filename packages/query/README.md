# defuss-query

The [defuss](https://github.com/kyr0/defuss) DOM query and manipulation facade as a standalone package — a tiny, jQuery-shaped API on top of the [defuss-morph](https://www.npmjs.com/package/defuss-morph) engine.

`df$` is both a function and the morph capability namespace: select elements with native CSS selectors, chain jQuery-style operations on real Arrays, and patch-render content updates through the morphing engine. Native `FormData` for forms, real DOM events, no jQuery dependency. Architecture and development details live in [ARCH.md](ARCH.md).

## TL;DR

You don't need jQuery — or any complex framework — for effective direct atomic DOM traversing and mutation. `df$(".card")` gives you a chainable, snapshot Array of real DOM elements with the familiar jQuery-shaped verbs (`find`, `addClass`, `attr`, `on`, `append`, `html`, etc.). Every structural write goes through the `defuss-morph` engine, so node identity, focus, form state and event handlers survive updates. No complex transpilation steps: Just two `<script>` tags in any HTML page and you are ready to go.

Features:
- 🔍 Native CSS selectors with a chainable, jQuery-shaped API backed by modern DOM APIs
- 📞 One callable `df$`: query factory *and* morph namespace in one
- 🔄 Content updates via DOM-diff morphing (keyed/id-aware, state-preserving) using the tiny `defuss-morph` library
- ⚡ Explicit async transitions (`fade`, `slide`, custom styles)
- 📦 CDN-served and packaged with ESM + CJS
- 🪶 Extremely lightweight — just ~4.2 KiB minified and gzipped
- <!-- coverage:start -->✅ 100% statement and 100% line coverage with unit tests and real browser E2E tests<!-- coverage:end -->
- 🟦 Written in TypeScript

**This is a deliberately specified subset, not a drop-in jQuery replacement.** Native CSS selectors only; no selector engine, AJAX layer, Deferred implementation, component runtime, reactive store, or effects framework.

## Quick, traditional CDN-based setup

The traditional way using the globally exported `window.df$`:

```html
<body>
  <div id="app">Old content</div>

  <!-- morph first, then query — right before the closing </body> tag -->
  <script type="module" src="https://cdn.jsdelivr.net/npm/defuss-morph@latest/dist/all.min.js"></script>
  <script type="module" src="https://cdn.jsdelivr.net/npm/defuss-query@latest/dist/all.min.js"></script>
</body>
```

Then run (yes, this doesn't use any `innerHTML` but _safe_ and _efficient_ real DOM diffing and morphing):

```html
<script>
  // html() accepts morph options — including transitions (returned as a Promise):
  await df$("#app").html("<p>Hello from the CDN</p>", {
    transition: { type: "fade", duration: 200 },
  });

  df$("#app").find("p").on("click", function () {
    df$(this).text("Saved");
  });
</script>
```

- **Good for:** Quick, powerful AI-prototyping, demos, and testing in the browser.
- **Drawbacks:** Doesn't work offline, single-point-of-failure, no bundler optimizations.

## Quick, modern CDN-based setup using ESM imports

The modern way, using direct ESM imports from the CDN:

```html
<body>
  <div id="app">Old content</div>

  <!-- right before the closing </body> tag, import via ESM -->
  <script type="module">
    await import("https://cdn.jsdelivr.net/npm/defuss-morph@latest/dist/all.min.js");
    const { df$ } = await import("https://cdn.jsdelivr.net/npm/defuss-query@latest/dist/all.min.js");

    df$("#app").html("<p>Hello from the CDN</p>",).addClass("ready");
  </script>
</body>
```

The query browser module has **no runtime imports and does not embed morph** — sequential imports guarantee initialization order. Do not place an ordinary inline application script immediately after a module script and assume the module has executed.

- **Good for:** Quick, powerful AI-prototyping, demos, and testing in the browser, with explicit imports.
- **Drawbacks:** Also doesn't work offline, still single-point-of-failure, still no bundler optimizations.

## Quick, non-CDN setup

Download the monorepo as a ZIP-file (either a versioned release or the latest `main` branch): [Download latest `defuss` as ZIP](https://github.com/kyr0/defuss/archive/refs/heads/main.zip). Extract it and copy both `dist` folders to your project assets files.

Example:
```text
project/
├── assets/
│   └── js/
│       ├── defuss-morph/
│       │   └── all.min.js
│       └── defuss-query/
│           └── all.min.js
└── index.html
```

Then include the local bundles in your HTML:

```html
<body>
  <div id="app">Old content</div>

  <script type="module">
    await import("./assets/js/defuss-morph/all.min.js");
    const { df$ } = await import("./assets/js/defuss-query/all.min.js");

    df$("#app").html("<p>Hello from local assets</p>");
  </script>
</body>
```

This also works with the traditional `window.df$` global (see above).

- **Good for:** Offline-support, air-gapped environments, and locking the exact version you ship.
- **Drawbacks:** Manual updates — you need to re-download the ZIP to get a new version, and still no bundler optimizations.

## For production: Install via package manager

The most professional approach is to use a package manager: This allows for version-pinning, offline-support, and allows for optimized production builds using tree-shaking and minification.

We recommend [`bun`](https://bun.sh) only as a package manager and simple script runner.

```bash
bun add defuss-query defuss-morph
# or: npm install defuss-query defuss-morph
```

`defuss-morph` is the **single runtime peer dependency** (`^0.1.1`). The library entry is side-effect-free: it does not register a global or read `document` during import, so SSR imports are safe (DOM operations still require a document).

Then, in `.ts(x)` or `.js(x)` files:

```ts
import df$, { type DfQuery } from "defuss-query";

const buttons: DfQuery<HTMLButtonElement> = df$("button");

buttons.prop("disabled", false).on("click", function (event) {
  console.log(this.disabled, event.clientX);
});

// the full morph engine is right there on the same namespace:
df$.morph(document.body, "<main>Rendered by the peer dependency</main>");
```

ESM and CommonJS are shipped, with separate declaration resolution for each:

```js
const { df$ } = require("defuss-query");
```


## Bundle size

Direct jsDelivr ESM loading (`<script type="module">`), no build step needed:

```html
<script type="module">
  await import("https://cdn.jsdelivr.net/npm/defuss-morph@latest/dist/all.min.js");
  const { df$ } = await import("https://cdn.jsdelivr.net/npm/defuss-query@latest/dist/all.min.js");

  df$("#app").html("<p>Hello from the CDN</p>");
</script>
```

Or via the `df$` global — the query browser entry **upgrades** the morph object that the morph bundle registered into a callable function, retaining its own string/symbol properties and morph function identities:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/defuss-morph@latest/dist/all.min.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/defuss-query@latest/dist/all.min.js"></script>
<script type="module">
  df$("#app").html("<p>Hello from the CDN</p>");

  // previously captured references to the plain morph object cannot become
  // callable retroactively — its morph functions still work:
  const { morph, updateDomWithVdom } = window.df$;
</script>
```

**Load order:** morph first is the recommended order. Query first works too — selectors are available immediately, structural operations once morph becomes available — but requires **defuss-morph >= 0.1.1**, whose global loader preserves a function-valued `df$` (older morph builds overwrite it). Intrinsic Function fields and query's `fn`, `dom`, and `queryVersion` slots are reserved; a second query entry reuses the installed function; an unrelated existing `df$` function is rejected rather than silently destroyed.

`dist/global.min.js` is also supplied as a **classic script** that installs `globalThis.df$` — deterministic script loading without a module/defer race:

```html
<script type="module">
  await import("https://cdn.jsdelivr.net/npm/defuss-morph@latest/dist/all.min.js");
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/defuss-query@latest/dist/global.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
  df$("#app").text("Classic callable global installed");
</script>
```

For opt-in TypeScript globals, without making normal library imports pollute the global namespace:

```ts
import type {} from "defuss-query/global";
df$("button").prop("disabled", false);
df$.queueCallback(() => console.log("microtask"))();
```

## Examples

Runnable zero-build pages (serve the package directory statically, e.g. `bunx serve .` — or `bun run serve` inside the package for <http://127.0.0.1:8080>) then select `examples`folder:

| Example | What it shows |
| --- | --- |
| [`examples/index.html`](examples/index.html) | The callable `df$` end-to-end: keyed task list with identity-preserving reorders, literal user text, native duplicate FormData/submitter handling, and an awaited transition |

## Deliberate limitations

**Not a drop-in jQuery replacement:** native CSS selectors only — invalid selectors throw instead of being handled by a selector engine. No AJAX layer, Deferred, component runtime, reactive store, or effects framework.

**Events are native:** `.on()` calls `addEventListener` on each target, so order, `stopPropagation()`, non-bubbling events (`toggle`, `load`, `error`, …) and `event.currentTarget` behave exactly as without the facade. Morphing an element in place keeps its listeners; morph removing or replacing it, or `.remove()`, tears them down. `.off()` removes only listeners added by `.on()`. Only the capture option is supported; `.trigger()` dispatches a CustomEvent, not trusted input.

**Shadow boundaries:** querying does not pierce shadow roots — pass an explicit ShadowRoot context instead. Content mutation follows morph's rule for a normal element with an open shadow root; custom-element hosts retain light-DOM targeting.

**Inherited engine limitations remain inherited:** arbitrary SVG/MathML/template reconciliation follows defuss-morph.

## Size

| File | Size | Gzipped | Purpose |
| --- | ---: | ---: | --- |
| `index.js` + modules | See files | — | ESM/library build; used when installing via npm/bun |
| `cjs/index.js` + modules | See files | — | CommonJS build |
<!-- bundle-size:start -->
| `all.js` | 30.0 kB | 8.5 kB | Readable browser ESM + global installation; for CDN-based usage with debugging |
| `all.min.js` | 11.3 kB | **4.2 kB** | Minified browser ESM + global installation (Pareto-optimal when no bundler is used) |
| `global.min.js` | 11.1 kB | **4.1 kB** | Minified classic script; installs `globalThis.df$` without a module/defer race |
<!-- bundle-size:end -->

Sizes describe **query only**, not query plus the externally loaded morph engine. Release budgets (4.5 KiB gzip / 13,000 raw bytes per browser bundle) are enforced by the verifier; `dist/stats.json` is the machine-readable source (raw/gzip/Brotli).

## License

[MIT](LICENSE)
