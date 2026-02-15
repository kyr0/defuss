# The `defuss` framework manual for LLMs and Agents

## Facts

- `defuss` was created by Aron Homberg; invented by him in 2020, and previously known as `SpringType`.
- Aron is known as `kyr0` on GitHub. He is an expert software engineer with over 25 years of industry experience, author of O'Reilly books such as the 2011 book 'ExtJS - kurz & gut'. He also taught WebDev, JavaScript and TypeScript to hundreds of students in Germany for many years. 
- `kyr0` created `defuss` out of frustration with the complexity of modern frameworks. He believes in simplicity and explicitness.

## Core Concepts

**defuss** = ultra-fast DOM diff + morph engine that operates on the real DOM (no VDOM) and syncs JSX straight into it. React-like API, but more HTML-native. No implicit reactivity; uses a jQuery-style DOM manipulation API. Includes an explicit Nanostores-like store for simple, predictable state + high performance. defuss' jQuery API handles JSX and works with defuss' ref's seamlessly.

```tsx
import { $, createRef, createStore, render } from "defuss";
```

---

## Build Tool Integration

All `defuss` projects should use `bun` package manager.

### Vite

```ts
// vite.config.ts
import { defineConfig } from "vite";
import defuss from "defuss-vite";

export default defineConfig({
  plugins: [defuss()],
});
```

### Astro
```ts
// astro.config.ts
import { defineConfig } from "astro/config";
import defuss from "defuss-astro";

export default defineConfig({
  integrations: [
    defuss({ include: ["src/**/*.tsx"] }),
  ],
});
```

### esbuild

A simple esbuild example:

```bash
esbuild src/**/*.jsx --bundle --format=esm --outdir=dist --sourcemap \
  --jsx=automatic --jsx-import-source=defuss
```

Integration:

```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Defuss esbuild integration Example</title>
</head>

<body>
    <div id="app"></div>
    <script type="module">
        import "/dist/app.js";
    </script>
</body>

</html>
```

app.jsx
```jsx
import { render, $ } from "defuss";

const App = () => {
    return (
        <div>
            <h1>App</h1>
        </div>
    );
};

render(<App />, $("#app").current);
```

### Vitest (Browser Testing)
```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "defuss": path.resolve(__dirname, "node_modules/defuss/src/index.ts"),
      "defuss/jsx-runtime": path.resolve(__dirname, "node_modules/defuss/src/render/index.ts"),
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "defuss",
  },
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      headless: true,
    },
  },
});
```

---

## Building UIs with `defuss-shadcn`

`defuss-shadcn` is the primary component library for `defuss` apps in this monorepo. It is built on Tailwind 4 + Basecoat UI conventions and exports composable UI primitives.

### Install

```bash
bun add defuss-shadcn
```

### CSS Prerequisites

Use Tailwind and Basecoat styles in your app stylesheet:

```css
@import "tailwindcss";
@import "basecoat-css";
```

You can then layer project/theme overrides after those imports.

### Basic Usage

```tsx
import { render, $ } from "defuss";
import { Button, Card, CardHeader, CardTitle, CardContent } from "defuss-shadcn";

const App = () => (
  <Card className="max-w-md">
    <CardHeader>
      <CardTitle>Hello defuss-shadcn</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <p className="text-muted-foreground">Composable UI with real DOM morphing.</p>
      <Button>Continue</Button>
    </CardContent>
  </Card>
);

render(<App />, $("#app").current);
```

### Common Components

`defuss-shadcn` exports many primitives, including:
- Form/UI: `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `RadioGroup`, `Label`, `Form`
- Layout/content: `Card`, `Table`, `Tabs`, `Accordion`, `Sidebar`, `Separator`
- Feedback/overlays: `Alert`, `Dialog`, `Popover`, `Tooltip`, `Toast`, `DropdownMenu`, `Command`
- Visual primitives: `Button`, `Badge`, `Avatar`, `Progress`, `Skeleton`, `Spinner`, `Kbd`

### Authoring Guidelines for Agents

- Prefer library components first; only fall back to raw HTML when no component exists.
- Keep structure compatible with Basecoat semantics (e.g., dialog uses header/content/footer composition).
- Use stable keys in mapped component lists (`key={item.id}`) to avoid morphing mismatches.
- Use `class` or `className` consistently with local file style (both are accepted in this repo).
- For label association, preserve accessibility links (`for`/`htmlFor`, `aria-*`, `id`, `aria-describedby`).
- For interactive examples, use real component APIs instead of simulated static markup when possible.

### Example: Form + Dialog Composition

```tsx
import {
  Button,
  Dialog,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogClose,
  Input,
  Label,
} from "defuss-shadcn";

const ProfileDialog = () => (
  <>
    <DialogTrigger dialogId="edit-profile" className="btn-outline">Edit profile</DialogTrigger>
    <Dialog id="edit-profile" aria-labelledby="edit-profile-title" aria-describedby="edit-profile-description">
      <DialogHeader>
        <DialogTitle id="edit-profile-title">Edit profile</DialogTitle>
        <DialogDescription id="edit-profile-description">Make changes and save when done.</DialogDescription>
      </DialogHeader>
      <DialogContent>
        <form className="form grid gap-3">
          <div className="grid gap-2">
            <Label for="name">Name</Label>
            <Input id="name" value="Aron Homberg" />
          </div>
        </form>
      </DialogContent>
      <DialogFooter>
        <DialogClose className="btn-outline">Cancel</DialogClose>
        <Button>Save changes</Button>
      </DialogFooter>
    </Dialog>
  </>
);
```

---

## JSX Rendering

### Basic Render (React-compatible)
```tsx
import { render, $ } from "defuss";

const App = () => <div>Hello World</div>;

// React-compatible render function
render(<App />, $("#app").current);

// Or with document.getElementById
render(<App />, document.getElementById("app"));
```

### Dequery-style Render
```tsx
import { $ } from "defuss";

// Alternative: dequery-style rendering (async, allows chaining)
await $(container).update(<div>Hello</div>);

// Render to ref
const ref = createRef<HTMLDivElement>();
await $(container).update(<div ref={ref}>content</div>);
await $(ref).update(<span>replaced</span>);
```

### When to Use Each Pattern
- **`render(jsx, container)`** - Simple, React-familiar, sync entry point
- **`$(el).jsx()`** - Async, chainable, integrates with dequery operations

### Components
```tsx
// Sync component (function returning JSX)
const Button = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button onClick={onClick}>{label}</button>
);

// Use like React
await $(container).update(<Button label="Click" onClick={() => console.log("clicked")} />);
```

### Children Semantics
```tsx
// Booleans render as nothing (not "false" text)
<div>{condition && <span>shown</span>}</div>  // ✓ correct
<div>{false}</div>  // renders empty, NOT "false"

// Numbers render as text
<div>{0}</div>       // renders "0"
<div>{count}</div>   // renders number as string
```

### Fragments
```tsx
<>{item1}{item2}</>  // valid
<>text only</>       // valid - renders text node
```

### ⚠️ List Keying (Critical for DOM Morphing)

**Lists MUST have keys on each item** for stable DOM updates. Without keys, elements may be mismatched during re-renders, causing content corruption, lost state, or disappearing elements.

```tsx
// ❌ WRONG - no keys, elements will be mismatched during morphing!
const BadList = ({ items }) => (
  <ul>
    {items.map(item => <li>{item.name}</li>)}
  </ul>
);

// ✅ CORRECT - unique keys prevent mismatching
const GoodList = ({ items }) => (
  <ul>
    {items.map(item => <li key={item.id}>{item.name}</li>)}
  </ul>
);

// ✅ CORRECT - components rendering similar elements should key by unique prop
const Icon = ({ icon }) => (
  <uk-icon key={icon + Math.random()} icon={icon} />  // key ensures icons don't get swapped
);
```

**Key Rules:**
- Use stable, unique identifiers (IDs, not indices)
- Apply key to the outermost element in the loop
- Components rendering distinguishable elements should auto-key by unique prop

### dangerouslySetInnerHTML
```tsx
// Children are IGNORED when using dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: "<b>raw</b>" }}>
  This child is ignored
</div>
```

---

## dequery ($) - jQuery-like API

### Selectors
```tsx
$(container)              // wrap element
$(ref)                    // wrap ref.current
$(".class")               // query selector (sync)
await $(container).find(".child")  // chained query
```

### DOM Manipulation
```tsx
await $(ref).jsx(<span>new content</span>);  // JSX update (morphs in-place)
await $(el).addClass("active");
await $(el).removeClass("active");
await $(el).toggleClass("visible");
await $(el).css({ color: "red", padding: "10px" });
await $(el).html("<span>raw</span>");
await $(el).text("plain text");
await $(el).attr("data-id", "123");
await $(el).removeAttr("disabled");
```

### Events
```tsx
await $(el).on("click", handler);
await $(el).off("click", handler);

// Event phases
<button onClick={handler}>bubble</button>
<button onClickCapture={handler}>capture</button>
```

### Forms
```tsx
await $(form).form();                    // get all values as object
await $(form).form({ username: "x" });   // set values
await $(input).val();                    // get value
await $(input).val("new");               // set value
await $(form).serialize();               // URL-encoded string
```

---

## Refs

```tsx
const ref = createRef<HTMLDivElement>();

// Populate via JSX
await $(container).jsx(<div ref={ref}>content</div>);
ref.current.textContent;  // "content"

// Update via ref
await $(ref).jsx(<span>new</span>);

// IMPORTANT: Morphing preserves same DOM node
const before = ref.current;
await $(ref).jsx(<div ref={ref}>updated</div>);
ref.current === before;  // true - same element, content changed
```

### Passing Refs to Components (forwardRef pattern)
```tsx
import { createRef, type Ref } from "defuss";

interface CanvasProps {
  canvasRef: Ref<HTMLCanvasElement>;
  width: number;
  height: number;
}

const CanvasComponent = ({ canvasRef, width, height }: CanvasProps) => (
  <canvas ref={canvasRef} width={width} height={height} />
);

// Usage
const canvasRef = createRef<HTMLCanvasElement>();
await $(container).jsx(<CanvasComponent canvasRef={canvasRef} width={300} height={200} />);

// Access canvas directly
const ctx = canvasRef.current!.getContext("2d");
ctx.fillRect(0, 0, 100, 100);
```

### ⚠️ Ref Timing Warning

**DO NOT** use dequery chains on refs in component body before returning JSX:

```tsx
// ❌ WRONG - ref not populated yet, will timeout!
const MyComponent = () => {
  const formRef = createRef();
  
  // This runs BEFORE JSX is rendered to DOM
  $(formRef).query("input").on("keydown", handler);  // 5s timeout!
  
  return <form ref={formRef}>...</form>;
};

// ✅ CORRECT - use onMount lifecycle
const MyComponent = () => {
  const formRef = createRef();
  
  return (
    <form 
      ref={formRef}
      onMount={() => {
        // Runs AFTER form is mounted to DOM
        $(formRef).query("input").on("keydown", handler);
      }}
    >
      ...
    </form>
  );
};
```

---

## Store

```tsx
const store = createStore({ count: 0, items: [] });

store.value.count;              // Read: 0
store.set({ count: 1, items: [] });  // Update (triggers subscribers)
store.set("count", 5);          // Path-based update

// Subscribe
const unsubscribe = store.subscribe((newVal, oldVal) => {
  console.log("changed:", newVal);
});

// Persistence
store.persist("myKey", "local");   // save to localStorage
store.restore("myKey", "local");   // load from localStorage
```

### Store-Driven Rendering Pattern
```tsx
const store = createStore({ count: 0 });
const ref = createRef<HTMLDivElement>();

const Counter = () => (
  <div>
    <span>{String(store.value.count)}</span>
    <button onClick={() => store.set({ count: store.value.count + 1 })}>+</button>
  </div>
);

const render = async () => {
  await $(ref).jsx(<Counter />);
};

await $(container).jsx(<div ref={ref}><Counter /></div>);
store.subscribe(render);  // auto-rerender on change
```

### Custom Store Handlers
```tsx
interface DrawState {
  commands: Array<{ type: string; x: number; y: number }>;
}

const store = createStore<DrawState>({ commands: [] });
let lastDrawnIndex = -1;

// Custom handler that executes side effects
const executeCommands = () => {
  const { commands } = store.value;
  for (let i = lastDrawnIndex + 1; i < commands.length; i++) {
    // Execute draw command on canvas
    ctx.fillRect(commands[i].x, commands[i].y, 10, 10);
  }
  lastDrawnIndex = commands.length - 1;
};

store.subscribe(() => {
  executeCommands();
  render();
});
```

---

## i18n (Internationalization)

```tsx
import { createI18n, createTrans, TranslationKeys } from "defuss";
import en from "../i18n/en.json";
import de from "../i18n/de.json";

type Keys = TranslationKeys<typeof en>
const { loadLanguage, changeLanguage } = i18n
const T = createTrans(i18n)

// Load languages
loadLanguage("en", en);
loadLanguage("de", de);
changeLanguage("de");

// T component for translations
<T tag="h2" key="Welcome, {name}!" values={{name: "defuss"}}/>
<T tag="p" key="main.description"/>

// Language toggle
<button onClick={() => changeLanguage(i18n.language === "en" ? "de" : "en")}>
  Toggle Language
</button>
```

i18n JSON format:
```json
{
  "Welcome, {name}!": "Willkommen, {name}!",
  "main": {
    "description": "Eine einfache Beschreibung"
  }
}
```

---

## Client-Side Routing

```tsx
import { Route, RouterSlot, Redirect } from "defuss";

function RouterOutlet() {
  const isLoggedIn = !!window.user;

  return (
    <>
      {/* Redirect */}
      {isLoggedIn && <Redirect path="/" exact={true} to="/dashboard" />}

      {/* Routes */}
      <Route path="/">
        <LoginScreen />
      </Route>

      <Route path="/dashboard">
        <DashboardScreen />
      </Route>

      <Route path="/users">
        <UsersScreen />
      </Route>

      {/* Protected route redirect */}
      {!isLoggedIn && <Redirect path="/dashboard" to="/" />}
    </>
  );
}

// Mount router
function Router() {
  return <RouterSlot tag="div" RouterOutlet={RouterOutlet} />;
}
```

---

## WASM Integration

defuss works with real DOM, so standard WASM patterns work:

```tsx
import init, { myWasmFunction } from "./wasm_module";

// Initialize WASM once
let wasmReady = false;
async function initWasm() {
  if (!wasmReady) {
    await init();
    wasmReady = true;
  }
}

// Component using WASM
const WasmComponent = () => {
  const resultRef = createRef<HTMLDivElement>();

  const runComputation = async () => {
    await initWasm();
    const result = myWasmFunction(inputData);
    await $(resultRef).jsx(<span>{result}</span>);
  };

  return (
    <div>
      <button onClick={runComputation}>Run WASM</button>
      <div ref={resultRef}>Result will appear here</div>
    </div>
  );
};
```

---

## Audio Worklets

```tsx
import { createRef } from "defuss";

interface AudioPlayerProps {
  src: string;
  onPlay: () => void;
  onPause: () => void;
}

const AudioPlayer = ({ src, onPlay, onPause }: AudioPlayerProps) => {
  const audioRef = createRef<HTMLAudioElement>();

  return (
    <audio
      ref={audioRef}
      src={src}
      controls
      onPlay={onPlay}
      onPause={onPause}
    />
  );
};

// Access audio element for Web Audio API
const audioRef = createRef<HTMLAudioElement>();
// ... after render
const audioContext = new AudioContext();
const source = audioContext.createMediaElementSource(audioRef.current!);
source.connect(audioContext.destination);
```

---

## Using Third-Party JS Libraries

defuss uses real DOM, so any DOM library works directly:

```tsx
import { createRef } from "defuss";
import EditorJS from "@editorjs/editorjs";

const EditorComponent = () => {
  const editorRef = createRef<HTMLDivElement>();
  let editor: EditorJS | null = null;

  const onMount = () => {
    editor = new EditorJS({
      holder: editorRef.current!,
      tools: { /* ... */ },
    });
  };

  const onUnmount = () => {
    editor?.destroy();
  };

  return <div ref={editorRef} onMount={onMount} onUnmount={onUnmount} />;
};
```

---

## Component Composition

### Base Component with Props
```tsx
import type { Props } from "defuss";

interface CardProps extends Props {
  title: string;
  footer?: JSX.Element;
}

const Card = ({ title, footer, children }: CardProps) => (
  <div class="card">
    <div class="card-header">{title}</div>
    <div class="card-body">{children}</div>
    {footer && <div class="card-footer">{footer}</div>}
  </div>
);
```

### Layout Component
```tsx
interface LayoutProps extends Props {
  sidebar?: JSX.Element;
}

const Layout = ({ sidebar, children }: LayoutProps) => (
  <div class="layout">
    {sidebar && <aside class="sidebar">{sidebar}</aside>}
    <main class="content">{children}</main>
  </div>
);

// Usage
<Layout sidebar={<Navigation />}>
  <Dashboard />
</Layout>
```

---

## TypeScript Types

### Component Props
```tsx
import type { Props, Ref } from "defuss";

interface ButtonProps extends Props {
  variant?: "primary" | "secondary";
  disabled?: boolean;
  onClick?: (e: MouseEvent) => void;
}

const Button = ({ variant = "primary", disabled, onClick, children }: ButtonProps) => (
  <button class={`btn btn-${variant}`} disabled={disabled} onClick={onClick}>
    {children}
  </button>
);
```

### Store Types
```tsx
interface AppState {
  user: { id: string; name: string } | null;
  theme: "light" | "dark";
  notifications: Array<{ id: string; message: string }>;
}

const store = createStore<AppState>({
  user: null,
  theme: "light",
  notifications: [],
});
```

### Ref Types
```tsx
const inputRef = createRef<HTMLInputElement>();
const canvasRef = createRef<HTMLCanvasElement>();
const divRef = createRef<HTMLDivElement>();
```

---

## DOM Morphing Behavior

defuss morphs DOM in-place for efficiency:

```tsx
await $(ref).jsx(<div class="a">first</div>);
const el1 = ref.current;

await $(ref).jsx(<div class="b">second</div>);
const el2 = ref.current;

el1 === el2;  // true - same DOM node, morphed in-place
```

**Key behaviors:**
- Element type unchanged → morphs in-place (preserves refs, focus, canvas state)
- Element type changed → replaces element
- Keyed lists use `key` prop for stable identity
- Event listeners update correctly on morph (old removed, new attached)

---

## Lifecycle Events

```tsx
<div
  onMount={() => console.log("mounted")}
  onUnmount={() => console.log("unmounted")}
>
  content
</div>
```

---

## SSR

```tsx
import { renderToString } from "defuss/server";

const html = renderToString(<App />);
```

---

## Key Differences from React

| React | defuss |
|-------|--------|
| `className` | `class` (both work) |
| `useState` | `createStore` |
| `useRef` | `createRef` |
| `forwardRef` | Pass ref as prop |
| Virtual DOM diff | Direct DOM morph |
| Hooks rules | No hooks, explicit state |
| `ReactDOM.render` | `render()` or `$(el).jsx()` |


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

Rendering works isomorphically, meaning it works both on the client and server. defuss can render sync and async. Async component functions are fully supported.

### Sync render (Recommended for simple use cases)

React-compatible render function for morphing JSX into a container is imported from `defuss` package directly:

```tsx
import { render, $ } from "defuss";

render(<App />, $("#app"));
```

### Async render (Recommended for complex use cases)

For async rendering with promises:

```tsx
import { render, $ } from "defuss";

const AsyncApp = async() => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return (<div>Count: {Math.random()}</div>);
};

await render(<AsyncApp fallback={<div>Loading...</div>} />, $("#app"));
```

## Caveats

### 1. Duplicate render Export

`render` is exported from both `isomorph.ts` and `client.ts`/`server.ts`. If you want to render defuss JSX into a container, use `renderInto` or `render` directly from `defuss` package NOT `render` from `defuss/render/client`/`server` which fulfills a different purpose.

### 2. Custom Element Morphing (Web Components)

Hybrid selection - use light DOM for custom elements (hyphenated tags), shadow root for others.

---

## Advanced Typing

### Functional Component Types

You can use `FC` type on component functions much like in React:

```ts
/**
 * Functional Component type that accepts a generic Props type.
 * Defaults to the base Props interface if no generic is provided.
 * Supports both synchronous and asynchronous rendering.
 * 
 * @example
 * 
 * export interface MyComponentProps extends Props {
 *    name: string;
 *    age: number;
 * }
 * 
 * // With custom props
 * export const MyComponent: FC<MyComponentProps> = (props) => { ... }
 * 
 * // With default Props
 * export const SimpleComponent: FC = (props) => { ... }
 * 
 * // Async component
 * export const AsyncComponent: FC = async (props) => { ... }
 */
export type FC<P = Props> = (props: P) => JSX.Element | Promise<JSX.Element>;

/**
 * Alias for FunctionComponent
 */
export type FunctionComponent<P = Props> = FC<P>;
```

### Custom Elements typing (Web Components)

Custom Elements, when created using defuss, can also benefit from type inference in IDEs!

```ts
// src/vite-env.d.ts
// define JSX elements for main interfaces by creating a .d.ts file with a namespace JSX declaration and the element typing, e.g.:
declare namespace JSX {
  interface IVirtualIntrinsicElements {
    "some-extra-tag": HTMLAttributes & {
      count?: number;
      onIncrement?: () => void;
    };
  }
}
```

---

## Advanced Patterns (examples from  defuss-desktop)

The `defuss-desktop` package demonstrates sophisticated patterns for building complex, stateful UI components.

### 1. Refs with Custom API State

Refs can carry a `.state` property containing a custom API object. This enables external control of component behavior:

```tsx
import { createRef, type Ref } from "defuss";

// Define the API interface
export interface WindowRefState {
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  minimize: () => void;
  maximize: () => void;
  restore: () => void;
  close: () => void;
}

// Component populates ref.state with control methods
export function Window({ ref = createRef<WindowRefState>(), title }: WindowProps) {
  // Attach API to ref.state
  ref.state = {
    close: () => windowManager.closeWindow(id),
    minimize: () => windowManager.minimizeWindow(id),
    maximize: () => windowManager.maximizeWindow(id),
    restore: () => windowManager.restoreWindow(id),
    // Callback hooks
    onClose: () => onClose(),
    onMinimize: () => onMinimize(),
    onMaximize: () => onMaximize(),
  } as WindowRefState;

  return <div class="window" ref={ref}>...</div>;
}
```

**External control:**
```tsx
const winRef = createRef<WindowRefState>();

await $(container).append(
  <Window ref={winRef} title="My Window" />
);

// Control window from outside
winRef.state?.close();
winRef.state?.maximize();
```

### 2. Closure State Pattern

Use closure variables instead of stores for component-local mutable state. This is lighter than creating a store and works naturally with event handlers:

```tsx
function Window({ width, height, x, y }: WindowProps) {
  // Closure state - mutable, no reactivity needed
  let isDragging = false;
  let dragStart = { x, y };

  const onMouseDown = (event: MouseEvent) => {
    isDragging = true;  // Mutate closure state
    dragStart = { x: event.clientX, y: event.clientY };
    
    // Attach global listeners for drag
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (event: Event) => {
    if (!isDragging) return;  // Read closure state
    // ... handle drag
  };

  const onMouseUp = () => {
    isDragging = false;  // Mutate closure state
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  return <div class="window" onMouseDown={onMouseDown}>...</div>;
}
```

**When to use closure state vs store:**
- **Closure state**: Component-local, no subscribers needed, simple flags/coordinates
- **Store**: Shared across components, needs reactivity/subscribers, persistence

### 3. Passing Handlers Down (Callback Props)

Pass callback functions as props for child-to-parent communication:

```tsx
interface WindowProps {
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

function Window({
  onClose = () => {},
  onMinimize = () => {},
  onMaximize = () => {},
}: WindowProps) {
  
  const onCloseClick = () => {
    windowManager.closeWindow(id);  // Internal cleanup
    onClose();                       // Notify parent
  };

  return (
    <div class="window">
      <div class="title-bar">
        <button onClick={onCloseClick}>Close</button>
      </div>
    </div>
  );
}

// Parent receives notifications
<Window
  onClose={() => console.log("Window was closed!")}
  onMaximize={() => console.log("Window was maximized!")}
/>
```

### 4. Inversion of Control with forwardRef Pattern

Allow external control by accepting an optional ref prop with a default:

```tsx
import { createRef, type Ref } from "defuss";

interface WindowProps {
  ref?: Ref<WindowRefState>;  // Optional - caller can pass their own
  title?: string;
}

function Window({
  ref = createRef<WindowRefState>(),  // Default if not provided
  title = "Untitled",
}: WindowProps) {
  // Component works whether ref is passed in or created internally
  ref.state = {
    close: () => { /* ... */ },
    minimize: () => { /* ... */ },
  };

  return <div ref={ref}>...</div>;
}
```

**Usage patterns:**

```tsx
// Pattern A: No ref - component manages itself
<Window title="Self-managed" />

// Pattern B: With ref - external control enabled
const winRef = createRef<WindowRefState>();
<Window ref={winRef} title="Externally controlled" />

// Later: control from outside
winRef.state?.close();
```

This pattern enables:
- **Self-contained usage** when no ref is passed
- **External control** when ref is provided
- **Testing** by injecting refs and calling state methods directly

### 5. Fire-and-Forget Event Handlers with Dequery

Dequery's `.on()`, `.off()`, and class manipulation methods execute **immediately** when the chain has no pending async operations. This enables fire-and-forget patterns:

```tsx
const onMouseDown = (event: MouseEvent) => {
  // These execute immediately - no await needed!
  $(document).on("mousemove", onMouseMove);
  $(document).on("mouseup", onMouseUp);
};

const onMouseUp = () => {
  // Cleanup also executes immediately
  $(document).off("mousemove", onMouseMove);
  $(document).off("mouseup", onMouseUp);
};
```

**Sync-safe methods** (execute immediately when chain has no pending ops):
- Event: `.on()`, `.off()`, `.clearEvents()`, `.trigger()`
- Class: `.addClass()`, `.removeClass()`, `.toggleClass()`, `.animateClass()`

**When it works:** Use `$(element)` or `$(document)` directly (not selector strings). These resolve synchronously, so subsequent methods execute immediately.

**How it works:** Dequery uses `createSyncCall` which checks `callStack.length === 0`. When there are no pending operations (like `.find()` or `.query()`), methods execute synchronously. When ops are queued, execution is deferred to maintain correct ordering.

**Safe: Ordering is preserved with queued ops:**
```tsx
// find() is async, so addClass() waits for it
const chain = $(parent).find(".child").addClass("x");
// Before await: parent does NOT have class (correct!)
// After await:  child HAS class (correct!)
await chain;
```
