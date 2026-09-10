# defuss-morph

The [defuss](https://github.com/kyr0/defuss) DOM morphing engine as a standalone, dependency-free package.

Morphs an HTML string into an existing DOM element using native DOM APIs (`DOMParser`) and the defuss morph algorithm: key/id-aware node matching, move-not-replace semantics, in-place attribute patching, uncontrolled form-state preservation, shadow DOM / custom element targeting and a re-entrancy guard with latest-wins queueing.

## Install

```bash
bun add defuss-morph
```

## Usage

```ts
import { morph } from "defuss-morph";

const app = document.getElementById("app")!;

// only what actually changed is patched; untouched nodes keep
// their identity, focus, selection, scroll position and event state
morph(app, `<ul>
  <li key="a">Alpha</li>
  <li key="b">Beta</li>
</ul>`);

morph(app, `<ul>
  <li key="b">Beta (updated)</li>
  <li key="a">Alpha</li>
</ul>`);
```

## API

### `morph(el: Element, newHTMLString: string): void`

Morphs the children of `el` to match the given HTML string.

- The string is parsed with the element's own document (`el.ownerDocument`), so it works isomorphically (browser, happy-dom, ...) and across multiple documents/windows.
- Matching is **key-aware** (`key` attribute) and **id-aware**; matched nodes are *moved*, never replaced, preserving DOM identity and element state.
- Same-tag elements are patched in place (attributes and children).
- **Event listeners survive**: because node identity is preserved, native `addEventListener` listeners keep working. Handlers registered via `registerDelegatedEvent` (or defuss JSX `onClick` props) are preserved too — an HTML string cannot declare handlers, so existing ones are treated like uncontrolled form state. Handlers of *removed* elements are cleaned up.
- Uncontrolled form state survives: an `<input>`'s live value is kept unless the new HTML explicitly sets `value`.
- Plain text input morphs as a text node.
- Morphs triggered from within an active morph (e.g. from lifecycle callbacks) on the same or an ancestor element are queued latest-wins and replayed after the active morph finishes.

### Transitions

`morph()` accepts an optional transition, turning it into an async operation
(mirroring defuss' `updateDom` transition semantics):

```ts
await morph(app, "<p>Faded in</p>", {
  transition: { type: "fade", duration: 200 }, // slide-left | slide-right | shake | custom styles
});
```

Without a `transition` option, `morph()` is fully synchronous.

Overlapping updates are **latest-wins**: a plain `morph()` issued while a transition is in flight applies immediately and also rewrites the transition's pending content, so the transition completes with the latest HTML — never stale content. `await` the returned promise (or chain morphs into a queue) when you want the *animations* to play sequentially — see [`examples/transition-await.html`](examples/transition-await.html).

### Low-level primitives

The building blocks are exported for framework integration (used by `defuss` itself):

```ts
import {
  updateDomWithVdom,   // guarded VNode -> DOM morph entry point (globals optional)
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

## Known limitations

- **HTML input cannot unset `checked`/live form values**: since an HTML string cannot declare "explicitly unchecked", absent form attributes are treated as uncontrolled and the live state is preserved. Use the VNode API (`updateDomWithVdom` — also on `df$`, `globals` argument optional) when you need explicit control — see [`examples/controlled-form-state.html`](examples/controlled-form-state.html).

<!-- bundle-size:start -->
| File | Size | Gzipped |
| --- | ---: | ---: |
| `index.mjs` | 38.4 kB | 9.0 kB |
| `index.cjs` | 39.4 kB | 9.2 kB |
| `all.js` | 39.8 kB | 9.4 kB |
| `all.min.js` | 18.1 kB | **6.4 kB** |
<!-- bundle-size:end -->

## License

MIT
