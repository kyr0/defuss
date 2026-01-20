# defuss Book

Reference documentation for LLMs and developers working with the defuss library.

## jsx() Function API

The `jsx()` function creates VNodes from JSX. **Important**: children must be passed via `attributes.children`, not as a separate argument.

### Correct Usage

```tsx
// ✅ Correct: children via attributes.children
jsx("div", { className: "wrapper", children: [<span>Hello</span>] });

// ✅ Also correct: JSX syntax handles this automatically
<div className="wrapper">
  <span>Hello</span>
</div>
```

### For Custom Elements

When dynamically creating custom elements, ensure children are in `attributes.children`:

```tsx
// ✅ Correct way to create custom elements dynamically
const customElement = (tagName: string, props: Record<string, any>, children?: any) => {
    return jsx(tagName, { ...props, children });
};

// Usage
customElement("my-component", { class: "wrapper" }, <span>Content</span>);
```

### jsx() Signature

```ts
jsx(
  type: VNodeType | Function,        // Tag name or component function
  attributes: { children?, ...},      // Props including children
  key?: string,                       // Optional key for reconciliation
  sourceInfo?: JsxSourceInfo         // Dev mode source info
): VNode | VNode[]
```

The 3rd argument is `key`, NOT children. This is a common mistake.

---

## Shadow DOM and Custom Elements

### How Morphing Works

defuss uses a hybrid approach for shadow DOM:

- **Custom elements** (tags containing `-`): morph **light DOM** (slotted content)
- **Regular elements with shadowRoot**: morph **shadow root**

This ensures slotted content updates correctly in web components while preserving shadow DOM behavior for other use cases.

### Slotted Content Updates

Slotted content lives in **light DOM**, not shadow DOM. When you render:

```tsx
<my-card>
  <span slot="header">Title</span>
  <p>Content</p>
</my-card>
```

The `<span>` and `<p>` are light DOM children that get projected into `<slot>` elements in the shadow DOM. defuss correctly updates these by targeting the parent element, not its shadowRoot.

---

## Render Functions

### renderInto (Recommended)

React-compatible render function for morphing JSX into a container:

```tsx
import { renderInto } from "defuss";

renderInto(<App />, document.getElementById("app"));
```

### render (Deprecated)

Alias for `renderInto`. Use `renderInto` instead - `render` will be removed in v4.

### Async render (client/server)

For async rendering with promises:

```tsx
import { render } from "defuss/render/client";
// or
import { render } from "defuss/render/server";

await render(<AsyncApp />, container);
```

---

## Fixed Issues (v3.0.0)

### 1. Duplicate render Export

**Problem**: `render` was exported from both `isomorph.ts` and `client.ts`/`server.ts`.

**Fix**: Renamed isomorph's render to `renderInto`, kept `render` as deprecated alias.

### 2. Side-Effect Logging

**Problem**: `console.log("defuss 3.0.0 alpha")` ran on every import, violating `sideEffects: false`.

**Fix**: Removed the console.log.

### 3. Router Popstate Stacking

**Problem**: `attachPopStateHandler()` added listeners without guard, stacking on hot reload.

**Fix**: Added `popAttached` boolean guard.

### 4. Unused AsyncProps.render

**Problem**: Dead API surface that was never called.

**Fix**: Removed the unused prop.

### 5. Undefined Nodes in createDomFromChild

**Problem**: Could return arrays with undefined, causing crashes on insertBefore.

**Fix**: Added `.filter(Boolean)` and updated return type to `Array<Node> | undefined`.

### 6. Custom Element Morphing

**Problem**: Shadow root was always targeted, breaking slotted content updates.

**Fix**: Hybrid selection - use light DOM for custom elements (hyphenated tags), shadow root for others.
