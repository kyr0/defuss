## `defuss-query` API

### `df$(input, context?)` — the factory

```ts
df$(".item");                         // native CSS query
df$<HTMLInputElement>(".field");      // explicit selector result type
df$("button", dialog);                // Document, Element, or DocumentFragment context
df$(element); df$(document); df$(window);
df$([a, b]); df$(nodeList); df$(new Set([a, b]));
df$("<button>Save</button>");         // detached construction; multiple roots allowed
df$({ type: "button", attributes: { class: "primary" }, children: ["Save"] });
df$(() => console.log("DOM ready"));
df$(); df$(null);                     // empty selection
```

Strings beginning with `<` after leading whitespace are markup; other strings are selectors. Arrays/iterables passed to the factory must contain native EventTargets, not VNodes. Insertions and morphs separately accept VNode content/arrays. Raw JSX syntax needs an application compiler; plain VNode objects and HTML do not.

### Collections: real Arrays with snapshot semantics

Selections are real Array subclasses with **snapshot membership**, unique targets, and stable encounter order. Traversal produces a new selection; setters return the original selection. `.find(css)` performs descendant queries; `.find(predicate)` preserves native Array behavior. `.map()`, `.slice()`, `.flat()`, and other species-based array methods return ordinary arrays. Native callbacks use `(element, index, array)`; `.each()` intentionally uses jQuery's `(index, element)` and binds `this` to the element. Returning `false` stops `.each()`.

Because this is a real Array, native mutators such as `.push()` can change membership and defeat initial deduplication. Prefer traversal/factory methods for managed selections. There is no hidden requery, live collection, `.end()` stack, selector waiter, or thenable collection.

### Reading and writing state

```ts
df$("img").attr("src");                  // first element; missing -> null
df$("img").attr("src", "/logo.png");     // sets every element; null removes
df$("input").prop("checked", true);      // live JS properties
df$("input").prop("innerHTML", "x");     // throws — use content methods instead
df$(".item").data("userId");             // camelCase dataset strings; null deletes
df$(".item").css({ color: "red" });      // inline style maps; getters read computed style
df$(".item").addClass("a b").toggleClass("c", force).removeClass();
df$("#agree").val();                     // e.g. "yes", not a boolean
df$("select[multiple]").val(["de", "en"]);
```

Value setters do not dispatch `input`/`change`. Checkbox/radio **value** and **checked state** stay distinct — use `.prop("checked", …)` for state. Non-empty file-input assignment follows the browser's native exception behavior.

### Forms: native FormData

```ts
const form = df$("#profile").form();       // native FormData, or throws
const repeated = form.getAll("interest"); // duplicate names preserved

await fetch("/profile", { method: "POST", body: form });
const queryString = df$("#profile").serialize(); // URL-encoded, files excluded
```

Native FormData preserves duplicate names and File values and applies native successful-control rules, including form-associated controls outside the form. Passing a submitter includes its native entry. `Object.fromEntries(form)` is lossy for repeated names; use `getAll()` or iterate entries when multiplicity matters. `.form()` throws unless the selection contains **exactly one form**. `.serialize()` deliberately excludes file entries instead of stringifying Files — it is not a byte-for-byte promise of jQuery serialization normalization.

### Content updates and morphing

`.morph(content, options?)`, `.html(content, options?)`, `.text(value)`, and `.empty()` route structural changes through the morph adapter: keyed/id matches preserve node identity, focus, selection, live form values and event handlers.

```ts
const list = df$("#list");
list.html('<li key="a">A</li><li key="b">B</li>');
const originalA = list.children().first()[0];

list.html('<li key="b">B updated</li><li key="a">A</li>');
console.assert(list.children().last()[0] === originalA); // identity kept

list.html('<li key="b">B patched</li>', { diff: true }); // partial change-set

// .html() accepts the same options as .morph(), including transitions:
await df$("#app").html("<p>Hello from the CDN</p>", {
  transition: { type: "fade", duration: 150, target: "self" },
});
```

Without a `transition` option, `.morph()` and `.html()` return the selection synchronously. Supplying `transition` always returns `Promise<selection>`, even `{ type: "none" }`. Errors/rejections propagate; multi-target completion uses `Promise.all`. The engine's latest-wins transition handling remains in control.

`.text(userInput)` uses **literal VNode text**, not HTML parsing — user input is safe from markup interpretation. `.html()`/markup construction are not sanitizers: never interpolate untrusted strings into HTML; use text setters or a separately chosen sanitizer/Trusted Types policy.

### Insertions and structural operations

```ts
const button = df$("<button>Save</button>").on("click", save);
button.appendTo("#toolbar");
df$(".target").append(button);
df$("#old").replaceWith("<section>Replacement</section>");
```

In a multi-target insertion, existing native nodes are cloned for earlier targets and the originals move to the **last** target. Markup/VNodes are constructed independently per target. Native `cloneNode(true)` does **not** copy registered listeners or arbitrary JS properties; for multiple interactive copies use VNodes with event props.

Insertion methods return the original target selection; `.appendTo()` instead returns all inserted nodes. Live NodeLists and DocumentFragments are snapshotted before writes. No complete parent subtree is serialized/remorphed to implement an append. Cleanup uses morph's delegated-event cleanup; moves do not clear listeners.

### Events

```ts
df$(".item").on("click", handler);            // delegated through morph
df$(".item").on("one two", handler);          // space-separated types
df$(".item").off("click", handler).off();     // by handler, type, or all
df$(".item").trigger("custom", { n: 3 });     // bubbling CustomEvent
```

Element `.on()` delegates through morph with `multi: true`; there is no second element event registry. Handlers are called with `this` set to the selected element. The supplied Event remains native: **`event.currentTarget` can be the delegation root**, not that element — use a normal function's `this` or an explicit captured reference.

Only capture (`true` or `{ capture: true }`) is supported by `.on()`; `once`, `passive`, `signal`, selector-based delegation, namespaces and `return false` shorthand are not advertised — unsupported option keys throw; use native `addEventListener` for those. Document/Window/other non-element EventTargets use native listeners plus a small cleanup registry.

`.trigger(type, detail)` dispatches a fresh native CustomEvent with `bubbles: true`, `cancelable: true`, and default `composed: false`. It does not promise native activation, trusted input, or propagation through shadow boundaries.

### Method overview

| Area | Methods and behavior |
| --- | --- |
| Collection | `[i]`, `.length`, iterator, `.get()` / `.toArray()` copies, `.get(i)`, `.eq(i)`, `.first()`, `.last()`, `.each(fn)`; negative indices supported |
| Traversal | `.find(css)`, `.filter(css \| fn)`, `.is(css)`, `.closest(css)`, `.parent()`, `.children(css?)`, `.next()`, `.prev()`; results deduplicated in encounter order, not globally document-sorted |
| Attributes | `.attr(name)` reads the first selected element; missing attribute is `null`, empty/non-element first target is `undefined`; `.attr(name, value)` sets every element, `null` removes |
| Properties | `.prop(name)` / `.prop(name, value)` use native JS properties; explicit `undefined` is assignable; structural `innerHTML`, `outerHTML`, `textContent`, `innerText` setters are rejected in favor of content methods |
| Data | `.data(name)` / `.data(name, value)` use native camelCase `dataset` keys; values are strings, `null` deletes; no jQuery cache or JSON coercion |
| Styles | `.css(name)`, `.css(name, stringOrNull)`, `.css(object)`; getters use fresh computed style, setters use inline style; camelCase and custom properties supported; no implicit `px`, numeric shorthand, or priority parameter |
| Classes | `.addClass(names)`, `.removeClass(names?)`, `.toggleClass(names, force?)`, `.hasClass(name)`; names accept whitespace strings/string arrays; no-argument removal clears classes; membership predicates are existential |
| Values | `.val()` / `.val(value)` use native control properties; getter returns the first supported control's string or multiple-select string array; setter accepts string, number, null, or string array |
| Reconciliation | `.morph(content, options?)`, `.html(content, options?)`, `.text(value)`, `.empty()`; structural content changes go through the morph adapter |
| Content reads | `.html()` reads first element's content or `undefined`; `.text()` concatenates selected nodes' text and returns `""` for an empty selection |
| Exact structural operations | `.append()`, `.prepend()`, `.before()`, `.after()`, `.replaceWith()`, `.remove()`, `.appendTo(target)` |
| Events | `.on(type, handler, capture?)`, `.off(type?, handler?)`, `.trigger(type, detail?)`; space-separated types accepted by on/off |
| Forms | `.form(submitter?)` returns native FormData; `.serialize(submitter?)` returns URLSearchParams encoding of string entries, excluding files |

Element-only methods ignore non-element targets unless their documented method needs an exact type. `.text(value)` additionally updates native Text/CDATA targets without replacing their identities. `.html()`, `.empty()`, and `.morph()` operate on elements, not Document/DocumentFragment roots. Querying and exact insertion do support DocumentFragment/ShadowRoot contexts.

### Explicit dependency injection

```ts
import * as morph from "defuss-morph";
import { createDf$ } from "defuss-query/core";

const df$ = createDf$(morph);
```

The core has no runtime morph import. `df$.fn` is the shared `DfQuery.prototype`; `df$.dom` exposes the structural adapter. Normal library imports retain every public morph static, not just the subset used internally.
