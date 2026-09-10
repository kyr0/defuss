# defuss-morph

The [defuss](https://github.com/kyr0/defuss) DOM morphing engine as a standalone, dependency-free package.

The defuss DOM morphing algorithm is a standalone package: morph an HTML string or JSX object into an existing DOM tree using native APIs (`DOMParser`) and a smart DOM diffing algorithm.

## TL;DR

You don't need any complex framework like React, Vue, Solid, Angular, Svelte etc. to do DOM morphing. You don't even need a virtual DOM. You can simply get hold of a DOM element reference, and pass it new HTML or JSX to morph it into, and it works isomorphically everywhere - even without any complex transpilation or build step. Just include one `<script>` tag and you are ready to go.

Features:
- 🔄 Rendering & DOM-diff based patching of both HTML and JSX in the browser and on the server (isomorphic)
- 🎯 Key/id-aware node matching
- 📦 Move-not-replace
- 🩹 In-place attribute patching
- 📝 Form-state preservation
- 🧹 Event handlers preserved; supports delegated event listeners
- 🚫 No framework or virtual DOM needed
- 🤝 Works with any framework or library, or without any
- ⚡ No compile/transpile step required
- 🪶 Extremely lightweight — just 6 KiB minified and gzipped
- 🟦 Written in TypeScript
- Includes support for beautiful transitions (fade, slide, shake, custom styles)

## Quick, traditional CDN-based setup

The traditional way using `window.df$` globally exported API:

```html
<body>
  <div id="app">Old content</div>

  <!-- right before the closing </body> tag, include the CDN bundle -->
  <script type="module" src="https://cdn.jsdelivr.net/npm/defuss-morph@latest/dist/all.min.js"></script>
</body>
```

Then run:

```html
<script>
  const { morph } = window.df$;

  morph(document.getElementById("app"), "<p>Hello from the CDN</p>", { 
    transition: { type: "fade", duration: 200 } 
  });
</script>
```

- **Good for:** Quick, powerful AI-prototyping, demos, and testing in the browser.
- **Drawbacks:** Doesn't work offline, single-point-of-failure, no bundler optimizations.

## Quick, modern CDN-based setup using ESM imports

The modern way, using direct ESM imports from the CDN — no globals required:

```html
<body>
  <div id="app">Old content</div>

  <!-- right before the closing </body> tag, import via ESM -->
  <script type="module">
    import { morph } from "https://cdn.jsdelivr.net/npm/defuss-morph@latest/dist/all.min.js";

    morph(document.getElementById("app"), "<p>Hello from the CDN</p>", {
      transition: { type: "fade", duration: 200 }
    });
  </script>
</body>
```

- **Good for:** Quick, powerful AI-prototyping, demos, and testing in the browser, with explicit imports and no global namespace pollution.
- **Drawbacks:** Also doesn't work offline, still single-point-of-failure, still no bundler optimizations.

## Quick, non-CDN setup

Download this package as a ZIP-file (either a versioned release or the latest `main` branch): [Download latest `defuss-morph` as ZIP](https://github.com/kyr0/defuss-morph/archive/refs/heads/main.zip). Extract it and copy the `dist` folder to your project assets files. 

Example:
```text
project/
├── assets/
│   └── js/
│       └── defuss-morph/
│           └── all.min.js
└── index.html
```

Then include the local bundle in your HTML, using either the modern ESM import:

```html
<body>
  <div id="app">Old content</div>

  <script type="module">
    import { morph } from "./assets/js/defuss-morph/all.min.js";

    morph(document.getElementById("app"), "<p>Hello from local assets</p>", {
      transition: { type: "fade", duration: 200 }
    });
  </script>
</body>
```

This also works with the traditional  `window.df$` global (see above).

- **Good for:** Offline-support, air-gapped environments, and locking the exact version you ship.
- **Drawbacks:** Manual updates — you need to re-download the ZIP to get a new version, and still no bundler optimizations.

## For production: Install via package manager

The most professional approach is to use a package manager: This allows for version-pinning, offline-support, and allows for optimized production builds using tree-shaking and minification.

We recommend [`bun`](https://bun.sh) only as a package manager and simple script runner.

```bash
bun add defuss-morph
# or: npm install defuss-morph
```

Then, in `.ts(x)` or `.js(x)` files:

```ts
import { morph } from "defuss-morph";

const appEl = document.getElementById("app")!;

// only what actually changed is patched; untouched nodes keep
// their identity, focus, selection, scroll position and event state
morph(appEl, `<ul>
  <li key="a">Alpha</li>
  <li key="b">Beta</li>
</ul>`, { transition: { type: "fade", duration: 200 } });

morph(appEl, `<ul>
  <li key="b">Beta (updated)</li>
  <li key="a">Alpha</li>
</ul>`, { transition: { type: "slide-left", duration: 200 } });
```

If you have `bun` installed, you can serve your project directory statically with a single command:

```bash
bunx serve .
```

## API

### `morph(el: Element, newContent: string | VNode | VNode[]): void`

Morphs the children of `el` to match the given HTML string or JSX/VNode content.

- HTML strings are parsed with the element's own document (`el.ownerDocument`), so it works isomorphically (browser, happy-dom, ...) and across multiple documents/windows. VNode/JSX input is used directly.
- Matching is **key-aware** (`key` attribute) and **id-aware**; matched nodes are *moved*, never replaced, preserving DOM identity and element state.
- Same-tag elements are patched in place (attributes and children).
- **Event listeners survive**: because node identity is preserved, native `addEventListener` listeners keep working. Handlers registered via `registerDelegatedEvent` (or defuss JSX `onClick` props) are preserved too — an HTML string cannot declare handlers, so existing ones are treated like uncontrolled form state. Handlers of *removed* elements are cleaned up.
- Uncontrolled form state survives: an `<input>`'s live value is kept unless the new HTML explicitly sets `value`.
- Plain text input morphs as a text node.
- Morphs triggered from within an active morph (e.g. from lifecycle callbacks) on the same or an ancestor element are queued latest-wins and replayed after the active morph finishes.

### Morphing JSX (VNodes)

`morph()` accepts **either an HTML string or JSX / VNodes** — same API, same
algorithm. Strings are parsed with the native `DOMParser`; VNodes
(`{ type, attributes, children }` objects, as produced by any JSX factory)
are morphed directly:

```tsx
import { morph } from "defuss-morph";

// HTML string:
morph(document.getElementById("app")!, `<p>Hi</p>`);

// JSX / VNodes (any factory producing { type, attributes, children } works —
// e.g. defuss: import { jsx } from "defuss"; const vdom = <p>Hi</p>;)
morph(
  document.getElementById("app")!,
  <ul>
    <li key="a">Alpha</li>
    <li key="b">Beta</li>
  </ul>,
);
```

Unlike an HTML string, a VNode can carry real JavaScript values: explicit
booleans (`checked: false`), live values (`value: ""`), event handlers
(`onClick={...}`, registered as delegated events) and refs. In other words —
**controlled state and JSX event props only work through VNodes**, never
through HTML strings.

Under the hood, `morph()` delegates to `updateDomWithVdom` (the entry point
`defuss` itself uses), which is exported for direct/framework use.

### Partial updates (diff mode)

By default `morph()` reconciles the **complete** next state: anything you don't
describe, is removed. With `{ diff: true }` you send only a **change-set** — a
partial update addressed by `key` (preferred) or `id`:

Current DOM:
```html
  <ul id="listEl">
    <li key="a" data-x="1">A</li>
    <li key="b">B</li>
    <li key="c">C</li>
  </ul>
```

The change-set: only the nodes that change, each addressed by `key`/`id`:

```ts
const listEl = document.getElementById("listEl")!;
const changeSetHtml = `
  <li key="b">B (updated)</li>
  <li key="d">D (new)</li>
`;

morph(listEl, changeSetHtml, { diff: true });
```

New DOM:

```html
<ul id="listEl">
  <li key="a" data-x="1">A</li>   <!-- untouched -->
  <li key="b">B (updated)</li>    <!-- patched in place, attributes MERGED -->
  <li key="c">C</li>              <!-- untouched -->
  <li key="d">D (new)</li>        <!-- appended -->
</ul>
```

Result: `a` and `c` are **untouched** (identity, `data-x`, order, focus,
listeners all kept) even though the change-set never mentioned them; `b` is
patched — its text updates and declared attributes merge while undeclared ones
survive — and `d` is appended. Diff mode **never removes and never moves**
anything, so addressing stays unambiguous:

- Patch items must be addressed by `key`/`id` — plain text or key-less
  elements throw (there is no honest way to address "some `<div>`").
- A tag is only required for *new* (unmatched) items.
- Deleting is not expressible in a diff change-set — use a regular full
  `morph()` for that.
- A declared `children` replaces the node's children; if children are not
  declared, they stay untouched (via VNodes, `children: []` clears explicitly).
- A tag change on an addressed node applies as an in-place replacement.

Great for streaming/AI-driven UIs: patch one table row or status badge without
re-sending (or risking) the rest of the subtree. Runnable demo:
[`examples/diff-mode.html`](examples/diff-mode.html).

### Transitions

`morph()` accepts an optional transition, turning it into an async operation
(mirroring defuss' `updateDom` transition semantics):

```ts
await morph(appEl, "<p>Faded in</p>", {
  transition: { type: "fade", duration: 200 }, // slide-left | slide-right | shake | custom styles
});
```

Without a `transition` option, `morph()` is fully synchronous.

Overlapping updates are **latest-wins**: a plain `morph()` issued while a transition is in flight applies immediately and also rewrites the transition's pending content, so the transition completes with the latest HTML — never stale content. `await` the returned promise (or chain morphs into a queue) when you want the *animations* to play sequentially — see [`examples/transition-await.html`](examples/transition-await.html).

### Low-level primitives

The building blocks are exported for framework integration (used by `defuss` itself):

```ts
import {
  updateDomWithVdom,   // guarded VNode -> DOM morph entry point (globals optional,
                       // 4th arg mode: "replace" | "diff")
  replaceDomWithVdom,  // full replace (no patching)
  htmlStringToVNodes,  // HTML string -> VNode[]
  domNodeToVNode,      // DOM Node -> VNode
  getRenderer,         // VNode -> DOM renderer factory
  registerDelegatedEvent, removeDelegatedEvent, clearDelegatedEventsDeep, // ...
} from "defuss-morph";

// the third `globals` argument is optional everywhere — it is derived
// from the element's own document when omitted:
updateDomWithVdom(el, [{ type: "p", attributes: {}, children: ["hi"] }]);
```

## Bundle size

Direct jsDelivr ESM loading (`<script type="module">`), no build step needed:

```html
<script type="module">
  import { morph } from "https://cdn.jsdelivr.net/npm/defuss-morph@latest/dist/all.min.js";

  morph(document.getElementById("app"), "<p>Hello from the CDN</p>");
</script>
```

Or via the `df$` global — declared by the CDN bundle on load, no import statement required. `df$` carries the **full public API** (`morph`, `updateDomWithVdom`, `registerDelegatedEvent`, transitions, …); a pre-existing `df$` object is preserved and extended:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/defuss-morph@latest/dist/all.min.js"></script>
<script type="module">
  const { morph, updateDomWithVdom } = window.df$;

  morph(document.getElementById("app"), "<p>Hello from the CDN</p>");

  // explicit (controlled) form state — HTML can't express "unchecked":
  updateDomWithVdom(document.getElementById("app"), [
    { type: "input", attributes: { type: "checkbox", checked: false }, children: [] },
  ]); // globals optional: derived from the element's own document
</script>
```

A complete, runnable page lives at [`examples/cdn-global.html`](examples/cdn-global.html).

The `df$` global is only registered by the CDN bundle (`all.js` / `all.min.js`). The library entries (`index.mjs` / `index.cjs`, used by bundlers, Node and SSR) are side-effect-free.

## Examples

Runnable zero-build pages (serve the package directory statically, e.g. `bunx serve .`):

| Example | What it shows |
| --- | --- |
| [`examples/cdn-global.html`](examples/cdn-global.html) | The `df$` global end-to-end: morphing, keyed lists, controlled form state, delegated events, transitions |
| [`examples/controlled-form-state.html`](examples/controlled-form-state.html) | The "HTML can't uncheck" limitation and its fix via `df$.updateDomWithVdom` |
| [`examples/event-listener-preservation.html`](examples/event-listener-preservation.html) | Native + delegated listeners surviving morphs; handler cleanup on removal |
| [`examples/transition-await.html`](examples/transition-await.html) | Transitions: latest-wins content, `await`/queue patterns for sequencing animations |
| [`examples/diff-mode.html`](examples/diff-mode.html) | Diff mode: partial change-sets by key/id — merge-patch, append, untouched siblings |

## One limitation when morphing from HTML strings

**HTML cannot unset `checked`/live form values**: since an HTML string cannot declare "explicitly unchecked", absent form attributes are treated as uncontrolled and the live state is preserved. This is deliberate — it's what makes form state survive unrelated morphs.

When you *do* need explicit control, use [diff mode](#partial-updates-diff-mode) with a VNode patch item: address the node by `id` (or `key`) and send **only the new value** — a VNode can express an explicit `false`, and since the addressed node already exists, not even a tag is needed (it is borrowed from the match):

```ts
import { morph } from "defuss-morph";

const appEl = document.getElementById("app")!;

// ❌ stays checked — "no checked attribute" means "don't touch"
morph(appEl, `<input type="checkbox" id="c" checked>`); // checked in HTML
morph(appEl, `<input type="checkbox" id="c">`);         // still checked!

// ✅ diff mode: address by id, set the new value — done
morph(appEl, [{ attributes: { id: "c", checked: false } }], { diff: true });
```

The same rule applies to an `<input>`'s live `value`. See the runnable demos [`examples/controlled-form-state.html`](examples/controlled-form-state.html) and [`examples/diff-mode.html`](examples/diff-mode.html).

## Size

<!-- bundle-size:start -->
| File | Size | Gzipped | Purpose |
| --- | ---: | ---: | --- |
| `index.mjs` | 40.2 kB | 9.5 kB | ESM/library build; used when installing via npm/bun |
| `index.cjs` | 41.2 kB | 9.7 kB | CommonJS build |
| `all.js` | 41.6 kB | 9.8 kB | UMD build; for CDN-based usage with debugging |
| `all.min.js` | 18.9 kB | **6.8 kB** | Minified UMD build; for CDN-based usage without debugging (Pareto-optimal when no bundler is used) |
<!-- bundle-size:end -->

`index.cjs` (CommonJS) is kept for `require()` compatibility on older tool
chains (CJS jest configs, bundlers resolving `main`). On modern Node
(≥ 20.19 / 22.12, which can `require()` ESM directly) it is redundant — but at
~1 kB it is cheap insurance.

## License

[MIT](LICENSE)
