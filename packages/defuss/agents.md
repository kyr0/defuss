

<full-context-dump>
./kitchensink/tsconfig.json:
```
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "jsx": "react-jsx",
        "jsxImportSource": "..",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "paths": {
            "@/*": [
                "../src/*"
            ]
        }
    },
    "include": [
        "./**/*.ts",
        "./**/*.tsx"
    ]
}
```

./kitchensink/utils.ts:
```
/**
 * Kitchen Sink Test Suite - Shared test utilities
 */

export const createContainer = (): HTMLDivElement => {
    const container = document.createElement("div");
    container.id = `test-container-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    return container;
};

export const cleanup = (container: HTMLElement) => {
    container.remove();
};

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const nextTick = () => new Promise((r) => queueMicrotask(() => r(undefined)));

export const waitForCondition = async (
    check: () => boolean,
    timeout = 5000,
    interval = 10
): Promise<void> => {
    const start = Date.now();
    while (!check()) {
        if (Date.now() - start > timeout) {
            throw new Error(`Condition not met within ${timeout}ms`);
        }
        await wait(interval);
    }
};

export const getTextContent = (el: Element | null): string => {
    return el?.textContent?.trim() ?? "";
};

export const countElements = (container: Element, selector: string): number => {
    return container.querySelectorAll(selector).length;
};

```

./kitchensink/vitest.config.ts:
```
import { defineConfig } from "vitest/config";
import path from "node:path";
import { playwright } from "@vitest/browser-playwright";

const defussRoot = path.resolve(__dirname, "..");

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(defussRoot, "src"),
            "defuss": path.resolve(defussRoot, "src/index.ts"),
            "defuss/jsx-runtime": path.resolve(defussRoot, "src/render/index.ts"),
            // Add the absolute path pattern that esbuild generates
            [defussRoot + "/jsx-dev-runtime"]: path.resolve(defussRoot, "src/render/dev/index.ts"),
            [defussRoot + "/jsx-runtime"]: path.resolve(defussRoot, "src/render/index.ts"),
        },
    },
    esbuild: {
        jsx: "automatic",
        jsxImportSource: defussRoot,
    },
    test: {
        name: "kitchensink",
        root: __dirname,
        include: ["./*.test.{ts,tsx}"],
        browser: {
            enabled: true,
            provider: playwright(),
            instances: [
                { browser: "chromium" }
            ],
            headless: true,
        },
        testTimeout: 30000,
        hookTimeout: 10000,
    },
});

```

./package.json:
```
{
  "name": "defuss",
  "version": "3.0.0",
  "type": "module",
  "publishConfig": {
    "access": "public"
  },
  "license": "MIT",
  "description": "Explicit simplicity for the web.",
  "keywords": [
    "jsx",
    "render",
    "ssr",
    "ssg",
    "isomorphic",
    "jquery-like",
    "defuss",
    "react-like",
    "lightweight",
    "typescript",
    "framework",
    "library",
    "dom-router",
    "spa",
    "csr",
    "store",
    "state",
    "component",
    "components",
    "ui",
    "user-interface",
    "frontend",
    "front-end",
    "web-storage",
    "async"
  ],
  "repository": {
    "url": "git+https://github.com/kyr0/defuss.git",
    "type": "git"
  },
  "scripts": {
    "clean": "rm -rf ./coverage && rm -rf ./node_modules/.pnpm && rm -rf ./node_modules/.vite",
    "pretest": "pnpm run build",
    "test:watch": "vitest --coverage",
    "test": "vitest run --coverage",
    "test:browser": "vitest run --config vitest.browser.config.ts",
    "kitchensink": "vitest run --config kitchensink/vitest.config.ts",
    "bench": "vitest bench --config vitest.bench.config.ts",
    "bench:browser": "vitest run --config vitest.browser.config.ts src/__benchmarks__/dom-benchmark.browser.test.tsx",
    "prebuild": "pnpm run clean",
    "build": "node scripts/build.mjs"
  },
  "author": "Aron Homberg <info@aron-homberg.de>",
  "sideEffects": false,
  "exports": {
    ".": {
      "require": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.cjs"
      },
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.mjs"
      }
    },
    "./server": {
      "require": {
        "types": "./dist/render/server.d.ts",
        "default": "./dist/render/server.cjs"
      },
      "import": {
        "types": "./dist/render/server.d.ts",
        "default": "./dist/render/server.mjs"
      }
    },
    "./client": {
      "require": {
        "types": "./dist/render/client.d.ts",
        "default": "./dist/render/client.cjs"
      },
      "import": {
        "types": "./dist/render/client.d.ts",
        "default": "./dist/render/client.mjs"
      }
    },
    "./jsx-runtime": {
      "require": {
        "types": "./dist/render/index.d.ts",
        "default": "./dist/render/index.cjs"
      },
      "import": {
        "types": "./dist/render/index.d.ts",
        "default": "./dist/render/index.mjs"
      }
    },
    "./jsx-dev-runtime": {
      "require": {
        "types": "./dist/render/dev/index.d.ts",
        "default": "./dist/render/dev/index.cjs"
      },
      "import": {
        "types": "./dist/render/dev/index.d.ts",
        "default": "./dist/render/dev/index.mjs"
      }
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "files": [
    "dist",
    "assets"
  ],
  "devDependencies": {
    "@types/node": "^25.0.9",
    "@vitest/browser": "^4.0.17",
    "@vitest/browser-playwright": "^4.0.17",
    "@vitest/coverage-v8": "^4.0.17",
    "jsdom": "^27.4.0",
    "pkgroll": "^2.21.5",
    "playwright": "^1.57.0",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3",
    "vitest": "^4.0.17"
  },
  "dependencies": {
    "@types/w3c-xmlserializer": "^2.0.4",
    "csstype": "^3.2.3",
    "defuss-runtime": "workspace:*",
    "happy-dom": "^20.3.1",
    "w3c-xmlserializer": "^5.0.0"
  }
}

```

./pkgroll.config.mjs:
```
import pkg from "./package.json" assert { type: "json" };

export default {
  rollupOptions: {
    output: {
      // Banner removed - console.log on import breaks pure module expectations
      banner: `// ${pkg.name} v${pkg.version}`,
    },
  },
};

```

./scripts/build.mjs:
```
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

execSync(`npx pkgroll --env.PKG_VERSION=${pkg.version}`, {
    stdio: 'inherit',
    cwd: join(__dirname, '..'),
});

```

./src/__benchmarks__/benchmark-utils.ts:
```
// Benchmark utilities for browser DOM benchmarks
// Following js-framework-benchmark methodology

// --- Data Generation ---

let idCounter = 1;

export interface Row {
    id: number;
    label: string;
    selected?: boolean;
}

const adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"];
const colours = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
const nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];

function _random(max: number) {
    return Math.round(Math.random() * 1000) % max;
}

export function buildData(count: number): Row[] {
    const data: Row[] = [];
    for (let i = 0; i < count; i++) {
        data.push({
            id: idCounter++,
            label: `${adjectives[_random(adjectives.length)]} ${colours[_random(colours.length)]} ${nouns[_random(nouns.length)]}`,
        });
    }
    return data;
}

export function resetIdCounter() {
    idCounter = 1;
}

// --- Assertions ---

export function assertElementCount(container: Element, selector: string, count: number) {
    const elements = container.querySelectorAll(selector);
    if (elements.length !== count) {
        throw new Error(`Expected ${count} elements matching "${selector}", found ${elements.length}`);
    }
}

export function assertTextContent(container: Element, selector: string, text: string) {
    const element = container.querySelector(selector);
    if (!element) {
        throw new Error(`Element matching "${selector}" not found`);
    }
    if (!element.textContent?.includes(text)) {
        throw new Error(`Expected element "${selector}" to contain "${text}", found "${element.textContent}"`);
    }
}

// --- Timing: Mode A (Portable, Double-RAF) ---

/**
 * Portable Mode A: Double requestAnimationFrame
 * Measures time from work start to after next paint (approximates commit)
 */
export function measureRAF(trigger: () => Promise<void> | void): Promise<number> {
    return new Promise<number>((resolve) => {
        requestAnimationFrame(() => {
            const start = performance.now();

            // Trigger the work
            const result = trigger();

            // Handle both async and sync triggers
            Promise.resolve(result).finally(() => {
                // Double RAF: ensures we're past the paint for the update
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        const end = performance.now();
                        resolve(end - start);
                    });
                });
            });
        });
    });
}

```

./src/__benchmarks__/components/Table.tsx:
```
import type { Row } from "../benchmark-utils.js";

// Simple functional components for the benchmark table
// Uses defuss JSX factory

interface TableRowProps {
    row: Row;
    selected: boolean;
    onSelect: (id: number) => void;
    onRemove: (id: number) => void;
}

export const TableRow = ({ row, selected, onSelect, onRemove }: TableRowProps) => (
    <tr className={selected ? "danger" : ""}>
        <td className="col-md-1">{row.id}</td>
        <td className="col-md-4">
            <a onClick={() => onSelect(row.id)}>{row.label}</a>
        </td>
        <td className="col-md-1">
            <a onClick={() => onRemove(row.id)}>
                <span className="remove" aria-hidden="true">x</span>
            </a>
        </td>
        <td className="col-md-6" />
    </tr>
);

interface TableProps {
    rows: Row[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    onRemove: (id: number) => void;
}

export const Table = ({ rows, selectedId, onSelect, onRemove }: TableProps) => (
    <div className="container">
        <div className="jumbotron">
            <div className="row">
                <div className="col-md-6">
                    <h1>Defuss Benchmark</h1>
                </div>
            </div>
        </div>
        <table className="table table-hover table-striped test-data">
            <tbody>
                {rows.map((row) => (
                    <TableRow
                        row={row}
                        selected={row.id === selectedId}
                        onSelect={onSelect}
                        onRemove={onRemove}
                    />
                ))}
            </tbody>
        </table>
        <span className="preloadicon glyphicon glyphicon-remove" aria-hidden="true" />
    </div>
);

```

./src/__benchmarks__/dom-benchmark.browser-bench.tsx:
```
import { bench, describe, expect, beforeEach } from "vitest";
import { renderSync } from "../render/client.js";
import { buildData, measureRAF, type Row, assertElementCount, assertTextContent, resetIdCounter } from "./benchmark-utils.js";
import { Table } from "./components/Table.js";

// Re-render based benchmark following js-framework-benchmark methodology
// Using Mode A (double-RAF) timing for portable results

describe("DOM Benchmark", () => {
    let container: HTMLElement;
    let state: { rows: Row[], selectedId: number | null };

    beforeEach(() => {
        document.body.innerHTML = '';
        container = document.createElement("div");
        container.id = "main";
        document.body.appendChild(container);

        state = { rows: [], selectedId: null };
        resetIdCounter();

        // Initial render (empty)
        renderApp();
    });

    function renderApp() {
        const handleSelect = (id: number) => {
            state.selectedId = id;
            renderApp();
        };

        const handleRemove = (id: number) => {
            const idx = state.rows.findIndex(row => row.id === id);
            state.rows.splice(idx, 1);
            renderApp();
        };

        // Top-level re-render
        renderSync(
            <Table
                rows={state.rows}
                selectedId={state.selectedId}
                onSelect={handleSelect}
                onRemove={handleRemove}
            />,
            container
        );
    }

    // --- Benchmarks ---

    bench("01_run1k (Create 1,000 rows)", async () => {
        resetIdCounter();
        await measureRAF(() => {
            state.rows = buildData(1000);
            renderApp();
        });

        assertElementCount(container, "tbody tr", 1000);
    }, { iterations: 10 });

    bench("02_replace1k (Replace all rows)", async () => {
        state.rows = buildData(1000);
        renderApp();

        await measureRAF(() => {
            state.rows = buildData(1000);
            renderApp();
        });

        assertElementCount(container, "tbody tr", 1000);
    }, { iterations: 10 });

    bench("03_update10th1k (Update every 10th row)", async () => {
        state.rows = buildData(1000);
        renderApp();

        await measureRAF(() => {
            for (let i = 0; i < state.rows.length; i += 10) {
                state.rows[i].label += " !!!";
            }
            renderApp();
        });

        assertTextContent(container, "tbody tr:nth-child(1)", "!!!");
        assertTextContent(container, "tbody tr:nth-child(11)", "!!!");
    }, { iterations: 10 });

    bench("04_select1k (Select row)", async () => {
        state.rows = buildData(1000);
        renderApp();

        await measureRAF(() => {
            state.selectedId = state.rows[1].id;
            renderApp();
        });

        assertElementCount(container, "tr.danger", 1);
    }, { iterations: 10 });

    bench("05_swap1k (Swap rows)", async () => {
        state.rows = buildData(1000);
        renderApp();

        const id1 = state.rows[1].id;
        const id998 = state.rows[998].id;

        await measureRAF(() => {
            const temp = state.rows[1];
            state.rows[1] = state.rows[998];
            state.rows[998] = temp;
            renderApp();
        });

        const rows = container.querySelectorAll("tbody tr");
        const row1Text = rows[1].textContent;
        const row998Text = rows[998].textContent;

        expect(row1Text).toContain(String(id998));
        expect(row998Text).toContain(String(id1));
    }, { iterations: 10 });

    bench("06_remove_one_1k (Remove one row)", async () => {
        state.rows = buildData(1000);
        renderApp();
        const idToRemove = state.rows[1].id;

        await measureRAF(() => {
            const idx = state.rows.findIndex(r => r.id === idToRemove);
            state.rows.splice(idx, 1);
            renderApp();
        });

        assertElementCount(container, "tbody tr", 999);
    }, { iterations: 10 });

    bench("07_create10k (Create 10,000 rows)", async () => {
        resetIdCounter();
        await measureRAF(() => {
            state.rows = buildData(10000);
            renderApp();
        });

        assertElementCount(container, "tbody tr", 10000);
    }, { iterations: 5 });

    bench("08_append1k (Append 1,000 rows)", async () => {
        state.rows = buildData(1000);
        renderApp();

        await measureRAF(() => {
            state.rows.push(...buildData(1000));
            renderApp();
        });

        assertElementCount(container, "tbody tr", 2000);
    }, { iterations: 10 });

    bench("09_clear1k (Clear rows)", async () => {
        state.rows = buildData(1000);
        renderApp();

        await measureRAF(() => {
            state.rows = [];
            renderApp();
        });

        assertElementCount(container, "tbody tr", 0);
    }, { iterations: 10 });

});

```

./src/async/Async.tsx:
```
import type {
  RenderInput,
  VNodeChildren,
  VNode,
  Ref,
  Props,
  VNodeChild,
} from "@/render/types.js";
import { createRef, isRef } from "@/render/index.js";
import { $ } from "@/dequery/index.js";
import { inDevMode } from "@/common/index.js";

export type AsyncState = "loading" | "loaded" | "error";

export interface AsyncStateRef extends Ref<AsyncState, HTMLElement> {
  /** The state of the async content */
  state?: AsyncState;

  /** Error details are available here in case the state changes to "error" */
  error?: unknown;
}

export interface AsyncProps extends Props {
  /** to uniquely identify the root DOM element without using a ref */
  id?: string;

  /** to identify/select the root DOM element or style it, W3C naming */
  class?: string;

  /** to identify/select the root DOM element or style it, React naming */
  className?: string;

  /** The fallback content to display while the async content is loading */
  fallback?: VNode;

  /** Store this with createRef() to update() the Suspense state */
  ref?: AsyncStateRef;

  /** to override the name of the .suspense-loading transition CSS class name */
  loadingClassName?: string;

  /** to override the name of the .suspense-loaded transition CSS class name */
  loadedClassName?: string;

  /** to override the name of the .suspense-error transition CSS class name */
  errorClassName?: string;
}

export const Async = ({
  fallback,
  ref,
  children,
  class: _class,
  className,
  id,
  loadingClassName,
  loadedClassName,
  errorClassName,
  onError,
}: AsyncProps) => {
  let childrenToRender: VNodeChild | VNodeChildren = children;

  // Cancellation token to prevent stale async updates from racing
  let updateToken = 0;

  const containerRef: AsyncStateRef = createRef<AsyncState>(
    function onSuspenseUpdate(state: AsyncState) {
      const currentToken = ++updateToken;

      if (!containerRef.current) {
        if (inDevMode) {
          console.warn(
            "Suspense container is not mounted yet, but a state update demands a render. State is:",
            state,
          );
        }
        return;
      }

      // Use .catch() on the async IIFE to properly catch async errors
      // (try/catch around an async IIFE does NOT catch async errors)
      void (async () => {
        // Chain class removals to reduce await overhead
        await $(containerRef.current)
          .removeClass(loadingClassName || "suspense-loading")
          .removeClass(loadedClassName || "suspense-loaded")
          .removeClass(errorClassName || "suspense-error");

        // Check for stale update after first await
        if (currentToken !== updateToken) return;

        if (!children || state === "error") {
          await $(containerRef.current).addClass(
            errorClassName || "suspense-error",
          );
          if (currentToken !== updateToken) return;
          await $(containerRef).jsx({
            type: "div",
            children: ["Loading error!"],
          });
        } else if (state === "loading") {
          await $(containerRef.current).addClass(
            loadingClassName || "suspense-loading",
          );
          if (currentToken !== updateToken) return;
          // Guard: fallback might be undefined, only call .jsx() if it exists
          if (fallback) {
            await $(containerRef).jsx(fallback);
          } else {
            await $(containerRef.current).empty();
          }
        } else if (state === "loaded") {
          await $(containerRef.current).addClass(
            loadedClassName || "suspense-loaded",
          );
          if (currentToken !== updateToken) return;
          await $(containerRef).jsx(childrenToRender as RenderInput);
        }
      })().catch((error) => {
        containerRef.updateState("error");
        containerRef.error = error;

        if (typeof onError === "function") {
          onError(error);
        }
      });
    },
    "loading",
  );

  if (isRef(ref)) {
    // for the initial state synchronization between outer and inner scope
    // we don't want to trigger the suspense state to render,
    // as the DOM element is not yet mounted (rendered in DOM)
    let isInitial = true;

    // Preserve the outer ref's original updateState to avoid breaking outer store state
    const outerUpdateState = ref.updateState.bind(ref);

    // when the suspense state is updated in outer scope
    // we bridge the update to the internal containerRef
    ref.updateState = (state: AsyncState) => {
      outerUpdateState(state); // call original first to keep outer .state in sync
      if (!isInitial) {
        containerRef.updateState(state);
      }
    };
    // let's tell the outer scope the initial state
    outerUpdateState("loading");

    isInitial = false; // render any outer scope updates from now on
  }

  // resolve async children
  const promisedChildren = (
    Array.isArray(children) ? children : children ? [children] : []
  ).map((vnode) => {
    try {
      if (!vnode || (vnode && !(vnode as VNode).type)) {
        return Promise.resolve(""); // becomes a Text node
      }

      // <Async><SomeAsyncComponent /></Async>
      if ((vnode as VNode).type.constructor.name === "AsyncFunction") {
        // construct the props object
        const props = {
          ...(vnode as VNode).attributes,
          children: (vnode as VNode).children,
        };
        // yield the Promise objects
        return (vnode as VNode).type(props);
      }

      // all the other synchronous cases
      return Promise.resolve(vnode);
    } catch (error) {
      containerRef.updateState("error");
      containerRef.error = error;

      if (typeof onError === "function") {
        // pass the error up to the parent component
        onError(error);
      }
      return null; // return null so Promise.all doesn't get undefined
    }
  });

  const onMount = () => {
    if (promisedChildren.length) {
      containerRef.updateState("loading");

      Promise.all(promisedChildren)
        .then((awaitedVnodes) => {
          // Filter out nulls from error catch returns before flatMap
          childrenToRender = awaitedVnodes
            .filter((vnode): vnode is VNode => vnode != null)
            .flatMap((vnode: VNode) =>
              vnode?.type === "Fragment" ? vnode.children : vnode,
            );
          containerRef.updateState("loaded");
        })
        .catch((error) => {
          containerRef.updateState("error");
          containerRef.error = error;

          if (inDevMode) {
            console.error("SuspenseLoadingError", error);
          }
          (async () => {
            await $(containerRef).jsx(`SuspenseLoadingError: ${error}`);
          })();
          if (typeof onError === "function") {
            onError(error);
          }
        });
    }
  };

  return {
    type: "div",
    attributes: { id, class: _class, className, ref: containerRef, onMount },
    children: fallback ? [fallback] : [],
  };
};

// React-mimicing alias
export const Suspense = Async;

```

./src/async/index.ts:
```
export * from "./Async.js";
```

./src/common/devmode.ts:
```
/**
 * Detect development mode for dev-only warnings and logs.
 * In production builds, bundlers can dead-code eliminate based on this.
 */
export const inDevMode =
    typeof process !== "undefined" && process.env
        ? process.env.NODE_ENV !== "production"
        : false;
```

./src/common/dom.ts:
```
import type {
  Globals,
  RenderInput,
  VNode,
  VNodeAttributes,
  VNodeChild,
} from "defuss/jsx-runtime";
import {
  getRenderer,
  handleLifecycleEventsForOnMount,
} from "../render/isomorph.js";
import {
  registerDelegatedEvent,
  removeDelegatedEvent,
  clearDelegatedEvents,
  clearDelegatedEventsDeep,
  getRegisteredEventKeys,
  removeDelegatedEventByKey,
  parseEventPropName,
} from "../render/delegated-events.js";
import type { NodeType } from "../render/index.js";
import { createTimeoutPromise } from "defuss-runtime";

/**
 * Compares two DOM nodes for equality with performance optimizations.
 * 1. Checks for reference equality.
 * 2. Compares node types.
 * 3. For Element nodes, compares tag names and attributes.
 * 4. For Text nodes, compares text content.
 */
export const areDomNodesEqual = (oldNode: Node, newNode: Node): boolean => {
  // return true if both references are identical
  if (oldNode === newNode) return true;

  // compare node types
  if (oldNode.nodeType !== newNode.nodeType) return false;

  // handle Element nodes
  if (oldNode.nodeType === Node.ELEMENT_NODE) {
    const oldElement = oldNode as Element;
    const newElement = newNode as Element;

    // compare tag names
    if (oldElement.tagName !== newElement.tagName) return false;

    const oldAttrs = oldElement.attributes;
    const newAttrs = newElement.attributes;

    // compare number of attributes
    if (oldAttrs.length !== newAttrs.length) return false;

    // iterate and compare each attribute's name and value
    for (let i = 0; i < oldAttrs.length; i++) {
      const oldAttr = oldAttrs[i];
      const newAttrValue = newElement.getAttribute(oldAttr.name);
      if (oldAttr.value !== newAttrValue) return false;
    }
  }

  // handle Text nodes
  if (oldNode.nodeType === Node.TEXT_NODE) {
    if (oldNode.textContent !== newNode.textContent) return false;
  }
  return true;
};

/**
 * Recursively updates oldNode with the structure of newNode:
 * - If they differ (tag/attrs/text), oldNode is replaced
 * - If same, we recurse on children
 */
const updateNode = (oldNode: Node, newNode: Node) => {
  // 1) If different, replace old with new
  if (!areDomNodesEqual(oldNode, newNode)) {
    oldNode.parentNode?.replaceChild(newNode.cloneNode(true), oldNode);
    return;
  }

  // 2) If they match and are elements, recurse on their children
  if (oldNode.nodeType === Node.ELEMENT_NODE) {
    const oldChildren = oldNode.childNodes;
    const newChildren = newNode.childNodes;
    const maxLength = Math.max(oldChildren.length, newChildren.length);

    for (let i = 0; i < maxLength; i++) {
      const oldChild = oldChildren[i];
      const newChild = newChildren[i];

      if (oldChild && newChild) {
        // both exist; recurse
        updateNode(oldChild, newChild);
      } else if (newChild && !oldChild) {
        // new child doesn't exist in old => append
        oldNode.appendChild(newChild.cloneNode(true));
      } else if (oldChild && !newChild) {
        // old child doesn't exist in new => remove
        oldNode.removeChild(oldChild);
      }
    }
  }
};

/********************************************************
 * 1) Define a "valid" child type & utilities
 ********************************************************/
export type ValidChild =
  | string
  | number
  | boolean
  | null
  | undefined
  | VNode<VNodeAttributes>;

function isTextLike(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isVNode(value: unknown): value is VNode<VNodeAttributes> {
  return Boolean(value && typeof value === "object" && "type" in (value as Record<string, unknown>));
}

function toValidChild(child: VNodeChild): ValidChild | undefined {
  if (child == null) return child; // null or undefined
  if (isTextLike(child)) return child;

  if (isVNode(child)) return child;

  // e.g. function or {} -> filter out
  return undefined;
}

/** fuse consecutive text-like nodes to preserve DOM stability (matches hydrate's behavior) */
function normalizeChildren(input: RenderInput): Array<ValidChild> {
  const raw: Array<ValidChild> = [];

  const pushChild = (child: unknown) => {
    if (Array.isArray(child)) {
      child.forEach(pushChild);
      return;
    }

    const valid = toValidChild(child as VNodeChild);
    if (typeof valid === "undefined") return;

    // unwrap Fragment-ish nodes (defuss sometimes uses "fragment", some code uses "Fragment")
    if (isVNode(valid) && (valid.type === "fragment" || valid.type === "Fragment")) {
      const nested = Array.isArray(valid.children) ? valid.children : [];
      nested.forEach(pushChild);
      return;
    }

    // ignore booleans/null/undefined as render-nothing
    if (valid === null || typeof valid === "undefined" || typeof valid === "boolean") return;

    raw.push(valid);
  };

  pushChild(input);

  // fuse consecutive text nodes into a single string
  const fused: Array<ValidChild> = [];
  let buffer: string | null = null;

  const flush = () => {
    if (buffer !== null && buffer.length > 0) fused.push(buffer);
    buffer = null;
  };

  for (const child of raw) {
    if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
      buffer = (buffer ?? "") + String(child);
      continue;
    }

    flush();
    fused.push(child);
  }

  flush();
  return fused;
}

function getVNodeMatchKey(child: ValidChild): string | null {
  if (!child || typeof child !== "object") return null;

  const key = child.attributes?.key;
  if (typeof key === "string" || typeof key === "number") return `k:${String(key)}`;

  const id = child.attributes?.id;
  if (typeof id === "string" && id.length > 0) return `id:${id}`;

  return null;
}

function getDomMatchKeys(node: Node): Array<string> {
  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const el = node as HTMLElement;
  const keys: Array<string> = [];

  // prefer internal key storage, but also accept legacy `key` attribute if present
  const internalKey = (el as HTMLElement & { _defussKey?: string })._defussKey;
  if (internalKey) keys.push(`k:${internalKey}`);

  const attrKey = el.getAttribute("key");
  if (attrKey) keys.push(`k:${attrKey}`);

  const id = el.id;
  if (id) keys.push(`id:${id}`);

  return keys;
}

/********************************************************
 * 2) Check if a DOM node and a ValidChild match by type
 ********************************************************/
function areNodeAndChildMatching(domNode: Node, child: ValidChild): boolean {
  if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
    return domNode.nodeType === Node.TEXT_NODE;
  }

  if (child && typeof child === "object") {
    if (domNode.nodeType !== Node.ELEMENT_NODE) return false;

    const el = domNode as HTMLElement;
    const oldTag = el.tagName.toLowerCase();
    const newTag = typeof child.type === "string" ? child.type.toLowerCase() : "";
    if (!newTag || oldTag !== newTag) return false;

    // If vnode has class/className, check that all VNode classes are present in the DOM element
    // This is lenient matching - DOM element may have extra classes (e.g. 'hydrated' from Ionic)
    // but VNode's classes must all be present
    const vnodeClass =
      (child.attributes as any)?.className ??
      (child.attributes as any)?.class;

    if (typeof vnodeClass === "string" && vnodeClass.length > 0) {
      const domClasses = new Set((el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean));
      const vnodeClasses = vnodeClass.split(/\s+/).filter(Boolean);
      // All VNode classes must be present in DOM (but DOM can have extras like 'hydrated')
      for (const cls of vnodeClasses) {
        if (!domClasses.has(cls)) return false;
      }
    }

    return true;
  }

  return false;
}

/********************************************************
 * 3) Create brand new DOM node(s) from a ValidChild
 ********************************************************/
function createDomFromChild(
  child: ValidChild,
  globals: Globals,
): Array<Node> | undefined {
  const renderer = getRenderer(globals.window.document);

  if (child == null) return undefined;

  if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
    return [globals.window.document.createTextNode(String(child))];
  }

  // create without parent (we'll insert manually and run lifecycle hooks afterwards)
  const created = renderer.createElementOrElements(child) as Node | Array<Node> | undefined;

  if (!created) return undefined;
  const nodes = Array.isArray(created) ? created : [created];
  return nodes.filter(Boolean) as Array<Node>;
}

/********************************************************
 * 4) Patch an element node in place (attributes + children)
 ********************************************************/
function shouldPreserveFormStateAttribute(
  el: Element,
  attrName: string,
  vnode: VNode<VNodeAttributes>,
): boolean {
  const tag = el.tagName.toLowerCase();
  const hasExplicit = Object.prototype.hasOwnProperty.call(vnode.attributes ?? {}, attrName);

  if (hasExplicit) return false;

  // preserve uncontrolled input/textarea/select state unless explicitly controlled by VDOM
  if (tag === "input") return attrName === "value" || attrName === "checked";
  if (tag === "textarea") return attrName === "value";
  if (tag === "select") return attrName === "value";
  return false;
}

function patchElementInPlace(el: Element, vnode: VNode<VNodeAttributes>, globals: Globals): void {
  const renderer = getRenderer(globals.window.document);

  // remove old attributes not present (but preserve uncontrolled form state)
  const existingAttrs = Array.from(el.attributes);
  const nextAttrs = vnode.attributes ?? {};

  for (const attr of existingAttrs) {
    const { name } = attr;

    // do not remove internal key if it ever existed as attribute
    if (name === "key") continue;

    // do not remove event-ish attributes; handlers are delegated elsewhere
    if (name.startsWith("on")) continue;

    // treat class/className as equivalent
    if (name === "class" && (Object.prototype.hasOwnProperty.call(nextAttrs, "class") || Object.prototype.hasOwnProperty.call(nextAttrs, "className"))) {
      continue;
    }

    if (!Object.prototype.hasOwnProperty.call(nextAttrs, name)) {
      if (shouldPreserveFormStateAttribute(el, name, vnode)) continue;
      el.removeAttribute(name);
    }
  }

  // Remove stale event handlers: compute registered phase keys - next vnode phase keys
  // This is phase-aware: onClick + onClickCapture → onClickCapture only will correctly
  // remove the bubble handler while keeping the capture handler
  const registeredKeys = getRegisteredEventKeys(el as HTMLElement);
  const nextEventKeys = new Set<string>();
  for (const propName of Object.keys(nextAttrs)) {
    const parsed = parseEventPropName(propName);
    if (parsed) {
      const phase = parsed.capture ? "capture" : "bubble";
      nextEventKeys.add(`${parsed.eventType}:${phase}`);
    }
  }
  for (const key of registeredKeys) {
    if (!nextEventKeys.has(key)) {
      const [eventType, phase] = key.split(":");
      removeDelegatedEventByKey(el as HTMLElement, eventType, phase as "bubble" | "capture");
    }
  }

  // set new attributes (includes ref + delegated events via renderer.setAttribute)
  renderer.setAttributes(vnode, el);

  // Trigger onMount lifecycle for morphed elements that have a new onMount callback
  // This ensures onMount fires on route changes even when elements are morphed in place
  handleLifecycleEventsForOnMount(el as HTMLElement);

  // dangerouslySetInnerHTML => skip child reconciliation
  const d = vnode.attributes?.dangerouslySetInnerHTML;
  if (d && typeof d === "object" && typeof d.__html === "string") {
    el.innerHTML = d.__html;
    return;
  }

  const tag = el.tagName.toLowerCase();

  // preserve textarea live value unless explicitly controlled
  if (tag === "textarea") {
    const isControlled = Object.prototype.hasOwnProperty.call(nextAttrs, "value");
    const isActive = el.ownerDocument?.activeElement === el;
    if (isActive && !isControlled) return;
  }

  // reconcile children
  updateDomWithVdom(el, (vnode.children ?? []) as RenderInput, globals);
}

/********************************************************
 * 5) Morph a single DOM node to match a ValidChild
 ********************************************************/
function morphNode(domNode: Node, child: ValidChild, globals: Globals): Node | null {
  // text-like
  if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
    const text = String(child);

    if (domNode.nodeType === Node.TEXT_NODE) {
      if (domNode.nodeValue !== text) domNode.nodeValue = text;
      return domNode;
    }

    const next = globals.window.document.createTextNode(text);
    domNode.parentNode?.replaceChild(next, domNode);
    return next;
  }

  // element-like (VNode)
  if (child && typeof child === "object") {
    const newType = typeof child.type === "string" ? child.type : null;
    if (!newType) return domNode;

    if (domNode.nodeType !== Node.ELEMENT_NODE) {
      const created = createDomFromChild(child, globals);
      const first = Array.isArray(created) ? created[0] : created;
      if (!first) return null;

      domNode.parentNode?.replaceChild(first, domNode);
      handleLifecycleEventsForOnMount(first as HTMLElement);
      return first;
    }

    const el = domNode as Element;
    const oldTag = el.tagName.toLowerCase();
    const newTag = newType.toLowerCase();

    if (oldTag !== newTag) {
      const created = createDomFromChild(child, globals);
      const first = Array.isArray(created) ? created[0] : created;
      if (!first) return null;

      el.parentNode?.replaceChild(first, el);
      handleLifecycleEventsForOnMount(first as HTMLElement);
      return first;
    }

    patchElementInPlace(el, child as VNode<VNodeAttributes>, globals);
    return el;
  }

  // null/undefined => remove
  domNode.parentNode?.removeChild(domNode);
  return null;
}

/********************************************************
 * 6) Main state-preserving morph (key/id aware, move-not-replace)
 ********************************************************/
export function updateDomWithVdom(
  parentElement: Element,
  newVDOM: RenderInput,
  globals: Globals,
): void {
  // Custom elements (hyphenated tags) use light DOM for slotted content.
  // Other elements with shadowRoot should target the shadow root.
  const el = parentElement as HTMLElement;
  const isCustomElement = el.tagName.includes("-");
  const targetRoot: ParentNode & Node =
    el.shadowRoot && !isCustomElement ? el.shadowRoot : parentElement;

  const nextChildren = normalizeChildren(newVDOM);

  // snapshot existing children once for matching pools
  const existing = Array.from(targetRoot.childNodes);

  const keyedPool = new Map<string, Node>();
  const nodeKeys = new WeakMap<Node, Array<string>>();
  const unkeyedPool: Array<Node> = [];

  for (const node of existing) {
    const keys = getDomMatchKeys(node);
    if (keys.length > 0) {
      nodeKeys.set(node, keys);
      for (const k of keys) {
        if (!keyedPool.has(k)) keyedPool.set(k, node);
      }
    } else {
      unkeyedPool.push(node);
    }
  }

  const consumeKeyedNode = (node: Node) => {
    const keys = nodeKeys.get(node) ?? [];
    for (const k of keys) keyedPool.delete(k);
  };

  const takeUnkeyedMatch = (child: ValidChild): Node | undefined => {
    // try to find a compatible node (preserves focus/state by moving instead of replacing)
    for (let i = 0; i < unkeyedPool.length; i++) {
      const candidate = unkeyedPool[i];
      if (areNodeAndChildMatching(candidate, child)) {
        unkeyedPool.splice(i, 1);
        return candidate;
      }
    }

    // SAFE: no match => don't reuse something random, create new node instead
    return undefined;
  };

  let domIndex = 0;

  for (const child of nextChildren) {
    const key = getVNodeMatchKey(child);

    let match: Node | undefined;

    if (key) {
      match = keyedPool.get(key);
      if (match) consumeKeyedNode(match);
    } else {
      match = takeUnkeyedMatch(child);
    }

    const anchor = targetRoot.childNodes[domIndex] ?? null;

    if (match) {
      // move node into place (preserves identity/state)
      if (match !== anchor) {
        targetRoot.insertBefore(match, anchor);
      }

      const morphed = morphNode(match, child, globals);

      // if morphNode replaced it, ensure we still have the correct node at domIndex
      if (morphed && morphed !== match) {
        // replacement already occurred in-place, nothing else to do
      }

      domIndex++;
      continue;
    }

    // no match => create and insert
    const created = createDomFromChild(child, globals);
    if (!created || (Array.isArray(created) && created.length === 0)) continue;

    const nodes = Array.isArray(created) ? created : [created];
    for (const node of nodes) {
      targetRoot.insertBefore(node, anchor);
      handleLifecycleEventsForOnMount(node as HTMLElement);
      domIndex++;
    }
  }

  // remove remaining unmatched nodes (both keyed leftovers and unkeyed leftovers)
  const remaining = new Set<Node>();

  for (const node of unkeyedPool) remaining.add(node);
  for (const node of keyedPool.values()) remaining.add(node);

  for (const node of remaining) {
    if (node.parentNode === targetRoot) {
      // Clear delegated events before removal to prevent handler leaks
      if (node instanceof HTMLElement) {
        clearDelegatedEventsDeep(node);
      }
      targetRoot.removeChild(node);
    }
  }
}

/**
 * Directly blow away all children in `parentElement` and create new DOM
 * from `newVDOM`. This never skips or leaves behind stale nodes,
 * at the cost of losing partial update performance.
 */
export function replaceDomWithVdom(
  parentElement: Element,
  newVDOM: RenderInput,
  globals: Globals,
) {
  // 1) Clear all existing DOM children
  while (parentElement.firstChild) {
    parentElement.removeChild(parentElement.firstChild);
  }

  // 2) Re-render from scratch
  const renderer = getRenderer(globals.window.document);

  const newDom = renderer.createElementOrElements(
    newVDOM as VNode | undefined | Array<VNode | undefined | string>,
  );

  // 3) Append the newly created node(s)
  if (Array.isArray(newDom)) {
    for (const node of newDom) {
      if (node) {
        parentElement.appendChild(node);
        handleLifecycleEventsForOnMount(node as HTMLElement);
      }
    }
  } else if (newDom) {
    parentElement.appendChild(newDom);
    handleLifecycleEventsForOnMount(newDom as HTMLElement);
  }
}

export async function waitForDOM(
  check: () => Array<NodeType>,
  timeout: number,
  document?: Document,
): Promise<Array<NodeType>> {
  const initialResult = check();

  if (initialResult.length) return initialResult;

  return createTimeoutPromise(timeout, () => {
    return new Promise<Array<NodeType>>((resolve) => {
      if (!document) {
        setTimeout(() => resolve(check()), 0);
        return;
      }

      const observer = new MutationObserver(() => {
        const result = check();
        if (result.length) {
          observer.disconnect();
          resolve(result);
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
      });

      return () => observer.disconnect();
    });
  });
}

export function parseDOM(
  input: string,
  type: DOMParserSupportedType,
  Parser: typeof DOMParser,
): Document {
  return new Parser().parseFromString(input, type);
}

export function isSVG(input: string, Parser: typeof DOMParser) {
  const doc = parseDOM(input, "image/svg+xml", Parser);
  if (!doc.documentElement) return false;
  return doc.documentElement.nodeName.toLowerCase() === "svg";
}

export function isHTML(input: string, Parser: typeof DOMParser): boolean {
  const doc = parseDOM(input, "text/html", Parser);
  return doc.documentElement.querySelectorAll("*").length > 2; // 2 = <html> and <body>
}

export const isMarkup = (input: string, Parser: typeof DOMParser): boolean =>
  input.indexOf("<") > -1 &&
  input.indexOf(">") > -1 &&
  (isHTML(input, Parser) || isSVG(input, Parser));

export function renderMarkup(
  markup: string,
  Parser: typeof DOMParser,
  doc?: Document,
) {
  // TODO: test with SVG markup
  return Array.from(
    (doc ? doc : parseDOM(markup, getMimeType(markup, Parser), Parser)).body
      .childNodes,
  );
}

export function getMimeType(
  input: string,
  Parser: typeof DOMParser,
): DOMParserSupportedType {
  if (isSVG(input, Parser)) {
    return "image/svg+xml";
  }
  return "text/html";
}

/**
 * Enhanced version of processFormElements that handles all form control types
 * including multiple select elements and radio button groups
 */
export function processAllFormElements(
  node: NodeType,
  callback: (
    input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    key: string,
  ) => void,
): void {
  if (node instanceof Element) {
    // For form elements
    if (node instanceof HTMLFormElement) {
      Array.from(node.elements).forEach((element) => {
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement
        ) {
          const key = element.name || element.id;
          if (key) {
            callback(element, key);
          }
        }
      });
    }
    // For individual elements or container elements
    else {
      const inputElements = node.querySelectorAll("input, select, textarea");

      inputElements.forEach((element) => {
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement
        ) {
          const key = element.name || element.id;
          if (key) {
            callback(element, key);
          }
        }
      });
    }
  }
}

export function checkElementVisibility(
  element: HTMLElement,
  window: Window,
  document: Document,
): boolean {
  const style = window.getComputedStyle(element);
  if (!style) return false;

  // Check if element has dimensions
  if (element.offsetWidth === 0 || element.offsetHeight === 0) return false;

  // Check if element is hidden via CSS
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0" ||
    Number.parseFloat(style.opacity) === 0
  )
    return false;

  // Check if element is detached from DOM
  if (!document.body.contains(element)) return false;

  // Check if any parent is hidden
  let parent = element.parentElement;
  while (parent) {
    const parentStyle = window.getComputedStyle(parent);
    if (
      parentStyle &&
      (parentStyle.display === "none" ||
        parentStyle.visibility === "hidden" ||
        parentStyle.opacity === "0" ||
        Number.parseFloat(parentStyle.opacity) === 0)
    ) {
      return false;
    }
    parent = parent.parentElement;
  }
  return true;
}

export function getEventMap(
  element: HTMLElement,
): Map<string, Set<EventListener>> {
  if (!element._dequeryEvents) {
    element._dequeryEvents = new Map();
  }
  return element._dequeryEvents;
}

export function addElementEvent(
  element: HTMLElement,
  eventType: string,
  handler: EventListener,
): void {
  // Use delegated events for unified event handling (NEW ALGO)
  // multi: true allows multiple handlers per element (Dequery mode)
  registerDelegatedEvent(element, eventType, handler, { multi: true });
}

export function removeElementEvent(
  element: HTMLElement,
  eventType: string,
  handler?: EventListener,
): void {
  // Remove from delegation registry
  removeDelegatedEvent(element, eventType, handler);
}

export function clearElementEvents(element: HTMLElement): void {
  clearDelegatedEvents(element);
}

/**
 * Converts a DOM node to a VNode structure for use with updateDomWithVdom.
 * This allows us to leverage the sophisticated partial update system even for Node inputs.
 */
export function domNodeToVNode(node: Node): VNode<VNodeAttributes> | string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || "";
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const attributes: VNodeAttributes = {};

    // Convert DOM attributes to VNode attributes
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = attr.value;
    }

    // Convert child nodes recursively
    const children: Array<VNode<VNodeAttributes> | string> = [];
    for (let i = 0; i < element.childNodes.length; i++) {
      const childVNode = domNodeToVNode(element.childNodes[i]);
      children.push(childVNode);
    }

    return {
      type: element.tagName.toLowerCase(),
      attributes,
      children,
    };
  }

  // For other node types (comments, etc.), convert to empty string
  return "";
}

/**
 * Converts an HTML string to VNode structure for use with updateDomWithVdom.
 * This allows markup strings to benefit from the intelligent partial update system.
 */
export function htmlStringToVNodes(
  html: string,
  Parser: typeof DOMParser,
): Array<VNode<VNodeAttributes> | string> {
  const parser = new Parser();
  const doc = parser.parseFromString(html, "text/html");
  const vNodes: Array<VNode<VNodeAttributes> | string> = [];

  // Convert each child node in the body to a VNode
  for (let i = 0; i < doc.body.childNodes.length; i++) {
    const vnode = domNodeToVNode(doc.body.childNodes[i]);
    if (vnode !== "") {
      vNodes.push(vnode);
    }
  }

  return vNodes;
}

```

./src/common/index.ts:
```
export * from "./devmode.js";
export * from "./dom.js";
export * from "./queue.js";

```

./src/common/queue.ts:
```
export const queueCallback = (cb: Function) => () =>
  queueMicrotask(cb as VoidFunction);

```

./src/dequery/dequery.ts:
```
import { pick, omit } from "defuss-runtime";
import {
  addElementEvent,
  checkElementVisibility,
  clearElementEvents,
  isMarkup,
  removeElementEvent,
  renderMarkup,
  updateDomWithVdom,
  waitForDOM,
  processAllFormElements,
} from "../common/dom.js";
import {
  isJSX,
  isRef,
  renderIsomorphicSync,
  type Globals,
  type Ref,
  type RenderInput,
  type AllHTMLElements,
  type CSSProperties,
  type NodeType,
  updateDom,
} from "../render/index.js";
import { clearDelegatedEventsDeep } from "../render/delegated-events.js";
import { getComponentInstance } from "../render/component-registry.js";
import { createTimeoutPromise, waitForRef } from "defuss-runtime";
import type {
  DequeryOptions,
  DequerySyncMethodReturnType,
  Dimensions,
  DOMPropValue,
  FormKeyValues,
  Position,
  ElementCreationOptions,
  FormFieldValue,
} from "./types.js";

// --- Core Async Call & Chain ---

export class Call<NT> {
  name: string;
  fn: (...args: any[]) => Promise<NT>;
  args: any[];
  constructor(
    name: string,
    fn: (...args: any[]) => Promise<NT>,
    ...args: any[]
  ) {
    this.name = name;
    this.fn = fn;
    this.args = args;
  }
}

// Global registry for non-chained return call names
const globalRegistry = globalThis as any;
if (!globalRegistry.__defuss_nonChainedReturnCallNames) {
  globalRegistry.__defuss_nonChainedReturnCallNames = [
    "getFirstElement",
    "toArray",
    "map",
    "isHidden",
    "isVisible",
    "hasClass",
    "dimension",
    "position",
    "offset",
    "prop",
    "val",
    "form",
    "attr",
    "data",
    "css",
    "html",
    "serialize",
  ];
}

// Utility function to add non-chained return call names globally
export function addNonChainedReturnCallNames(callNames: string[]): void {
  const global = globalRegistry.__defuss_nonChainedReturnCallNames;
  callNames.forEach((name) => {
    if (!global.includes(name)) {
      global.push(name);
    }
  });
}

// Utility function to get the current list of non-chained return call names
export function getNonChainedReturnCallNames(): string[] {
  return [...globalRegistry.__defuss_nonChainedReturnCallNames];
}

// Utility function to check if a call name is marked as non-chained
export function isNonChainedReturnCall(callName: string): boolean {
  return globalRegistry.__defuss_nonChainedReturnCallNames.includes(callName);
}

export const emptyImpl = <T>(nodes: Array<T>) => {
  nodes.forEach((el) => {
    const element = el as HTMLElement;
    // Clear from both light DOM and shadow DOM if present
    const target = element.shadowRoot ?? element;

    while (target.firstChild) {
      const node = target.firstChild;

      // Clear delegated events for node + descendants to prevent leaks
      if (node instanceof HTMLElement) {
        clearDelegatedEventsDeep(node);
      }

      node.remove();
    }
  });
  return nodes as T[];
};

export class CallChainImpl<
  NT = DequerySyncMethodReturnType,
  ET extends Dequery<NT> = Dequery<NT>,
> {
  [index: number]: NT;

  isResolved: boolean;
  options: DequeryOptions<NT>;
  elementCreationOptions: ElementCreationOptions;
  callStack: Call<NT>[];
  resultStack: NT[][];
  stackPointer: number;
  lastResolvedStackPointer: number;
  stoppedWithError: Error | null;
  lastResult: NT[] | CallChainImpl<NT, ET> | CallChainImplThenable<NT, ET>;
  length: number;
  chainStartTime: number;
  chainAsyncStartTime: number;
  chainAsyncFinishTime: number;

  // SSR-ability
  document: Document;
  window: Window;
  performance: Performance;
  Parser: typeof DOMParser;

  constructor(options: DequeryOptions<NT> = {}) {
    // merge default options with user-provided options
    this.options = {
      ...getDefaultDequeryOptions(),
      ...options,
    };

    const optionsKeys = Object.keys(getDefaultDequeryOptions()) as Array<
      keyof DequeryOptions<NT>
    >;

    this.options = pick(this.options, optionsKeys);

    this.window = this.options.globals!.window as Window;
    this.document = this.options.globals!.window!.document as Document;
    this.performance = this.options.globals!.performance as Performance;
    this.Parser = this.options.globals!.window!.DOMParser as typeof DOMParser;

    const elementCreationOptions: ElementCreationOptions = omit(
      options,
      optionsKeys,
    );

    this.elementCreationOptions = elementCreationOptions;

    this.callStack = [];
    this.resultStack = (
      options.resultStack ? [options.resultStack] : []
    ) as NT[][];
    this.stackPointer = 0;
    this.lastResolvedStackPointer = 0;
    this.stoppedWithError = null;
    this.lastResult = [];
    this.length = 0;
    this.isResolved = false;
    this.chainStartTime = this.performance.now() ?? 0; // mark start of sync chain
    this.chainAsyncStartTime = 0; // mark start of async chain
    this.chainAsyncFinishTime = 0; // mark end of async chain
  }

  get globals(): Globals {
    return this.options.globals as Globals;
  }

  // sync methods

  // currently selected nodes
  get nodes(): NodeType[] {
    return this.resultStack.length > 0
      ? (this.resultStack[this.resultStack.length - 1] as NodeType[])
      : [];
  }

  // allow for for .. of loop
  [Symbol.iterator]() {
    return this.nodes[Symbol.iterator]() as IterableIterator<NT>;
  }

  // async, direct result method

  getFirstElement(): PromiseLike<NT> {
    return createCall(
      this,
      "getFirstElement",
      async () => this[0] as NT,
    ) as PromiseLike<NT>;
  }

  // async, wrapped/chainable API methods

  debug(cb: (chain: CallChainImpl<NT, ET>) => void): ET {
    return createCall(this, "debug", async () => {
      cb(this);
      return this.nodes as NT;
    }) as unknown as ET;
  }

  ref(ref: Ref<any, NodeType>) {
    return createCall(this, "ref", async () => {
      // Check if ref is already marked as orphaned
      //if ((ref as any).orphan) {
      //  throw new Error("Ref has been orphaned from component unmount");
      //}

      // Check if ref is already available
      if (ref.current) {
        return [ref.current] as NT;
      }

      await waitForRef(ref, this.options.timeout!);

      if (ref.current) {
        return [ref.current] as NT;
      } else {
        console.log("❌ ref() - ref is still null after timeout");
        throw new Error("Ref is null or undefined after timeout");
      }
    });
  }

  query(selector: string) {
    return createCall(
      this,
      "query",
      async () => {
        return Array.from(
          await waitForDOM(
            () => Array.from(this.document.querySelectorAll(selector)),
            this.options.timeout!,
            this.document,
          ),
        ) as NT;
      },
      selector,
    );
  }

  next() {
    return traverse(this, "next", (el) => el.nextElementSibling);
  }

  prev() {
    return traverse(this, "prev", (el) => el.previousElementSibling);
  }

  find(
    selector: string,
  ): CallChainImplThenable<NT, ET> | CallChainImpl<NT, ET> {
    return createCall(
      this,
      "find",
      async () => {
        const results = await Promise.all(
          this.nodes.map(async (el) => {
            return await waitForDOM(
              () => Array.from((el as HTMLElement).querySelectorAll(selector)),
              this.options.timeout!,
              this.document,
            );
          }),
        );
        return results.flat() as NT;
      },
      selector,
    ) as CallChainImplThenable<NT, ET> | CallChainImpl<NT, ET>;
  }

  parent() {
    return traverse(this, "parent", (el) => el.parentElement);
  }

  children() {
    return traverse(this, "children", (el) => Array.from(el.children));
  }

  closest(selector: string) {
    return traverse(this, "closest", (el) => el.closest(selector));
  }

  first() {
    return createCall(this, "first", async () => {
      return this.nodes.slice(0, 1) as NT;
    });
  }

  last() {
    return createCall(this, "last", async () => {
      return this.nodes.slice(-1) as NT;
    });
  }

  // --- Attribute & Property Methods ---

  attr(name: string, value: string): PromiseLike<ET>;
  attr(name: string): PromiseLike<string | null>;
  attr(name: string, value?: string) {
    return createGetterSetterCall(
      this,
      "attr",
      value,
      // Getter function
      () => {
        if (this.nodes.length === 0) return null;
        return (this.nodes[0] as HTMLElement).getAttribute(name);
      },
      // Setter function
      (val) => {
        this.nodes.forEach((el) => (el as HTMLElement).setAttribute(name, val));
      },
    ) as PromiseLike<string | null | ET>;
  }

  // TODO: improve type safety here and remove any
  prop<K extends keyof AllHTMLElements>(
    name: K,
    value: DOMPropValue,
  ): PromiseLike<ET>;
  prop<K extends keyof AllHTMLElements>(name: K): PromiseLike<string>;
  prop<K extends keyof AllHTMLElements>(name: K, value?: DOMPropValue) {
    return createGetterSetterCall(
      this,
      "prop",
      value,
      // Getter function
      () => {
        if (this.nodes.length === 0) return undefined;
        return (this.nodes[0] as any)[name];
      },
      // Setter function
      (val) => {
        this.nodes.forEach((el) => {
          (el as any)[name] = val;
        });
      },
    ) as PromiseLike<DOMPropValue | ET>;
  }

  // --- CSS & Class Methods ---
  private static resultCache = new WeakMap<Element, Map<string, any>>();

  css(prop: CSSProperties): PromiseLike<ET>;
  css(prop: string, value: string): PromiseLike<ET>;
  css(prop: string): PromiseLike<string>;
  css(prop: string | CSSProperties, value?: string) {
    if (typeof prop === "object") {
      // Batch DOM operations for object CSS
      return createCall(this, "css", async () => {
        const elements = this.nodes;
        elements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          Object.entries(prop).forEach(([key, val]) => {
            htmlEl.style.setProperty(
              key.replace(/([A-Z])/g, "-$1").toLowerCase(),
              String(val),
            );
          });
        });
        return this.nodes as NT;
      }) as PromiseLike<ET>;
    }

    return createGetterSetterCall(
      this,
      "css",
      value,
      // Getter with caching - returns computed style (jQuery behavior)
      () => {
        if (this.nodes.length === 0) return "";

        const el = this.nodes[0] as HTMLElement;
        const cache = CallChainImpl.resultCache.get(el) || new Map();
        const cacheKey = `css:${prop}`;

        if (cache.has(cacheKey)) {
          return cache.get(cacheKey);
        }

        // Use getComputedStyle for jQuery-compatible behavior
        const computed = this.window.getComputedStyle(el);
        const result = computed.getPropertyValue(prop);
        cache.set(cacheKey, result);
        CallChainImpl.resultCache.set(el, cache);

        return result;
      },
      // Setter with cache invalidation
      (val) => {
        this.nodes.forEach((el) => {
          (el as HTMLElement).style.setProperty(prop, String(val));
          // Invalidate cache
          const cache = CallChainImpl.resultCache.get(el as Element);
          if (cache) {
            cache.delete(`css:${prop}`);
          }
        });
      },
    ) as PromiseLike<ET | string>;
  }

  addClass(name: string | Array<string>): ET {
    return createSyncCall(this, "addClass", () => {
      const list = Array.isArray(name) ? name : [name];
      this.nodes.forEach((el) => (el as HTMLElement).classList.add(...list));
      return this.nodes as NT;
    }, name) as unknown as ET;
  }

  removeClass(name: string | Array<string>): ET {
    return createSyncCall(this, "removeClass", () => {
      const list = Array.isArray(name) ? name : [name];
      this.nodes.forEach((el) => (el as HTMLElement).classList.remove(...list));
      return this.nodes as NT;
    }, name) as unknown as ET;
  }

  hasClass(name: string) {
    return createCall(
      this,
      "hasClass",
      async () =>
        this.nodes.every((el) =>
          (el as HTMLElement).classList.contains(name),
        ) as NT,
    ) as PromiseLike<boolean>;
  }

  toggleClass(name: string): ET {
    return createSyncCall(this, "toggleClass", () => {
      this.nodes.forEach((el) => (el as HTMLElement).classList.toggle(name));
      return this.nodes as NT;
    }, name) as unknown as ET;
  }

  animateClass(name: string, duration: number): ET {
    return createSyncCall(this, "animateClass", () => {
      this.nodes.forEach((el) => {
        const e = el as HTMLElement;
        e.classList.add(name);
        setTimeout(() => e.classList.remove(name), duration);
      });
      return this.nodes as NT;
    }, name, duration) as unknown as ET;
  }

  // --- Content Manipulation Methods ---

  empty(): ET {
    return createCall(
      this,
      "empty",
      async () => emptyImpl(this.nodes) as NT,
    ) as unknown as ET;
  }

  html(): PromiseLike<string>;
  html(html: string): PromiseLike<ET>;
  html(html?: string) {
    return createGetterSetterCall(
      this,
      "html",
      html,
      () => {
        // getter
        if (this.nodes.length === 0) return "";
        return (this.nodes[0] as HTMLElement).innerHTML;
      },
      (val) => {
        // setter
        this.nodes.forEach((el) => {
          (el as HTMLElement).innerHTML = val;
        });
      },
    ) as PromiseLike<string | ET>;
  }

  jsx(vdom: RenderInput): ET {
    if (!isJSX(vdom)) {
      throw new Error("Invalid JSX input");
    }

    return createCall(this, "jsx", async () => {
      this.nodes.forEach((el) =>
        updateDomWithVdom(el as HTMLElement, vdom, this.globals),
      );
      return this.nodes as NT;
    }) as unknown as ET;
  }

  /**
   * Alias for .jsx() - renders new JSX into the selected element(s).
   * Explicitly named to make clear that JSX is being rendered.
   */
  render(vdom: RenderInput): ET {
    return this.jsx(vdom);
  }

  text(text?: string) {
    return createGetterSetterCall(
      this,
      "text",
      text,
      // Getter function
      () => {
        if (this.nodes.length === 0) return "";
        return (this.nodes[0] as HTMLElement).textContent || "";
      },
      // Setter function
      (val) => {
        this.nodes.forEach((el) => {
          (el as HTMLElement).textContent = val;
        });
      },
    ) as PromiseLike<string>;
  }

  remove(): ET {
    return createCall(this, "remove", async () => {
      const removedElements = [...this.nodes];
      this.nodes.forEach((el) => (el as HTMLElement).remove());
      return removedElements as NT;
    }) as unknown as ET;
  }

  replaceWith(
    content:
      | string
      | RenderInput
      | NodeType
      | Ref<any, NodeType>
      | CallChainImpl<NT, ET>
      | CallChainImplThenable<NT, ET>,
  ): ET {
    return createCall(this, "replaceWith", async () => {
      const newElements: NodeType[] = [];

      // Render the new content into a DOM node
      const newElement = await renderNode(content, this);

      // For each element to be replaced - clone for multi-target (jQuery behavior)
      for (let i = 0; i < this.nodes.length; i++) {
        const originalEl = this.nodes[i];
        if (!originalEl?.parentNode) continue;
        if (!newElement) continue;

        // First target gets the original, others get clones
        const nodeToUse = i === 0 ? newElement : newElement.cloneNode(true);

        // Replace the original element with the new one
        originalEl.parentNode.replaceChild(nodeToUse, originalEl);
        newElements.push(nodeToUse as NodeType);
      }

      // Update the result stack with the new elements
      this.resultStack[this.resultStack.length - 1] = newElements as NT[];

      // Update array-like access (this[0], this[1], etc.) and length
      mapArrayIndexAccess(this, this);

      // Return the new elements that replaced the originals
      return newElements as NT;
    }) as unknown as ET;
  }

  append<T = NT>(
    content:
      | string
      | RenderInput
      | NodeType
      | Ref<any, NodeType>
      | CallChainImpl<T>
      | CallChainImplThenable<T>,
  ): ET {
    return createCall(this, "append", async () => {
      // Don't do anything if content is null or undefined
      if (content == null) {
        return this.nodes as NT;
      }

      if (content instanceof Node) {
        // If content is a Node, append it directly
        // Clone for multi-target to match jQuery behavior (each target gets its own copy)
        this.nodes.forEach((el, index) => {
          if (
            el &&
            content &&
            !el.isEqualNode(content) &&
            el.parentNode !== content
          ) {
            // First target gets the original, others get clones
            const nodeToAppend = index === 0 ? content : content.cloneNode(true);
            (el as HTMLElement).appendChild(nodeToAppend);
          }
        });
        return this.nodes as NT;
      }

      const element = await renderNode(content, this);
      if (!element) return this.nodes as NT;

      if (isDequery(content)) {
        // Special handling for Dequery objects which may contain multiple elements
        // Clone for multi-target to match jQuery behavior
        const children = (content as CallChainImpl<T>).nodes as Node[];
        this.nodes.forEach((parent, parentIndex) => {
          children.forEach((child) => {
            if (!child?.nodeType || !(parent as Node)?.nodeType) return;
            if ((child as Node).isEqualNode(parent) || parent?.parentNode === child) return;

            // First parent gets the original, others get clones
            const nodeToInsert = parentIndex === 0 ? child : child.cloneNode(true);
            (parent as HTMLElement).appendChild(nodeToInsert);
          });
        });
      } else if (
        typeof content === "string" &&
        isMarkup(content, this.Parser)
      ) {
        // Special handling for HTML strings which might produce multiple elements
        // Clone for multi-target to match jQuery behavior (each target gets its own copy)
        const elements = renderMarkup(content, this.Parser);
        this.nodes.forEach((el, parentIndex) => {
          elements.forEach((childEl) => {
            const node = parentIndex === 0 ? childEl : childEl.cloneNode(true);
            (el as HTMLElement).appendChild(node as Node);
          });
        });
      } else {
        // Single element handling - clone for multi-target
        this.nodes.forEach((el, index) => {
          if (!element) return;
          const nodeToAppend = index === 0 ? element : element.cloneNode(true);
          (el as HTMLElement).appendChild(nodeToAppend as Node);
        });
      }

      return this.nodes as NT;
    }) as unknown as ET;
  }

  appendTo<T = NT>(
    target:
      | string
      | NodeType
      | Ref<any, NodeType>
      | CallChainImpl<T>
      | CallChainImplThenable<T>,
  ): ET {
    return createCall(this, "appendTo", async () => {
      const nodes = await resolveNodes(
        target,
        this.options.timeout!,
        this.document,
      );

      if (nodes.length === 0) {
        return this.nodes as NT;
      }

      nodes.forEach((node) => {
        this.nodes.forEach((el) => {
          if (!node || !el) return;
          node.appendChild(el.cloneNode(true));
        });
      });

      return this.nodes as NT;
    }) as unknown as ET;
  }

  /**
   * @deprecated Use .jsx() or .render() for rendering JSX content. This method will be removed in v4.
   * Note: .update() with props object for component re-rendering is still supported.
   */
  update(
    input?:
      | string
      | RenderInput
      | Ref<any, NodeType>
      | NodeType
      | CallChainImpl<NT>
      | CallChainImplThenable<NT>
      | Record<string, unknown>,  // NEW: props object for implicit update
    transitionConfig?: import("../render/transitions.js").TransitionConfig,
  ): ET {
    return createCall(this, "update", async () => {
      // Check if this is an implicit props update (object with no VNode structure)
      // Only treat it as props-update if the target is in the component registry
      // Guard against VNode, Ref, and Dequery objects which pass the "object" check
      if (
        input &&
        typeof input === "object" &&
        !(input instanceof Node) &&
        !isJSX(input) &&
        !isRef(input) &&
        !isDequery(input)
      ) {
        let didImplicitUpdate = false;

        for (const node of this.nodes) {
          if (!(node instanceof Element)) continue;

          const instance = getComponentInstance(node);
          if (!instance) continue;

          // This is a registered component - perform implicit props update
          Object.assign(instance.props, input);
          const newVNode = instance.renderFn(instance.props);

          // Morph in-place
          updateDomWithVdom(node as HTMLElement, newVNode, this.globals);
          instance.prevVNode = newVNode;

          didImplicitUpdate = true;
        }

        if (didImplicitUpdate) {
          return this.nodes as NT;
        }
        // Fallthrough: not a registered component, treat as explicit update
      }

      // Explicit update (existing behavior)
      return (await updateDom(
        input as RenderInput,
        this.nodes,
        this.options.timeout!,
        this.Parser,
        transitionConfig,
      )) as NT;
    }) as unknown as ET;
  }

  // --- Event Methods ---

  on(event: string, handler: EventListener): ET {
    return createSyncCall(
      this,
      "on",
      () => {
        this.nodes.forEach((el) => {
          addElementEvent(el as HTMLElement, event, handler);
        });
        return this.nodes as NT;
      },
      event,
      handler,
    ) as unknown as ET;
  }

  off(event: string, handler?: EventListener): ET {
    return createSyncCall(
      this,
      "off",
      () => {
        this.nodes.forEach((el) => {
          removeElementEvent(el as HTMLElement, event, handler);
        });
        return this.nodes as NT;
      },
      event,
      handler,
    ) as unknown as ET;
  }

  clearEvents(): ET {
    return createSyncCall(this, "clearEvents", () => {
      this.nodes.forEach((el) => {
        clearElementEvents(el as HTMLElement);
      });
      return this.nodes as NT;
    }) as unknown as ET;
  }

  trigger(eventType: string): ET {
    return createSyncCall(
      this,
      "trigger",
      () => {
        this.nodes.forEach((el) =>
          (el as HTMLElement).dispatchEvent(
            new Event(eventType, { bubbles: true, cancelable: true }),
          ),
        );
        return this.nodes as NT;
      },
      eventType,
    ) as unknown as ET;
  }

  // --- Position Methods ---

  position() {
    return createCall(
      this,
      "position",
      async () =>
        ({
          top: (this.nodes[0] as HTMLElement).offsetTop,
          left: (this.nodes[0] as HTMLElement).offsetLeft,
        }) as NT,
    ) as PromiseLike<Position>;
  }

  offset() {
    return createCall(this, "offset", async () => {
      const el = this.nodes[0] as HTMLElement;
      const rect = el.getBoundingClientRect();
      return {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
      } as NT;
    }) as PromiseLike<Position>;
  }

  // --- Data Methods ---

  data(name: string, value?: string) {
    return createGetterSetterCall(
      this,
      "data",
      value,
      // Getter function
      () => {
        if (this.nodes.length === 0) return undefined;
        return (this.nodes[0] as HTMLElement).dataset[name];
      },
      // Setter function
      (val) => {
        this.nodes.forEach((el) => {
          (el as HTMLElement).dataset[name] = val;
        });
      },
    ) as PromiseLike<string | undefined>;
  }

  val(val?: string | boolean) {
    return createGetterSetterCall(
      this,
      "val",
      val,
      // Getter function
      () => {
        if (this.nodes.length === 0) return "";
        const el = this.nodes[0] as HTMLInputElement;
        if (el.type === "checkbox") {
          return el.checked;
        }
        return el.value;
      },
      // Setter function
      (value) => {
        this.nodes.forEach((el) => {
          const input = el as HTMLInputElement;
          if (input.type === "checkbox" && typeof value === "boolean") {
            input.checked = value;
          } else {
            input.value = String(value);
          }
        });
      },
    ) as PromiseLike<string | boolean>;
  }

  serialize(
    format: "querystring" | "json" = "querystring",
  ): PromiseLike<string> {
    const mapValue = (value: string | boolean) =>
      typeof value === "boolean" ? (value ? "on" : "off") : value;

    return createCall(this, "serialize", async () => {
      const formData = getAllFormValues(this);
      if (format === "json") {
        return JSON.stringify(formData) as NT;
      } else {
        const urlSearchParams = new URLSearchParams();
        const keys = Object.keys(formData);
        keys.forEach((key) => {
          const value = formData[key];
          if (typeof value === "string") {
            urlSearchParams.append(key, value);
          } else if (typeof value === "boolean") {
            urlSearchParams.append(key, mapValue(value));
          } else if (Array.isArray(value)) {
            value.forEach((value) =>
              urlSearchParams.append(key, mapValue(value)),
            );
          }
        });
        return urlSearchParams.toString() as NT;
      }
    }) as PromiseLike<string>;
  }

  form<T = FormKeyValues>(formData?: Record<string, string | boolean>) {
    return createGetterSetterCall(
      this,
      "form",
      formData,
      // Getter function
      () => getAllFormValues(this),
      // Setter function
      (values) => {
        this.nodes.forEach((el) => {
          processAllFormElements(el, (input, key) => {
            if (values[key] !== undefined) {
              if (input.type === "checkbox") {
                (input as HTMLInputElement).checked = Boolean(values[key]);
              } else {
                input.value = String(values[key]);
              }
            }
          });
        });
      },
    ) as PromiseLike<T>;
  }

  // --- Dimension Methods ---

  dimension(
    includeMarginOrPadding?: boolean,
    includePaddingIfMarginTrue?: boolean,
  ) {
    return createCall(this, "dimension", async () => {
      if (this.nodes.length === 0) {
        return { width: 0, height: 0 } as NT;
      }

      const el = this.nodes[0] as HTMLElement;
      const style = this.window.getComputedStyle(el);
      if (!style) return { width: 0, height: 0 } as NT;

      // Get base element dimensions from getBoundingClientRect
      const rect = el.getBoundingClientRect();
      let width = rect.width;
      let height = rect.height;

      let includeMargin = false;
      let includePadding = true; // Default based on getBoundingClientRect

      // Determine flags based on arguments provided
      if (includePaddingIfMarginTrue !== undefined) {
        // Both arguments provided: dimension(includeMargin, includePadding)
        includeMargin = !!includeMarginOrPadding;
        includePadding = !!includePaddingIfMarginTrue;
      } else if (includeMarginOrPadding !== undefined) {
        // One argument provided: dimension(includePadding)
        includePadding = !!includeMarginOrPadding;
      }

      // Subtract padding if includePadding is false
      if (!includePadding) {
        const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
        const paddingRight = Number.parseFloat(style.paddingRight) || 0;
        const paddingTop = Number.parseFloat(style.paddingTop) || 0;
        const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;

        // Subtract border widths as well
        const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
        const borderRight = Number.parseFloat(style.borderRightWidth) || 0;
        const borderTop = Number.parseFloat(style.borderTopWidth) || 0;
        const borderBottom = Number.parseFloat(style.borderBottomWidth) || 0;

        width -= paddingLeft + paddingRight + borderLeft + borderRight;
        height -= paddingTop + paddingBottom + borderTop + borderBottom;
      }

      // If includeMargin is true, calculate outer dimensions
      if (includeMargin) {
        const marginLeft = Number.parseFloat(style.marginLeft) || 0;
        const marginRight = Number.parseFloat(style.marginRight) || 0;
        const marginTop = Number.parseFloat(style.marginTop) || 0;
        const marginBottom = Number.parseFloat(style.marginBottom) || 0;

        const baseWidthForOuter = includePadding ? rect.width : width;
        const baseHeightForOuter = includePadding ? rect.height : height;

        const outerWidth = baseWidthForOuter + marginLeft + marginRight;
        const outerHeight = baseHeightForOuter + marginTop + marginBottom;

        return {
          width,
          height,
          outerWidth,
          outerHeight,
        } as NT;
      }

      return {
        width,
        height,
      } as NT;
    }) as PromiseLike<Dimensions>;
  }

  // --- Visibility Methods ---

  isVisible() {
    return createCall(this, "isVisible", async () => {
      if (this.nodes.length === 0) return false as NT;
      const el = this.nodes[0] as HTMLElement;
      return checkElementVisibility(el, this.window, this.document) as NT;
    }) as PromiseLike<boolean>;
  }

  isHidden() {
    return createCall(this, "isHidden", async () => {
      if (this.nodes.length === 0) return true as NT;
      const el = this.nodes[0] as HTMLElement;
      return !checkElementVisibility(el, this.window, this.document) as NT;
    }) as PromiseLike<boolean>;
  }

  // --- Scrolling Methods ---

  scrollTo(xOrOptions: number | ScrollToOptions, y?: number): ET {
    return createCall(this, "scrollTo", async () => {
      return scrollHelper("scrollTo", this.nodes, xOrOptions, y) as NT;
    }) as unknown as ET;
  }

  scrollBy(xOrOptions: number | ScrollToOptions, y?: number): ET {
    return createCall(this, "scrollBy", async () => {
      return scrollHelper("scrollBy", this.nodes, xOrOptions, y) as NT;
    }) as unknown as ET;
  }

  scrollIntoView(options?: boolean | ScrollIntoViewOptions): ET {
    return createCall(this, "scrollIntoView", async () => {
      if (this.nodes.length === 0) return this.nodes as NT;
      (this.nodes[0] as HTMLElement).scrollIntoView(options);
      return this.nodes as NT;
    }) as unknown as ET;
  }

  // --- Transformation Methods ---

  map<T>(cb: (el: NT, idx: number) => T) {
    return createCall(this, "map", async () => {
      const elements = this.nodes;
      const results: T[] = new Array(elements.length);

      for (let i = 0; i < elements.length; i++) {
        results[i] = cb(elements[i] as NT, i);
      }

      return results as any;
    }) as PromiseLike<T[]>;
  }

  toArray() {
    return createCall(
      this,
      "toArray",
      async () => [...(this.nodes as NT[])] as NT,
    ) as PromiseLike<NT[]>;
  }

  filter(selector: string): ET {
    return createCall(
      this,
      "filter",
      async () =>
        this.nodes.filter(
          (el) => el instanceof Element && el.matches(selector),
        ) as NT,
    ) as unknown as ET;
  }

  // --- Cleanup Methods ---

  /** memory cleanup (chain becomes useless after calling this method) */
  dispose(): PromiseLike<void> {
    return createCall(this, "dispose", async () => {
      this.nodes.forEach((el) => {
        CallChainImpl.resultCache.delete(el as Element);
      });

      this.callStack.length = 0;
      this.resultStack.length = 0;
      this.stackPointer = 0;
      this.lastResolvedStackPointer = 0;

      return undefined as any;
    }) as PromiseLike<void>;
  }

  ready(callback?: () => void): ET {
    return createCall(this, "ready", async () => {
      // Check if DOM is already ready
      if (
        this.document.readyState === "complete" ||
        this.document.readyState === "interactive"
      ) {
        // DOM is already ready, execute callback immediately if provided
        if (callback) {
          callback();
        }
        return this.nodes as NT;
      }

      // DOM is not ready, wait for DOMContentLoaded event
      // Capture the current context to avoid scope issues
      const nodes = this.nodes;
      const document = this.document;

      return new Promise<NT>((resolve) => {
        const handleDOMContentLoaded = () => {
          document.removeEventListener(
            "DOMContentLoaded",
            handleDOMContentLoaded,
          );
          if (callback) {
            callback();
          }
          resolve(nodes as NT);
        };

        document.addEventListener("DOMContentLoaded", handleDOMContentLoaded);
      });
    }) as unknown as ET;
  }

  // TODO:
  // - deserialize (from URL string, JSON, etc.)
}

export class CallChainImplThenable<
  NT = DequerySyncMethodReturnType,
  ET extends Dequery<NT> = Dequery<NT>,
> extends CallChainImpl<NT, ET> {
  constructor(options: DequeryOptions<NT> = {}, isResolved = false) {
    super(options);
    this.isResolved = isResolved;
  }

  // biome-ignore lint/suspicious/noThenProperty: <explanation>
  then(
    onfulfilled?: (value: CallChainImpl<NT, ET>) => CallChainImpl<NT, ET>,
    onrejected?: (reason: any) => any | PromiseLike<any>,
  ): Promise<any> {
    this.chainAsyncStartTime = this.performance.now() ?? 0;

    if (this.stoppedWithError) {
      return Promise.reject(this.stoppedWithError).then(
        onfulfilled as any,
        onrejected,
      );
    }

    if (this.isResolved && this.stackPointer >= this.callStack.length) {
      this.lastResolvedStackPointer = this.stackPointer;
      const lastCallName = this.callStack[this.callStack.length - 1]?.name;

      let result;
      if (isNonChainedReturnCall(lastCallName)) {
        result = this.lastResult;
      } else {
        // We cannot return a CallChainImplThenable here, because returning
        // a thenable in a thenable will cause the chain to be infinitely recursing.
        // Because we don't want to use a Proxy to intercept the calls,
        // we turn the CallChainImplThenable into a CallChainImpl cloning
        // it's internal state, and marking isResolved as true, as it
        // is, in fact, resolved. This allows to finish the chain for
        // the moment (await will unwrap the Promise), but keep the
        // possibility for any subsequent synchonous calls to be further
        // chained onto the stack (same state, different instance)
        result = createSubChain<NT, ET>(this, CallChainImpl, true);
      }

      // performance metrics tracking
      this.chainAsyncFinishTime =
        (this.performance.now() ?? 0) - this.chainAsyncStartTime;

      return Promise.resolve(result).then(onfulfilled as any, onrejected);
    }

    return runWithTimeGuard<NT>(
      this.options.timeout!,
      async () => {
        // Track start time for performance metrics (not for timeout - that's handled by runWithTimeGuard)
        const startTime = Date.now();
        let call: Call<NT>;

        // Process all queued calls in the call stack
        while (this.stackPointer < this.callStack.length) {
          call = this.callStack[this.stackPointer];

          try {
            // Execute the current call in the stack
            const callReturnValue = (await call.fn.apply(this)) as NT[];
            this.lastResult = callReturnValue;

            // Method returns that return a value directly, don't modify the selection result stack.
            // This allows for getting values from elements or modifying elements (e.g. html()) in
            // between selection changes without breaking the chain functionally (the chain expects
            // all this.resultStack values to be of a DOM node type)
            if (!isNonChainedReturnCall(call.name)) {
              this.resultStack.push(callReturnValue);
            }

            if (Array.isArray(this.lastResult)) {
              // Allow for array-like access, immediately after the call.
              // This is important for the next call to be able to access the result index-wise
              mapArrayIndexAccess(this, this);
            }

            this.stackPointer++;
          } catch (err) {
            this.stoppedWithError = err as Error;
            throw err;
          }
        }

        // At this point, we have finished all calls in the stack
        this.isResolved = true;

        // Performance metrics tracking - record the time taken for async chain execution
        this.chainAsyncFinishTime =
          (this.performance.now() ?? 0) - this.chainAsyncStartTime;

        return this;
      },
      [this], // ← Pass the chain context as args[0]
      // Timeout error handler - called by runWithTimeGuard when timeout is exceeded
      (ms, call) => {
        this.stoppedWithError = new Error(
          `Chain execution timeout after ${ms}ms`,
        );
        // TODO: implement a onMaxTimeExceeded() method and find it here (Call)
        //this.options.onTimeGuardError!(ms, call);
      },
    )
      .then((result) => {
        onfulfilled!(result);
        return result;
      })
      .catch(onrejected);
  }

  catch<TResult = never>(
    onrejected?: (reason: any) => TResult | PromiseLike<TResult>,
  ): Promise<any | TResult> {
    return this.then(undefined, onrejected);
  }

  finally(onfinally?: () => void): Promise<any> {
    return this.then(
      (value) => {
        onfinally?.();
        return value;
      },
      (reason) => {
        onfinally?.();
        throw reason;
      },
    );
  }
}

export function scrollHelper<T = NodeType>(
  methodName: "scrollTo" | "scrollBy",
  elements: T[],
  xOrOptions: number | ScrollToOptions,
  y?: number,
): T[] {
  elements.forEach((el) => {
    const element = el as unknown as HTMLElement;
    if (typeof xOrOptions === "object") {
      element[methodName](xOrOptions);
    } else if (y !== undefined) {
      element[methodName](xOrOptions, y);
    } else {
      element[methodName](xOrOptions, 0);
    }
  });
  return elements;
}

export function getAllFormValues(
  chain: CallChainImpl<any, any>,
): FormKeyValues {
  const formFields: FormKeyValues = {};

  const mapCheckboxValue = (value: string) => (value === "on" ? true : value);

  chain.nodes.forEach((el) => {
    processAllFormElements(el, (input, key) => {
      if (!key) return; // Skip elements without name/id

      // Handle checkboxes and radio buttons
      if (input instanceof HTMLInputElement) {
        if (input.type === "checkbox") {
          if (input.checked) {
            const value = mapCheckboxValue(input.value);
            if (typeof formFields[key] !== "undefined") {
              formFields[key] = [formFields[key] as FormFieldValue, value];
            } else if (Array.isArray(formFields[key])) {
              (formFields[key] as Array<FormFieldValue>).push(value);
            } else {
              formFields[key] = value;
            }
          }
        } else if (input.type === "radio") {
          // Only include checked radio buttons
          if (input.checked) {
            formFields[key] =
              (input as HTMLInputElement).value === "on"
                ? true
                : (input as HTMLInputElement).value;
          }
        } else if (input.type === "file") {
          // For file inputs, get the file name(s)
          if (input.files?.length) {
            const fileNames = Array.from(input.files).map((file) => file.name);
            formFields[key] = fileNames.length === 1 ? fileNames[0] : fileNames;
          }
        } else {
          // Regular text inputs
          formFields[key] = input.value;
        }
      }
      // Handle select elements
      else if (input instanceof HTMLSelectElement) {
        if (input.multiple) {
          // For multi-select, collect all selected options
          const values = Array.from(input.selectedOptions).map(
            (option) => option.value,
          );
          formFields[key] = values.length === 1 ? values[0] : values;
        } else {
          // Single select
          formFields[key] = input.value;
        }
      }
      // Handle textareas
      else if (input instanceof HTMLTextAreaElement) {
        formFields[key] = input.value;
      }
    });
  });
  return formFields;
}

export function delayedAutoStart<
  NT = DequerySyncMethodReturnType,
  ET extends Dequery<NT> = Dequery<NT>,
>(
  chain: CallChainImplThenable<NT, ET> | CallChainImpl<NT, ET>,
): CallChainImplThenable<NT, ET> | CallChainImpl<NT, ET> {
  if (chain.options.autoStart) {
    setTimeout(async () => {
      // still not started (no then() called)
      if (chain.chainAsyncStartTime === 0) {
        chain = await chain;
      }
    }, chain.options.autoStartDelay!);
  }
  return chain;
}

export interface Dequery<NT>
  extends CallChainImplThenable<NT>,
  CallChainImpl<NT> { }

export function dequery<
  NT = DequerySyncMethodReturnType,
  ET extends Dequery<NT> = Dequery<NT>,
>(
  selectorRefOrEl:
    | string
    | NodeType
    | Ref<any, NodeType>
    | RenderInput
    | Function,
  options: DequeryOptions<NT> &
    ElementCreationOptions = getDefaultDequeryOptions(),
): ET {
  // async co-routine execution
  if (typeof selectorRefOrEl === "function") {
    const syncChain = dequery("body", options);
    queueMicrotask(async () => {
      const result = await selectorRefOrEl();
      if (!syncChain.isResolved) {
        if (typeof result !== "undefined") {
          const newChain = dequery(result, options);
          syncChain.resultStack = newChain.resultStack;
          syncChain.lastResult = newChain.lastResult;
          mapArrayIndexAccess(newChain, syncChain);
        }
      }
    });
    return delayedAutoStart(syncChain) as unknown as ET;
  }

  // standard options -- selector handling

  const chain = new CallChainImplThenable<NT, ET>({
    ...options,
    resultStack: [],
  });

  if (!selectorRefOrEl)
    throw new Error("dequery: selector/ref/element required");

  if (typeof selectorRefOrEl === "string") {
    if (selectorRefOrEl.indexOf("<") === 0) {
      const elements = renderMarkup(selectorRefOrEl, chain.Parser);
      const renderRootEl = elements[0];

      const { text, html, ...attributes } = chain.elementCreationOptions;

      if (renderRootEl instanceof Element) {
        Object.entries(attributes).forEach(([key, value]) => {
          (renderRootEl as Element).setAttribute(key, String(value));
        });

        if (html) {
          renderRootEl.innerHTML = html;
        } else if (text) {
          renderRootEl.textContent = text;
        }
      }

      chain.resultStack = [elements as NT[]];
      return delayedAutoStart(chain) as unknown as ET;
    } else {
      return delayedAutoStart(
        chain.query(selectorRefOrEl) as CallChainImplThenable<NT, ET>,
      ) as unknown as ET;
    }
  } else if (isRef(selectorRefOrEl)) {
    return delayedAutoStart(
      chain.ref(selectorRefOrEl as Ref<any, NodeType>) as CallChainImplThenable<
        NT,
        ET
      >,
    ) as unknown as ET;
  } else if ((selectorRefOrEl as Node).nodeType) {
    chain.resultStack = [[selectorRefOrEl as NT]];
    return delayedAutoStart(chain) as unknown as ET;
  } else if (isJSX(selectorRefOrEl)) {
    const renderResult = renderIsomorphicSync(
      selectorRefOrEl as RenderInput,
      chain.document.body,
      chain.globals,
    );
    const elements = (
      typeof renderResult !== "undefined"
        ? Array.isArray(renderResult)
          ? renderResult
          : [renderResult]
        : []
    ) as NodeType[];
    chain.resultStack = [elements as NT[]];
    return delayedAutoStart(chain) as unknown as ET;
  }
  throw new Error("Unsupported selectorOrEl type");
}

dequery.extend = <TExtendedClass extends new (...args: any[]) => any>(
  ExtensionClass: TExtendedClass,
  nonChainedReturnCalls: string[] = [],
) => {
  // Get the prototype of the extension class
  const extensionPrototype = ExtensionClass.prototype;
  const basePrototype = CallChainImpl.prototype;

  // Get all method names from the extension class prototype
  const extensionMethods = Object.getOwnPropertyNames(extensionPrototype);
  const baseMethods = Object.getOwnPropertyNames(basePrototype);

  // Only add methods that don't exist on the base prototype
  extensionMethods.forEach((methodName) => {
    if (
      methodName !== "constructor" &&
      !baseMethods.includes(methodName) &&
      typeof extensionPrototype[methodName] === "function"
    ) {
      // Add to both CallChainImpl and CallChainImplThenable prototypes
      (CallChainImpl.prototype as any)[methodName] =
        extensionPrototype[methodName];
      (CallChainImplThenable.prototype as any)[methodName] =
        extensionPrototype[methodName];
    }
  });

  // Add non-chained return calls to the global list
  if (nonChainedReturnCalls.length > 0) {
    addNonChainedReturnCallNames(nonChainedReturnCalls);
  }

  // Return a typed function that produces instances of the extended class type
  return <NT = DequerySyncMethodReturnType>(
    selectorRefOrEl:
      | string
      | NodeType
      | Ref<any, NodeType>
      | RenderInput
      | Function,
    options?: DequeryOptions<NT> & ElementCreationOptions,
  ): InstanceType<TExtendedClass> => {
    return dequery(
      selectorRefOrEl,
      options,
    ) as unknown as InstanceType<TExtendedClass>;
  };
};

export const $: typeof dequery & {
  extend: <TExtendedClass extends new (...args: any[]) => any>(
    ExtensionClass: TExtendedClass,
  ) => <NT = DequerySyncMethodReturnType>(
    selectorRefOrEl:
      | string
      | NodeType
      | Ref<any, NodeType>
      | RenderInput
      | Function,
    options?: DequeryOptions<NT> & ElementCreationOptions,
  ) => InstanceType<TExtendedClass>;
} = dequery as any;

export function isDequery(
  obj: unknown,
): obj is CallChainImplThenable | CallChainImpl {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "isResolved" in obj &&
    "lastResult" in obj &&
    "resultStack" in obj &&
    "callStack" in obj &&
    "stackPointer" in obj
  );
}

export function isDequeryOptionsObject(o: object) {
  return (
    o &&
    typeof o === "object" &&
    (o as DequeryOptions).timeout !== undefined &&
    (o as DequeryOptions).globals !== undefined
  );
}

let defaultOptions: DequeryOptions<any> | null = null;

export function getDefaultDequeryOptions<NT>(): DequeryOptions<NT> {
  if (!defaultOptions) {
    defaultOptions = {
      timeout: 5000 /** ms */,
      // even long sync chains would execute in < .1ms
      // so after 1ms, we can assume the "await" in front is
      // missing (intentionally non-blocking in sync code)
      autoStartDelay: 1 /** ms */,
      autoStart: true,
      resultStack: [],
      globals: {
        document: globalThis.document,
        window: globalThis.window,
        performance: globalThis.performance,
      },
    };
  }
  return { ...defaultOptions } as DequeryOptions<NT>;
}

export function mapArrayIndexAccess<
  NT = DequerySyncMethodReturnType,
  ET extends Dequery<NT> = Dequery<NT>,
>(source: CallChainImpl<NT, ET>, target: CallChainImpl<NT, ET>) {
  const elements = source.nodes;
  // allow for array-like access
  for (let i = 0; i < elements.length; i++) {
    target[i] = elements[i] as NT;
  }
  target.length = elements.length;
}

export function createCall<NT, ET extends Dequery<NT>>(
  chain: CallChainImpl<NT, ET>,
  methodName: string,
  handler: () => Promise<NT>,
  ...callArgs: any[] // ← Add this to capture call arguments
): CallChainImplThenable<NT, ET> | CallChainImpl<NT, ET> {
  chain.callStack.push(new Call<NT>(methodName, handler, ...callArgs));
  return subChainForNextAwait(chain);
}

/**
 * Creates a sync-safe call that executes immediately if no operations are pending.
 * Use this for methods that don't need async waiting (e.g., .on(), .addClass()).
 * 
 * Safety rule: Only executes immediately when callStack.length === 0,
 * ensuring correct ordering when async ops like .find() are queued.
 */
export function createSyncCall<NT, ET extends Dequery<NT>>(
  chain: CallChainImpl<NT, ET>,
  methodName: string,
  handler: () => NT,
  ...callArgs: any[]
): CallChainImplThenable<NT, ET> | CallChainImpl<NT, ET> {
  // Only safe to run immediately if nothing is queued before us
  const canRunNow = chain.callStack.length === 0;

  console.log(`[createSyncCall] method=${methodName}, callStack.length=${chain.callStack.length}, nodes.length=${chain.nodes.length}, canRunNow=${canRunNow}`);

  if (canRunNow) {
    // Execute immediately (synchronously)
    console.log(`[createSyncCall] Executing ${methodName} immediately`);
    const result = handler();

    // Maintain same bookkeeping shape as async execution
    if (Array.isArray(result)) {
      chain.resultStack.push(result as NT[]);
      chain.lastResult = result as NT[];
    } else {
      chain.lastResult = [result] as NT[];
    }

    return subChainForNextAwait(chain);
  }

  // Otherwise: must be queued to preserve ordering with pending ops
  chain.callStack.push(
    new Call<NT>(
      methodName,
      async () => handler(),
      ...callArgs,
    ),
  );

  return subChainForNextAwait(chain);
}

export function createGetterSetterCall<NT, ET extends Dequery<NT>, T, V>(
  chain: CallChainImpl<NT, ET>,
  methodName: string,
  value: V | undefined,
  getter: () => T,
  setter: (value: V) => void,
): CallChainImplThenable<NT, ET> | CallChainImpl<NT, ET> {
  if (value !== undefined) {
    return createCall(chain, methodName, async () => {
      setter(value);
      return chain.nodes as NT;
    });
  } else {
    return createCall(chain, methodName, async () => {
      return getter() as unknown as NT;
    });
  }
}

export function createSubChain<
  NT = DequerySyncMethodReturnType,
  ET extends Dequery<NT> = Dequery<NT>,
>(
  source: CallChainImpl<NT, ET>,
  Constructor:
    | typeof CallChainImpl
    | typeof CallChainImplThenable = CallChainImpl,
  isResolved = false,
) {
  const subChain = new Constructor<NT, ET>(source.options);
  subChain.callStack = source.callStack;
  subChain.resultStack = source.resultStack;
  subChain.stackPointer = source.stackPointer;
  subChain.stoppedWithError = source.stoppedWithError;
  subChain.lastResult = source.lastResult;
  subChain.isResolved =
    typeof isResolved !== "undefined" ? isResolved : source.isResolved;
  subChain.lastResolvedStackPointer = source.lastResolvedStackPointer;

  if (Array.isArray(subChain.lastResult)) {
    mapArrayIndexAccess(source, subChain);
  }
  return delayedAutoStart(subChain);
}

export function subChainForNextAwait<NT, ET extends Dequery<NT>>(
  source: CallChainImpl<NT, ET>,
): CallChainImplThenable<NT, ET> | CallChainImpl<NT, ET> {
  // First continuation of chain case (second await in the chain)
  // The chain was finished by resolving the chain by a then() call.
  // The lastResolvedStackPointer therefore is set to the last call.
  // But in the meantime, the developer has added more calls to the chain.
  // We need to slice the call stack and result stack to the last resolved call.
  // The developer will run the then() again by using the await keyword.
  //
  // Example:
  // const result = await $<HTMLElement>("#container").children().next();
  // const result2 = await result.next();
  //
  // ...we're currently at the synchronous chaining stage here, not the await (then) stage
  // when the next() method called this subChainForNextAwait().
  if (source.lastResolvedStackPointer) {
    source.callStack = source.callStack.slice(source.lastResolvedStackPointer);
    source.stackPointer = source.stackPointer - source.lastResolvedStackPointer;
    source.resultStack = source.resultStack.slice(
      source.lastResolvedStackPointer,
    );
    source.lastResult = source.resultStack[source.resultStack.length - 1] || [];
    source.lastResolvedStackPointer = 0;
    source.stoppedWithError = null;
  }

  // Second continuation (3rd await in a chain case)
  // If this is already a CallChainImplBut not a thenable
  // we need to explicitly return a fresh thenable chain

  // The second chain (see above) finished because the await called the then() again,
  // but this time, no lastResolvedStackPointer is set. However, the chain is in
  // a result state (after then() has been executed). Therefore, the instance is not
  // a CallChainImplThenable but a CallChainImpl. We clone this chain as a
  // CallChainImplThenable and return it.

  // Example:
  // const result = await $<HTMLElement>("#container").children().next();
  // const result2 = await result.next();
  // const result3 = await result2.next(); // we're here.
  return source instanceof CallChainImplThenable
    ? source
    : createSubChain(source, CallChainImplThenable);
}

export function runWithTimeGuard<NT>(
  timeout: number,
  fn: Function,
  args: any[],
  onError: (ms: number, call: Call<NT>) => void,
): Promise<any> {
  const operationId = Math.random().toString(36).substr(2, 9);

  return createTimeoutPromise(
    timeout,
    async () => {
      //console.log(`🟢 Executing operation [${operationId}]`);

      // Log the call stack to see which calls are being processed
      const chainContext = args[0] as CallChainImpl<NT, any>;
      if (chainContext?.callStack && chainContext.stackPointer !== undefined) {
        const remainingCalls = chainContext.callStack
          .slice(chainContext.stackPointer)
          .map((call) => call.name)
          .join(" -> ");
        //console.log(`📋 Call stack [${operationId}]: ${remainingCalls}`);
      } else {
        //console.log(`📋 Call stack [${operationId}]: unknown`);
      }

      const result = await fn(...args);
      //console.log(`✅ Operation [${operationId}] completed successfully`);
      return result;
    },
    (ms) => {
      console.log(`🔴 TIMEOUT [${operationId}] after ${ms}ms`);

      // Log which call was being processed when timeout occurred
      const chainContext = args[0] as CallChainImpl<NT, any>;
      if (chainContext?.callStack && chainContext.stackPointer !== undefined) {
        const currentCall = chainContext.callStack[chainContext.stackPointer];
        const remainingCalls = chainContext.callStack
          .slice(chainContext.stackPointer)
          .map((call) => `${call.name}(${call.args.join(", ")})`)
          .join(" -> ");
        console.log(
          `🔴 TIMEOUT occurred during call: ${currentCall?.name || "unknown"}`,
        );
        console.log(`🔴 Remaining calls were: ${remainingCalls}`);
      } else {
        console.log("🔴 Call stack at timeout: unknown");
      }

      const fakeCall = new Call<NT>("timeout", async () => [] as NT);
      onError(ms, fakeCall);
    },
  );
}

export async function renderNode<T = DequerySyncMethodReturnType>(
  input:
    | string
    | RenderInput
    | NodeType
    | Dequery<T>
    | Ref<any, NodeType>
    | CallChainImpl<T>
    | CallChainImplThenable<T>
    | null
    | undefined,
  chain: CallChainImpl<any> | CallChainImplThenable<any>,
): Promise<NodeType | null> {
  if (input == null) {
    return null;
  }

  if (typeof input === "string") {
    if (isMarkup(input, chain.Parser)) {
      return renderMarkup(input, chain.Parser)[0];
    } else {
      return chain.document.createTextNode(input);
    }
  } else if (isJSX(input)) {
    return renderIsomorphicSync(
      input as RenderInput,
      chain.document.body,
      chain.options.globals as Globals,
    ) as NodeType;
  } else if (isRef(input)) {
    await waitForRef(input as Ref<any, NodeType>, chain.options.timeout!);
    return input.current!;
  } else if (input && typeof input === "object" && "nodeType" in input) {
    return input as NodeType;
  } else if (isDequery(input)) {
    return (await input.getFirstElement()) as Promise<NodeType | null>;
  }
  console.warn("resolveContent: unsupported content type", input);
  return null;
}

export async function resolveNodes<T = DequerySyncMethodReturnType>(
  input:
    | string
    | NodeType
    | Ref<any, NodeType>
    | CallChainImpl<T>
    | CallChainImplThenable<T>,
  timeout: number,
  document?: Document,
): Promise<NodeType[]> {
  let nodes: NodeType[] = [];

  if (isRef(input)) {
    await waitForRef(input as Ref<any, NodeType>, timeout);
    nodes = [input.current!];
  } else if (typeof input === "string" && document) {
    const result = await waitForDOM(
      () => {
        const el = document.querySelector(input);
        if (el) {
          return [el];
        } else {
          return [];
        }
      },
      timeout,
      document,
    );
    const el = result[0];
    if (el) nodes = [el as NodeType];
  } else if (input && typeof input === "object" && "nodeType" in input) {
    nodes = [input as NodeType];
  } else if (isDequery(input)) {
    const elements = (input as CallChainImpl<T>).nodes;
    nodes = elements
      .filter((el) => (el as Node).nodeType !== undefined)
      .map((el) => el as NodeType);
  } else {
    console.warn("resolveTargets: expected selector, ref or node, got", input);
  }
  return nodes;
}

export function traverse<NT, R = NT, ET extends Dequery<R> = Dequery<R>>(
  chain: CallChainImpl<NT, any>,
  methodName: string,
  selector: (el: Element) => Element | Element[] | null | undefined,
): ET {
  return createCall(chain as any, methodName, async () => {
    return chain.nodes.flatMap((el) => {
      if (el instanceof Element) {
        try {
          const result = selector(el);
          if (Array.isArray(result)) {
            return result.filter(
              (item): item is Element => item instanceof Element,
            );
          } else if (result instanceof Element) {
            return [result];
          }
        } catch (err) {
          console.warn("Error in traverse selector function:", err);
        }
      }
      return [];
    }) as NT;
  }) as unknown as ET;
}

```

./src/dequery/index.ts:
```
export * from "./dequery.js";
export * from "./types.js";

```

./src/dom-router/index.ts:
```
export * from "@/dom-router/Route.js"
export * from "@/dom-router/Redirect.js"
export * from "@/dom-router/RouterSlot.js"
export * from "@/dom-router/router.js"
```

./src/dom-router/Redirect.tsx:
```
import type { VNodeChild } from "@/render/types.js";
import type { RouteProps } from "./Route.js";
import { Route } from "./Route.js";
import { Router } from "./router.js";

export interface RedirectProps extends RouteProps {
  to: string;
}

export const Redirect = ({
  path,
  to,
  router = Router,
  exact,
}: RedirectProps): VNodeChild => {
  queueMicrotask(() => {
    if (Route({ path, router, exact, children: [true] })) {
      //console.log("Redirect", to);
      router.navigate(to);
    }
  });
  return null;
};

```

./src/dom-router/Route.tsx:
```
import type { Props, VNodeChild } from "@/render/types.js";
import { Router } from "./router.js";

export interface RouteProps extends Props {
  path: string;
  router?: Router;
  exact?: boolean;
}

export const Route = ({
  path,
  exact,
  children,
  router = Router,
}: RouteProps): VNodeChild => {
  // make sure the router knows the path to be matched
  router.add({
    path,
    exact: exact || false,
  });
  return router.match(path)
    ? Array.isArray(children)
      ? children[0]
      : null
    : null;
};

```

./src/dom-router/router.ts:
```
import { isServer } from "../webstorage/runtime.js";

export type OnHandleRouteChangeFn = (
  newRoute: string,
  oldRoute: string,
) => void;
export type OnRouteChangeFn = (cb: OnHandleRouteChangeFn) => void;
export type RouterStrategy = "page-refresh" | "slot-refresh";

export interface Router {
  listeners: Array<OnHandleRouteChangeFn>;
  strategy: RouterStrategy;
  add(registration: RouteRegistration): Router;
  match(path?: string): RouteRequest | false;
  getRoutes(): Array<RouteRegistration>;
  tokenizePath(path: string): TokenizedPath;
  navigate(path: string): void;
  onRouteChange: OnRouteChangeFn;
  destroy(): void;
  attachPopStateHandler(): void;
}

export interface RouterConfig {
  strategy?: RouterStrategy;
}

interface RouteMatchGroups {
  [matchName: string]: number;
}

export interface RouteParams {
  [name: string]: string;
}

export interface RouteRegistration {
  path: string;
  exact?: boolean;
  tokenizedPath?: TokenizedPath;
  handler?: RouteHandler;
}

export interface RouteRequest {
  url: string;
  params: RouteParams;
}

export interface TokenizedPath {
  regexp: RegExp;
  groups: RouteMatchGroups;
}

export type RouteHandler = (request: RouteRequest) => void;

export const tokenizePath = (path: string): TokenizedPath => {
  const paramNameRegexp = /:([^\/\.\\]+)/g;
  const groups: RouteMatchGroups = {};
  let groupIndex = 1;

  // Replace parameters with capturing groups and store the parameter names.
  const pattern = path.replace(paramNameRegexp, (_, paramName) => {
    groups[paramName] = groupIndex++;
    return "([^/.\\]+)";
  });

  return {
    groups,
    regexp: new RegExp(`^${pattern}$`),
  };
};

export const matchRouteRegistrations = (
  routeRegistrations: Array<RouteRegistration>,
  actualPathName: string,
  haystackPathName?: string,
): RouteRequest | false => {
  for (const route of routeRegistrations) {
    // Check if path is set and route.path matches it
    if (haystackPathName && route.path !== haystackPathName) {
      //console.warn(`Skipped path: Looking for ${haystackPathName}, but found ${route.path}`);
      continue;
    }

    // Check if exact match is required and if the match is exact
    if (route.exact && route.path !== actualPathName) {
      //console.warn(`Exact match required, but found ${actualPathName} instead of ${route.path}`);
      continue;
    }

    const match = route.tokenizedPath!.regexp.exec(actualPathName);
    if (!match) continue;

    //console.log(`Route matched: ${route.path} for URL: ${actualPathName}`);

    const params: RouteParams = {};

    // Extract each parameter using the stored capturing group index.
    for (const [paramName, groupIndex] of Object.entries(
      route.tokenizedPath!.groups,
    )) {
      params[paramName] = match[groupIndex];
    }

    const request: RouteRequest = { url: actualPathName, params };

    if (typeof route.handler === "function") {
      route.handler(request);
    }
    return request;
  }
  return false;
};

export const setupRouter = (
  config: RouterConfig = {
    strategy: "page-refresh", // default
  },
  windowImpl?: Window,
): Router => {
  const routeRegistrations: Array<RouteRegistration> = [];
  let currentPath = ""; // Track current path for popstate events
  let popAttached = false; // Guard to prevent stacking popstate listeners

  // safe SSR rendering, and fine default for client side
  if (typeof window !== "undefined" && !windowImpl) {
    windowImpl = globalThis.__defuss_window /** for SSR support */ || window;
  }

  if (!windowImpl && !isServer()) {
    console.warn("Router requires a Window API implementation!");
  }

  // Initialize current path
  if (windowImpl) {
    currentPath = windowImpl.document.location.pathname;
  }

  const api = {
    ...config,
    listeners: [] as Array<OnHandleRouteChangeFn>,
    onRouteChange: (cb: OnHandleRouteChangeFn) => {
      api.listeners.push(cb);
    },
    tokenizePath,
    add(registration: RouteRegistration): Router {
      const isAlreadyRegistered = routeRegistrations.some(
        (registeredRoute) => registeredRoute.path === registration.path,
      );

      if (!isAlreadyRegistered) {
        routeRegistrations.push({
          ...registration,
          tokenizedPath: tokenizePath(registration.path),
        });
      }
      return api as Router;
    },
    match(path?: string) {
      return matchRouteRegistrations(
        routeRegistrations,
        windowImpl!.document.location.pathname,
        path,
      );
    },
    navigate(newPath: string) {
      const strategy = api.strategy || "page-refresh";
      const oldPath = currentPath; // Use tracked currentPath instead of window location

      if (strategy === "page-refresh") {
        document.location.href = newPath;
      } else if (strategy === "slot-refresh") {
        // show new path in the address bar
        if (typeof windowImpl !== "undefined") {
          windowImpl!.history.pushState({}, "", newPath);
        }

        // Update current path tracker
        currentPath = newPath;

        // Queue listeners to be called asynchronously
        queueMicrotask(() => {
          for (const listener of api.listeners) {
            listener(newPath, oldPath);
          }
        });
      }
    },
    getRoutes() {
      return routeRegistrations;
    },
    destroy() {
      // Remove popstate event listener when router is destroyed
      if (windowImpl && api.strategy === "slot-refresh") {
        windowImpl.removeEventListener("popstate", handlePopState);
        popAttached = false;
      }
    },
    attachPopStateHandler() {
      if (windowImpl && api.strategy === "slot-refresh" && !popAttached) {
        windowImpl.addEventListener("popstate", handlePopState);
        popAttached = true;
      }
    },
  };

  // Handle browser back/forward navigation
  const handlePopState = (event: PopStateEvent) => {
    if (api.strategy === "slot-refresh" && windowImpl) {
      const newPath = windowImpl.document.location.pathname;
      const oldPath = currentPath;

      // Update current path tracker
      currentPath = newPath;

      // Queue listeners to be called asynchronously to ensure proper timing
      queueMicrotask(() => {
        for (const listener of api.listeners) {
          listener(newPath, oldPath);
        }
      });
    }
  };

  // Add popstate event listener for slot-refresh strategy during initialization
  if (windowImpl && api.strategy === "slot-refresh") {
    api.attachPopStateHandler();
  }

  return api as Router;
};

export const Router = setupRouter();

```

./src/dom-router/RouterSlot.tsx:
```
import type { Props, VNodeChild } from "../render/types.js";
import {
  createRef,
  type Ref,
  type NodeType,
  type TransitionType,
} from "../render/client.js";
import { Router } from "./router.js";
import { $, type TransitionConfig } from "../dequery/index.js";

export const RouterSlotId = "router-slot";

export interface RouterSlotProps extends Props {
  /** to override the tag name used for the router slot */
  tag?: string;

  /** to override the default id 'router-slot' */
  id?: string;

  /** to identify/select the root DOM element or style it, W3C naming */
  class?: string;

  /** to identify/select the root DOM element or style it, React naming */
  className?: string;

  /** to override the default global router */
  router?: Router;

  /** A component reference that returns many <Route />, <Redirect ... /> etc. components */
  RouterOutlet?: any;

  /** Transition configuration for route changes; default: { type: 'fade', duration: 50 } */
  transitionConfig?: TransitionConfig;
}

/**
 * RouterSlot registers a slot refresh handler with the global router configuration
 * and renders its default children (RouterOutlet). Whenever the route changes, it re-renders dynamically.
 * This decouples the slot refresh logic from route registration.
 */
export const RouterSlot = ({
  router = Router,
  children,
  RouterOutlet,
  id,
  transitionConfig = {
    type: "fade",
    duration: 25,
    target: "self",
  } as TransitionConfig,
  ...attributes
}: RouterSlotProps): VNodeChild => {
  const { tag, ...attributesWithoutTag } = attributes;
  const ref: Ref<NodeType> = createRef();

  // Use provided id or fall back to default
  const slotId = id ?? RouterSlotId;

  // by using this component, we automatically switch to slot-refresh strategy
  router.strategy = "slot-refresh";
  router.attachPopStateHandler();

  router.onRouteChange(async () => {
    //console.log("<RouterSlot> RouterSlot.onRouteChange", newPath, oldPath, ref.current);
    await $(ref).update(RouterOutlet(), transitionConfig);
  });

  if (document.getElementById(slotId)) {
    console.warn(
      `It seems there's more than one <RouterSlot /> components defined as an element with id #${slotId} already exists in the DOM.`,
    );
  }

  return {
    children: RouterOutlet() || [],
    type: attributes.tag || "div",
    attributes: {
      ...attributesWithoutTag,
      id: slotId,
      ref,
    },
  };
};

```

./src/i18n/i18n.tsx:
```
import type { VNode } from "../render/types.js";
import { createStore, type Store } from "../store/index.js";

export type TranslationObject = {
  [key: string]: string | VNode | TranslationObject;
};
export type Translations = { [language: string]: TranslationObject };
export type OnLanguageChangeListener = (newLanguage: string) => void;
export type Replacements = Record<string, string>;

export interface I18nStore {
  language: string;
  changeLanguage: (language: string) => void;
  t: (path: string, options?: Record<string, string>) => string;
  loadLanguage: (language: string, translations: TranslationObject) => void;
  subscribe: (onLanguageChange: OnLanguageChangeListener) => () => void;
  unsubscribe: (onLanguageChange: OnLanguageChangeListener) => void;
}

// example of placeholders: {name}, {age}, {city}
const VARIABLE_REGEX = /{([^}]*)}/g;
const DOUBLE_BRACE_REGEX = /\{\{([^}]*)\}\}/g;

const interpolate = (template: string, replacements: Replacements): string => {
  // First handle double braces {{key}} pattern - these become {replacement}
  let result = template.replace(DOUBLE_BRACE_REGEX, (match, key) => {
    const replacement = replacements[key];
    if (replacement !== undefined) {
      return `{${replacement}}`;
    }
    return match;
  });

  // Then handle regular single braces {key} pattern
  result = result.replace(VARIABLE_REGEX, (match, key) => {
    const replacement = replacements[key];
    if (replacement !== undefined) {
      return replacement;
    }
    return match;
  });

  return result;
};

export const createI18n = (): I18nStore => {
  const translationsStore: Store<Translations> = createStore({});
  let language = "en";

  const onLanguageChangeCallbacks: Array<OnLanguageChangeListener> = [];

  const api = {
    get language() {
      return language;
    },

    changeLanguage(newLanguage: string) {
      // Only trigger callbacks if the language actually changes
      if (newLanguage !== language) {
        language = newLanguage;
        onLanguageChangeCallbacks.forEach((callback) => {
          callback(newLanguage);
        });
      }
    },

    // example usage of the t function with placeholders:
    // const translatedString = t('greeting', { name: 'John', age: '30' }, 'common');
    // this would replace placeholders {name} and {age} in the translation string with 'John' and '30' respectively.
    t(path: string, replacements: Record<string, string> = {}): string {
      const languageData = translationsStore.get<TranslationObject>(language);
      if (!languageData) {
        return path;
      }

      // First try to get the translation as a literal key (for keys with dots)
      let template = languageData[path];

      // If literal key doesn't exist, try nested path access
      if (template === undefined) {
        const pathParts = path.split(".");
        let current: any = languageData;
        for (const part of pathParts) {
          current = current?.[part];
          if (current === undefined) {
            break;
          }
        }
        template = current;
      }

      // If still not found, return the key itself
      if (template === undefined) {
        return path;
      }

      // VDOM (VNode) - convert to string representation
      if (typeof template !== "string") {
        return path; // Fallback to path for non-string templates
      }
      // plaintext string or HTML
      return interpolate(template, replacements);
    },

    loadLanguage(
      newLanguage: string,
      namespaceTranslations: TranslationObject,
    ) {
      translationsStore.set(newLanguage, {
        ...translationsStore.get<TranslationObject>(newLanguage),
        ...namespaceTranslations,
      });
      // Only notify subscribers if the new language is the current language
      if (newLanguage === language) {
        onLanguageChangeCallbacks.forEach((callback) => {
          callback(language);
        });
      }
    },

    subscribe(onLanguageChange: OnLanguageChangeListener) {
      onLanguageChangeCallbacks.push(onLanguageChange);
      return () => api.unsubscribe(onLanguageChange);
    },

    unsubscribe(onLanguageChange: OnLanguageChangeListener) {
      const index = onLanguageChangeCallbacks.indexOf(onLanguageChange);
      if (index >= 0) onLanguageChangeCallbacks.splice(index, 1);
    },
  };
  return api;
};

if (!globalThis.__defuss_i18n) {
  globalThis.__defuss_i18n = createI18n();
}
export const i18n = globalThis.__defuss_i18n as I18nStore;

export const t = i18n.t.bind(i18n);
export const changeLanguage = i18n.changeLanguage.bind(i18n);
export const loadLanguage = i18n.loadLanguage.bind(i18n);
export const getLanguage = () => i18n.language;

```

./src/i18n/index.ts:
```
export * from "../i18n/i18n.js";
export * from "../i18n/trans.js";

```

./src/i18n/trans.tsx:
```
import type { Props, Ref, VNodeChild } from "../render/types.js";
import { type Replacements, i18n } from "./i18n.js";

export interface TransRef extends Ref<string, HTMLElement> {
  updateValues: (values: Replacements) => void;
}

export interface TransProps extends Props {
  key: string;
  ref?: TransRef;
  tag?: string;
  values?: Replacements;
  class?: string;
  className?: string;
  style?: string;
  // allow for arbitrary attributes
  [propName: string]: any;
}

export const Trans = ({
  key,
  values,
  tag,
  ref,
  ...attrs
}: TransProps): VNodeChild => {
  const _ref: TransRef = ref || ({} as TransRef);

  const updateContent = () => {
    const value = i18n.t(key, values);
    if (_ref.current) {
      _ref.current.textContent = value;
    }
  };

  _ref.updateValues = (newValues: Replacements) => {
    values = newValues;
    updateContent();
  };

  // Mount handler to set up subscription after element is in DOM
  const onMount = () => {
    // Subscribe to i18n changes after the element is mounted
    i18n.subscribe(updateContent);

    if (attrs.onMount) {
      // Call the provided onMount handler if it exists
      attrs.onMount(_ref.current);
    }
  };

  // auto-unsubscribe when component is unmounted
  const onUnmount = () => {
    // unsubscribe from language change
    i18n.unsubscribe(updateContent);

    if (attrs.onUnmount) {
      // Call the provided onUnmount handler if it exists
      attrs.onUnmount(_ref.current);
    }
  };

  return {
    type: tag || "span",
    attributes: {
      ref: _ref,
      ...attrs,
      onMount,
      onUnmount,
    },
    // initially render
    children: i18n.t(key, values),
  };
};

export const T = Trans;

```

./src/index.ts:
```
// defuss - explicit simplicity for the web
export * from "@/common/index.js";
export * from "@/render/index.js";
export * from "@/dequery/index.js";
export * from "@/webstorage/index.js";
export * from "@/store/index.js";
export * from "@/i18n/index.js";
//export * from "@/net/index.js"
export * from "@/dom-router/index.js";
export * from "@/async/index.js";

```

./src/net/fetch.ts:
```

/**
 * custom headers class to manage HTTP headers with case-insensitive keys.
 * simplifies header manipulation by providing utility methods.
 */
export class Headers {
  // internal map to store headers
  private map: Map<string, string>;

  /**
   * initializes the Headers instance with provided headers or another Headers object.
   * ensures all header keys are stored in lowercase for consistent access.
   * @param init initial headers as a record or another Headers instance
   */
  constructor(init: Record<string, string> | Headers = {}) {
    this.map = new Map();

    if (init instanceof Headers) {
      init.forEach((value, key) => this.map.set(key, value));
    } else {
      Object.entries(init).forEach(([key, value]) =>
        this.map.set(key.toLowerCase(), value)
      );
    }
  }

  /**
   * appends or sets the value for a specific header key.
   * stores the key in lowercase to maintain case-insensitivity.
   * @param key header name
   * @param value header value
   */
  append(key: string, value: string): void {
    this.map.set(key.toLowerCase(), value);
  }

  /**
   * retrieves the value of a specific header key.
   * @param key header name
   * @returns the header value or null if not found
   */
  get(key: string): string | null {
    return this.map.get(key.toLowerCase()) || null;
  }

  /**
   * checks if a specific header key exists.
   * @param key header name
   * @returns boolean indicating existence of the header
   */
  has(key: string): boolean {
    return this.map.has(key.toLowerCase());
  }

  /**
   * iterates over all headers and executes the provided callback for each.
   * @param callback function to execute for each header
   */
  forEach(callback: (value: string, key: string) => void): void {
    this.map.forEach((value, key) => callback(value, key));
  }
}

/**
 * ProgressSignal extends EventTarget to dispatch and track progress events.
 * useful for monitoring the progress of network requests.
 */
export class ProgressSignal extends EventTarget {
  // internal progress state
  private _progress: { loaded: number; total: number };

  /**
   * initializes the ProgressSignal with zero progress.
   */
  constructor() {
    super();
    this._progress = { loaded: 0, total: 0 };
  }

  /**
   * retrieves the current progress.
   * @returns an object containing loaded and total bytes
   */
  get progress(): { loaded: number; total: number } {
    return this._progress;
  }

  /**
   * dispatches a progress event with updated loaded and total bytes.
   * updates the internal progress state.
   * @param event the ProgressEvent containing progress information
   */
  dispatchProgress(event: ProgressEvent): void {
    this._progress = { loaded: event.loaded, total: event.total };
    this.dispatchEvent(
      new ProgressEvent('progress', { loaded: event.loaded, total: event.total })
    );
  }
}

/**
 * ProgressController manages a ProgressSignal for tracking request progress.
 * provides a centralized way to handle progress events.
 */
export class ProgressController {
  signal: ProgressSignal;

  /**
   * initializes the ProgressController with a new ProgressSignal.
   */
  constructor() {
    this.signal = new ProgressSignal();
  }
}

/**
 * serializes the request body into a format suitable for XMLHttpRequest.
 * handles various body types including JSON objects and FormData.
 * @param body the body to serialize
 * @returns the serialized body or null if no body is provided
 */
export function serializeBody(
  body: BodyInit | Record<string, unknown> | null | undefined
): XMLHttpRequestBodyInit | Document | null {
  if (!body) return null;

  if (
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    typeof body === "string"
  ) {
    return body;
  }

  if (typeof body === "object") {
    return JSON.stringify(body); // convert object to JSON string for transmission
  }

  return String(body); // ensure fallback to string for unsupported types
}

/**
 * parses a raw header string from an XMLHttpRequest into a Headers instance.
 * @param headerStr the raw header string
 * @returns a Headers instance containing parsed headers
 */
export function parseHeaders(headerStr: string): Headers {
  const headers = new Headers();
  headerStr.split('\r\n').forEach((line) => {
    const [key, ...rest] = line.split(': ');
    if (key) headers.append(key, rest.join(': '));
  });
  return headers;
}

/**
 * extends the standard RequestInit to include an optional ProgressSignal.
 * allows tracking the progress of the network request.
 */
export interface FetchWithControllersInit extends RequestInit {
  progressSignal?: ProgressSignal;
}

/**
 * represents the response from a fetch operation, mirroring the native Response interface.
 * includes methods to access the response body in various formats.
 */
export interface FetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  url: string;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
  blob: () => Promise<Blob>;
}

/**
 * performs a network fetch request with support for progress tracking using XMLHttpRequest.
 * falls back to the native fetch implementation if no ProgressSignal is provided.
 * @param input the resource to fetch, typically a URL string
 * @param init optional configuration for the request, including method, headers, body, credentials, and progressSignal
 * @returns a promise resolving to a FetchResponse containing the response details
 */
export async function fetch(
  input: string | URL,
  init: FetchWithControllersInit = {}
): Promise<FetchResponse> {
  // use native fetch if ProgressSignal is not provided for simplicity and efficiency
  if (!init.progressSignal && typeof globalThis.fetch === "function") {
    return globalThis.fetch(input, init) as unknown as FetchResponse;
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const method = (init.method || 'GET').toUpperCase();
    const body = serializeBody(init.body || null);
    const progressSignal = init.progressSignal;
    const abortSignal = init.signal;

    // handle abort events to allow request cancellation
    if (abortSignal) {
      const abortHandler = () => {
        xhr.abort();
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      };
      abortSignal.addEventListener('abort', abortHandler, { once: true });
    }

    xhr.open(method, input.toString(), true);

    // set credentials based on the init configuration
    if (init.credentials === 'include') {
      xhr.withCredentials = true;
    } else if (init.credentials === 'omit') {
      xhr.withCredentials = false;
    }

    // set request headers using the custom Headers class or raw headers
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => xhr.setRequestHeader(key, value));
    } else if (init.headers) {
      Object.entries(init.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value as string);
      });
    }

    // attach progress listeners if a ProgressSignal is provided
    if (progressSignal) {
      if (xhr.upload) {
        xhr.upload.onprogress = (event) => progressSignal.dispatchProgress(event);
      }
      xhr.onprogress = (event) => progressSignal.dispatchProgress(event);
    }

    // handle the response once the request is completed
    xhr.onload = () => {
      const response: FetchResponse = {
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        statusText: xhr.statusText,
        headers: parseHeaders(xhr.getAllResponseHeaders()),
        url: xhr.responseURL,
        text: () => Promise.resolve(xhr.responseText),
        json: () => Promise.resolve(JSON.parse(xhr.responseText)),
        blob: () => Promise.resolve(new Blob([xhr.response])),
      };
      resolve(response);
    };

    // handle network errors
    xhr.onerror = () => reject(new TypeError('Network request failed'));
    xhr.ontimeout = () => reject(new TypeError('Network request timed out'));
    xhr.onabort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));

    // send the serialized request body
    xhr.send(body);
  });
}


/*
 // example usage of fetch with upload tracking
 async function exampleFetchWithUploadTracking() {
   const url = 'https://example.com/upload';
   const data = new FormData();
   data.append('file', new Blob(['file content'], { type: 'text/plain' }), 'example.txt');

   const { signal: progressSignal } = new ProgressController();

   progressSignal.addEventListener('progress', (event: ProgressEvent) => {
     console.log(`Uploaded ${event.loaded} of ${event.total} bytes`);
   });

   try {
     const response = await fetch(url, {
       method: 'POST',
       body: data,
       headers: {
         'Accept': 'application/json'
       },
       credentials: 'include',
       progressSignal
     });

     if (response.ok) {
       const jsonResponse = await response.json();
       console.log('Upload successful:', jsonResponse);
     } else {
       console.error('Upload failed:', response.statusText);
     }
   } catch (error) {
     console.error('Error during fetch:', error);
   }
 }
 
 */
```

./src/net/index.ts:
```
export * from "@/net/fetch.js"


```

./src/render/client.ts:
```
import {
  observeUnmount,
  renderIsomorphicSync,
  renderIsomorphicAsync,
  type ParentElementInput,
  type ParentElementInputAsync,
  globalScopeDomApis,
} from "./isomorph.js";
import type { Globals, RenderInput, RenderResult, VNode } from "./types.js";
import { parseEventPropName, registerDelegatedEvent } from "./delegated-events.js";

export const renderSync = <T extends RenderInput>(
  virtualNode: T,
  parentDomElement: ParentElementInput = document.documentElement,
): RenderResult<T> => {
  globalScopeDomApis(window, document);
  return renderIsomorphicSync(
    virtualNode,
    parentDomElement,
    window as Globals,
  ) as any;
};

export const render = async <T extends RenderInput>(
  virtualNode: T | Promise<T>,
  parentDomElement: ParentElementInputAsync | any = document.documentElement,
): Promise<RenderResult<T>> => {
  globalScopeDomApis(window, document);
  return renderIsomorphicAsync(
    virtualNode,
    parentDomElement,
    window as Globals,
  ) as any;
};

export const renderToString = (el: Node) =>
  new XMLSerializer().serializeToString(el);

export const hydrate = (
  nodes: Array<VNode | string | null>,
  parentElements: Array<HTMLElement | Text | Node>,
  debug?: boolean,
) => {
  let elementIndex = 0;

  if (nodes.length !== parentElements.length) {
    // Last-chance fix: fuse consecutive string/number nodes into a single Text node,
    // restarting when encountering a non-fusable vnode. Continue scanning afterwards.
    const fusedNodes: Array<VNode | string | null> = [];
    let textBuffer: string | null = null;

    const flush = () => {
      if (textBuffer && textBuffer.length > 0) {
        fusedNodes.push(textBuffer);
      }
      textBuffer = null;
    };

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i] as any;
      // Values that produce text in HTML output
      if (
        typeof node === "string" ||
        typeof node === "number" ||
        typeof node === "bigint"
      ) {
        textBuffer = (textBuffer ?? "") + String(node);
        continue;
      }

      // Values that render nothing in HTML output (do not break fusion)
      if (
        node === null ||
        typeof node === "undefined" ||
        typeof node === "boolean"
      ) {
        continue;
      }

      // Non-fusable (VNode/object/etc.) -> boundary: flush and push
      flush();
      fusedNodes.push(node);
    }

    // push any trailing buffered text
    flush();

    if (fusedNodes.length === parentElements.length) {
      nodes = fusedNodes;
      if (debug) {
        console.debug(
          "[defuss] Hydration: resolved mismatch via text-node fusion.",
        );
      }
    } else {
      // Fail hard: we couldn't reconcile vnode count with DOM children
      throw new Error(
        `【defuss】Hydration error: Mismatched number of VNodes (${fusedNodes.length}) and DOM elements (${parentElements.length}) after text-node fusion attempt.`,
      );
    }
  }

  for (const node of nodes) {
    // Text-like nodes: will correspond to a single DOM Text node
    if (
      typeof node === "string" ||
      typeof node === "number" ||
      typeof node === "bigint"
    ) {
      // for text nodes, skip DOM nodes that are not elements or text
      while (
        elementIndex < parentElements.length &&
        parentElements[elementIndex].nodeType !== Node.ELEMENT_NODE &&
        parentElements[elementIndex].nodeType !== Node.TEXT_NODE
      ) {
        elementIndex++;
      }

      if (elementIndex >= parentElements.length) {
        if (debug) {
          console.warn(
            "[defuss] Hydration warning: Ran out of DOM nodes while matching text content.",
          );
        }
        break;
      }

      const domNode = parentElements[elementIndex];
      const expected = String(node);

      if (domNode.nodeType === Node.TEXT_NODE) {
        const textNode = domNode as Text;
        if (textNode.nodeValue !== expected) {
          if (debug) {
            console.warn(
              `[defuss] Hydration text mismatch: expected "${expected}", got "${textNode.nodeValue ?? ""}". Correcting.`,
            );
          }
          textNode.nodeValue = expected;
        }
        elementIndex++;
        continue;
      }

      // Encountered an element where a text node was expected
      if (domNode.nodeType === Node.ELEMENT_NODE) {
        const message =
          "[defuss] Hydration error: ELEMENT_NODE encountered where TEXT_NODE was expected for text content.";
        if (debug) {
          throw new Error(message);
        } else {
          console.warn(message);
          // Best effort: advance to keep indexes moving; hydration may drift
          elementIndex++;
          continue;
        }
      }
    }

    // Values that render nothing: do not consume a DOM node
    if (
      node === null ||
      typeof node === "undefined" ||
      typeof node === "boolean"
    ) {
      continue;
    }

    // find the next relevant DOM element
    while (
      elementIndex < parentElements.length &&
      parentElements[elementIndex].nodeType !== Node.ELEMENT_NODE
    ) {
      elementIndex++;
    }

    if (elementIndex >= parentElements.length && debug) {
      console.warn(
        "[defuss] Hydration warning: Not enough DOM elements to match VNodes.",
      );
      break;
    }

    const vnode = node as VNode;
    const element = parentElements[elementIndex] as HTMLElement;

    // update ref.current if ref is provided
    if (vnode.attributes!.ref) {
      vnode.attributes!.ref.current = element;
      element._defussRef = vnode.attributes!.ref; // store ref on element for later access
    }

    // attach event listeners using delegated events
    for (const key of Object.keys(vnode.attributes!)) {
      if (key === "ref") continue;

      const value = vnode.attributes![key];

      // lifecycle is handled elsewhere in hydrate (onMount/onUnmount), don't treat as DOM event
      if (key === "onMount" || key === "onUnmount" || key === "onmount" || key === "onunmount") continue;

      const parsed = parseEventPropName(key);
      if (!parsed) continue;
      if (typeof value !== "function") continue;

      const { eventType, capture } = parsed;

      // ignore "mount"/"unmount" pseudo events here (hydrate calls onMount and wires unmount separately)
      if (eventType === "mount" || eventType === "unmount") continue;

      registerDelegatedEvent(element, eventType, value as EventListener, { capture });
    }

    // --- element lifecycle ---

    // TODO: this should be refactored to re-use logic in lifecycle.js!

    if (vnode?.attributes?.onUnmount) {
      observeUnmount(element, vnode.attributes.onUnmount);
    }

    // recursively hydrate children
    if (vnode?.children && vnode?.children?.length > 0) {
      hydrate(
        vnode.children as Array<VNode | string | null>,
        Array.from(element.childNodes),
      );
    }

    // call onMount if provided
    if (vnode?.attributes?.onMount) {
      // ensure onMount is a function
      vnode.attributes?.onMount?.(element);
    }
    elementIndex++;
  }

  // Optionally, warn if there are unmatched DOM elements
  if (elementIndex < parentElements.length && debug) {
    console.warn(
      "[defuss] Hydration warning: There are more DOM elements than VNodes.",
    );
  }
};

export * from "./index.js";

```

./src/render/component-registry.ts:
```
import type { VNode } from "./types.js";

/**
 * Component instance metadata for implicit updates.
 * Stored on the mount boundary (container) element.
 */
export interface ComponentInstance {
    renderFn: (props: Record<string, unknown>) => VNode;
    props: Record<string, unknown>;
    prevVNode?: VNode;
}

/** Element → Component Instance registry (WeakMap for GC safety) */
const componentRegistry = new WeakMap<Element, ComponentInstance>();

/** Check if an element is a managed component root */
export function isComponentRoot(el: Element): boolean {
    return componentRegistry.has(el);
}

/** Get component instance for an element */
export function getComponentInstance(el: Element): ComponentInstance | undefined {
    return componentRegistry.get(el);
}

/** Register a component instance on an element */
export function registerComponent(
    el: Element,
    renderFn: (props: Record<string, unknown>) => VNode,
    props: Record<string, unknown>,
): void {
    componentRegistry.set(el, { renderFn, props });
}

/** Unregister a component (called on unmount) */
export function unregisterComponent(el: Element): void {
    componentRegistry.delete(el);
}

```

./src/render/delegated-events.ts:
```
export type DelegatedPhase = "bubble" | "capture";

export interface DelegatedEventOptions {
    capture?: boolean;
    /** If true, allows multiple handlers per element+type (Dequery mode) */
    multi?: boolean;
}

export interface ParsedEventProp {
    eventType: string;
    capture: boolean;
}

/** non-bubbling events best handled via capture */
export const CAPTURE_ONLY_EVENTS = new Set<string>([
    "focus",
    "blur",
    "scroll",
    "mouseenter",
    "mouseleave",
    // Note: focusin/focusout DO bubble, so they're not included here
]);

interface HandlerEntry {
    bubble?: EventListener;
    capture?: EventListener;
    bubbleSet?: Set<EventListener>;
    captureSet?: Set<EventListener>;
}

/** element -> (eventType -> handlers) */
const elementHandlerMap = new WeakMap<
    HTMLElement,
    Map<string, HandlerEntry>
>();

/** document -> installed listener keys ("click:bubble", "focus:capture", ...) */
const installedDocListeners = new WeakMap<Document, Set<string>>();

export const parseEventPropName = (propName: string): ParsedEventProp | null => {
    if (!propName.startsWith("on")) return null;

    // support onClick / onClickCapture / onclick / onclickcapture
    const raw = propName.slice(2);
    if (!raw) return null;

    const lower = raw.toLowerCase();
    const isCapture = lower.endsWith("capture");

    const eventType = isCapture ? lower.slice(0, -"capture".length) : lower;

    if (!eventType) return null;

    return { eventType, capture: isCapture };
};

const getOrCreateElementHandlers = (el: HTMLElement) => {
    const existing = elementHandlerMap.get(el);
    if (existing) return existing;

    const created = new Map<string, HandlerEntry>();
    elementHandlerMap.set(el, created);
    return created;
};

const getEventPath = (event: Event): Array<EventTarget> => {
    // composedPath is best (works with shadow DOM)
    const composedPath = (event as Event & { composedPath?: () => Array<EventTarget> })
        .composedPath?.();
    if (composedPath && composedPath.length > 0) return composedPath;

    // fallback: walk up from target
    const path: Array<EventTarget> = [];
    let node: unknown = event.target;

    while (node) {
        path.push(node as EventTarget);

        // walk DOM parents
        const maybeNode = node as Node;
        if (typeof maybeNode === "object" && maybeNode && "parentNode" in maybeNode) {
            node = (maybeNode as Node).parentNode;
            continue;
        }

        break;
    }

    // ensure document/window are at the end if available
    const doc = (event.target as Node | null)?.ownerDocument;
    if (doc && path[path.length - 1] !== doc) path.push(doc);
    const win = doc?.defaultView;
    if (win && path[path.length - 1] !== win) path.push(win);

    return path;
};

/**
 * Create the dispatch handler for a given phase.
 * Each phase runs its own handlers - capture phase runs capture handlers,
 * bubble phase runs bubble handlers. This supports onClickCapture semantics.
 */
const createPhaseHandler = (eventType: string, phase: DelegatedPhase): EventListener => {
    return (event: Event) => {
        const path = getEventPath(event).filter(
            (t): t is HTMLElement => typeof t === "object" && t !== null && (t as HTMLElement).nodeType === Node.ELEMENT_NODE,
        );

        // Capture phase: root -> target (reversed path)
        // Bubble phase: target -> root (normal path)
        const ordered = phase === "capture" ? [...path].reverse() : path;

        for (const target of ordered) {
            const handlersByEvent = elementHandlerMap.get(target);
            if (!handlersByEvent) continue;

            const entry = handlersByEvent.get(eventType);
            if (!entry) continue;

            // Execute only the handlers for this phase
            if (phase === "capture") {
                // Single handler (JSX mode)
                if (entry.capture) {
                    entry.capture.call(target, event);
                    if ((event as Event & { cancelBubble?: boolean }).cancelBubble) return;
                }
                // Handler set (Dequery multi mode)
                if (entry.captureSet) {
                    for (const handler of entry.captureSet) {
                        handler.call(target, event);
                        if ((event as Event & { cancelBubble?: boolean }).cancelBubble) return;
                    }
                }
            } else {
                // Bubble phase
                if (entry.bubble) {
                    entry.bubble.call(target, event);
                    if ((event as Event & { cancelBubble?: boolean }).cancelBubble) return;
                }
                if (entry.bubbleSet) {
                    for (const handler of entry.bubbleSet) {
                        handler.call(target, event);
                        if ((event as Event & { cancelBubble?: boolean }).cancelBubble) return;
                    }
                }
            }
        }
    };
};

/** 
 * Track installed listeners per root (Document or ShadowRoot).
 * Using WeakMap allows GC when shadow roots are removed.
 */
type EventRoot = Document | ShadowRoot;
const installedRootListeners = new WeakMap<EventRoot, Set<string>>();

/**
 * Ensure delegation listeners are installed on the correct root.
 * Installs BOTH capture and bubble listeners, but each only dispatches for appropriate events.
 */
const ensureRootListener = (root: EventRoot, eventType: string) => {
    const installed = installedRootListeners.get(root) ?? new Set<string>();
    installedRootListeners.set(root, installed);

    // Install capture phase listener
    const captureKey = `${eventType}:capture`;
    if (!installed.has(captureKey)) {
        root.addEventListener(eventType, createPhaseHandler(eventType, "capture"), true);
        installed.add(captureKey);
    }

    // Install bubble phase listener
    const bubbleKey = `${eventType}:bubble`;
    if (!installed.has(bubbleKey)) {
        root.addEventListener(eventType, createPhaseHandler(eventType, "bubble"), false);
        installed.add(bubbleKey);
    }
};

/**
 * Get the root node where delegation listeners should be installed.
 * Handles Document, ShadowRoot, and detached elements.
 */
const getEventRoot = (element: HTMLElement): EventRoot | null => {
    const root = element.getRootNode();

    // Document or ShadowRoot - use as delegation target
    if (root instanceof Document || root instanceof ShadowRoot) {
        return root;
    }

    // Detached element - root is the element itself, no delegation possible
    return null;
};


export const registerDelegatedEvent = (
    element: HTMLElement,
    eventType: string,
    handler: EventListener,
    options: DelegatedEventOptions = {},
): void => {
    // Get the correct root for delegation (Document or ShadowRoot)
    const root = getEventRoot(element);

    // capture-only events should be forced to capture
    const capture = options.capture || CAPTURE_ONLY_EVENTS.has(eventType);

    if (root) {
        // Element is in DOM - use delegation
        ensureRootListener(root, eventType);
    } else if (element.ownerDocument) {
        // Element has a document but isn't connected yet - install listener on document
        // Events will work once the element is attached
        ensureRootListener(element.ownerDocument, eventType);
    } else {
        // Truly detached element (no document) - use direct binding
        // This ensures events work even for elements never attached to DOM
        element.addEventListener(eventType, handler, capture);
    }

    const byEvent = getOrCreateElementHandlers(element);
    const entry = byEvent.get(eventType) ?? {};
    byEvent.set(eventType, entry);

    if (options.multi) {
        // Dequery mode: add to set (allows multiple handlers)
        if (capture) {
            if (!entry.captureSet) entry.captureSet = new Set();
            entry.captureSet.add(handler);
        } else {
            if (!entry.bubbleSet) entry.bubbleSet = new Set();
            entry.bubbleSet.add(handler);
        }
    } else {
        // JSX mode: one handler per prop, overwrite to prevent duplicates
        if (capture) {
            entry.capture = handler;
        } else {
            entry.bubble = handler;
        }
    }
};

export const removeDelegatedEvent = (
    element: HTMLElement,
    eventType: string,
    handler?: EventListener,
    options: DelegatedEventOptions = {},
): void => {
    const capture = options.capture || CAPTURE_ONLY_EVENTS.has(eventType);
    const byEvent = elementHandlerMap.get(element);
    if (!byEvent) return;

    const entry = byEvent.get(eventType);
    if (!entry) return;

    if (handler) {
        // Remove specific handler from both phases (since we don't know which phase it was added to)
        if (entry.captureSet) {
            entry.captureSet.delete(handler);
        }
        if (entry.bubbleSet) {
            entry.bubbleSet.delete(handler);
        }
        // Also check if it matches single handler
        if (entry.capture === handler) {
            entry.capture = undefined;
        }
        if (entry.bubble === handler) {
            entry.bubble = undefined;
        }

        // Always call removeEventListener for safety (handles detached element direct-binding case)
        element.removeEventListener(eventType, handler, true);  // capture
        element.removeEventListener(eventType, handler, false); // bubble
    } else {
        // Remove ALL handlers for this event type (both phases)
        // This is what users expect from .off("click") without specific handler
        entry.capture = undefined;
        entry.bubble = undefined;
        entry.captureSet = undefined;
        entry.bubbleSet = undefined;
    }

    // Clean up entry if empty
    const isEmpty = !entry.capture && !entry.bubble &&
        (!entry.captureSet || entry.captureSet.size === 0) &&
        (!entry.bubbleSet || entry.bubbleSet.size === 0);
    if (isEmpty) {
        byEvent.delete(eventType);
    }
};

export const clearDelegatedEvents = (element: HTMLElement): void => {
    const byEvent = elementHandlerMap.get(element);
    if (!byEvent) return;

    byEvent.clear();
};

/**
 * Clear delegated events for an element and all its descendants.
 * Used by empty() to prevent event handler leaks when removing subtrees.
 */
export const clearDelegatedEventsDeep = (root: HTMLElement): void => {
    // Clear the root element
    clearDelegatedEvents(root);

    // Walk all descendant elements and clear their handlers
    // Use ownerDocument for SSR/multi-doc compatibility
    const doc = root.ownerDocument ?? document;
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node) {
        clearDelegatedEvents(node as HTMLElement);
        node = walker.nextNode();
    }
};

/**
 * Get all event types currently registered on an element.
 * Used to detect which events need to be removed when vnode props change.
 */
export const getRegisteredEventTypes = (element: HTMLElement): Set<string> => {
    const byEvent = elementHandlerMap.get(element);
    if (!byEvent) return new Set();
    return new Set(byEvent.keys());
};

/**
 * Get all event keys with phases currently registered on an element.
 * Returns keys like "click:bubble", "click:capture" for precise phase-aware removal.
 */
export const getRegisteredEventKeys = (element: HTMLElement): Set<string> => {
    const byEvent = elementHandlerMap.get(element);
    if (!byEvent) return new Set();

    const keys = new Set<string>();
    for (const [eventType, entry] of byEvent) {
        if (entry.bubble || entry.bubbleSet?.size) keys.add(`${eventType}:bubble`);
        if (entry.capture || entry.captureSet?.size) keys.add(`${eventType}:capture`);
    }
    return keys;
};

/**
 * Remove delegated event handler for a specific phase only.
 * Used by patchElementInPlace to precisely remove stale handlers when vnode changes from
 * onClick + onClickCapture → onClickCapture only.
 */
export const removeDelegatedEventByKey = (
    element: HTMLElement,
    eventType: string,
    phase: "bubble" | "capture",
): void => {
    const byEvent = elementHandlerMap.get(element);
    if (!byEvent) return;

    const entry = byEvent.get(eventType);
    if (!entry) return;

    if (phase === "capture") {
        entry.capture = undefined;
        entry.captureSet = undefined;
    } else {
        entry.bubble = undefined;
        entry.bubbleSet = undefined;
    }

    // Clean up entry if empty
    const isEmpty = !entry.capture && !entry.bubble &&
        (!entry.captureSet || entry.captureSet.size === 0) &&
        (!entry.bubbleSet || entry.bubbleSet.size === 0);
    if (isEmpty) byEvent.delete(eventType);
};

```

./src/render/dev/index.ts:
```
export * from "../../render/types.js";
export * from "../../render/isomorph.js";
export * from "../../render/ref.js";
export * from "../../render/transitions.js";

```

./src/render/index.ts:
```
export * from "../render/types.js";
export * from "../render/isomorph.js";
export * from "../render/ref.js";
export * from "../render/transitions.js";
export * from "../render/delegated-events.js";
export * from "../render/component-registry.js";
export * from "../render/mount.js";

```

./src/render/isomorph.ts:
```
import { isRef, type NodeType } from "../render/index.js";
import type {
  CallChainImpl,
  CallChainImplThenable,
  Dequery,
} from "../dequery/index.js";
import { isDequery } from "../dequery/index.js";
import type {
  VNodeChild,
  VNodeChildren,
  VNode,
  VNodeType,
  VNodeAttributes,
  DomAbstractionImpl,
  Globals,
  RenderInput,
  Ref,
  JsxSourceInfo,
} from "./types.js";
import {
  domNodeToVNode,
  htmlStringToVNodes,
  isMarkup,
  updateDomWithVdom,
} from "../common/dom.js";
import { waitForRef } from "defuss-runtime";
import { queueCallback } from "../common/queue.js";
import {
  performTransition,
  DEFAULT_TRANSITION_CONFIG,
  type TransitionConfig,
} from "./transitions.js";
import { parseEventPropName, registerDelegatedEvent } from "./delegated-events.js";

export const CLASS_ATTRIBUTE_NAME = "class";
export const XLINK_ATTRIBUTE_NAME = "xlink";
export const XMLNS_ATTRIBUTE_NAME = "xmlns";
export const REF_ATTRIBUTE_NAME = "ref";
export const DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE = "dangerouslySetInnerHTML";

const nsMap = {
  [XMLNS_ATTRIBUTE_NAME]: "http://www.w3.org/2000/xmlns/",
  [XLINK_ATTRIBUTE_NAME]: "http://www.w3.org/1999/xlink",
  svg: "http://www.w3.org/2000/svg",
};

declare global {
  var __defuss_document: Document;
  var __defuss_window: Window;
}

// If a JSX comment is written, it looks like: { /* this */ }
// Therefore, it turns into: {}, which is detected here
const isJSXComment = (node: VNode): boolean =>
  /* v8 ignore next */
  node &&
  typeof node === "object" &&
  !node.attributes &&
  !node.type &&
  !node.children;

// Filters comments and undefines like: ['a', 'b', false, {}] to: ['a', 'b', false]
const filterComments = (children: Array<VNode> | Array<VNodeChild>) =>
  children.filter((child: VNodeChild) => !isJSXComment(child as VNode));

export const createInPlaceErrorMessageVNode = (error: unknown) => ({
  type: "p",
  attributes: {},
  children: [`FATAL ERROR: ${(error as Error)?.message || error}`],
});

export type JsxRuntimeHookFn = (
  type: VNodeType | Function | any,
  attributes:
    | (JSX.HTMLAttributes & JSX.SVGAttributes & Record<string, any>)
    | null,
  key?: string,
  sourceInfo?: JsxSourceInfo,
) => void;

export const jsx = (
  type: VNodeType | Function | any,
  attributes:
    | (JSX.HTMLAttributes & JSX.SVGAttributes & Record<string, any>)
    | null,
  key?: string,
  sourceInfo?: JsxSourceInfo,
): Array<VNode> | VNode => {
  // clone attributes as well
  attributes = { ...attributes };

  if (typeof key !== "undefined") {
    /* key passed for instance-based lifecycle event listener registration */
    attributes.key = key;
  }

  // extract children from attributes and ensure it's always an array
  // Filter null/undefined/booleans to match update/hydrate behavior
  // (booleans render as nothing, not as "true"/"false" text)
  let children: Array<VNodeChild> = (
    attributes?.children ? [].concat(attributes.children) : []
  ).filter((c) => c !== null && c !== undefined && typeof c !== "boolean");
  delete attributes?.children;

  children = filterComments(
    // Implementation to flatten virtual node children structures like:
    // [<p>1</p>, [<p>2</p>,<p>3</p>]] to: [<p>1</p>,<p>2</p>,<p>3</p>]
    ([] as Array<VNodeChildren>).concat.apply(
      [],
      children as any,
    ) as Array<VNodeChildren>,
  );

  // effectively unwrap by directly returning the children
  if (type === "fragment") {
    return filterComments(children) as Array<VNode>;
  }

  // Handle async function components with fallback prop
  // This enables: <AsyncComponent fallback={<div>Loading...</div>} />
  if (typeof type === "function" && type.constructor.name === "AsyncFunction") {
    const fallback = attributes?.fallback;

    // Extract fallback from attributes so it's not passed to the async component
    const propsForAsyncFn = { ...attributes };
    delete propsForAsyncFn.fallback;

    // Create onMount handler that will:
    // 1. Execute the async function component
    // 2. Update the container with the resolved content
    const onMount = async (containerEl: HTMLElement) => {
      try {
        // Execute the async component function with props
        const resolvedVNode = await type({
          ...propsForAsyncFn,
          children,
        });

        // Import updateDomWithVdom dynamically to update the container
        // The container element will have its content replaced with the resolved VNode
        if (containerEl && resolvedVNode) {
          const globals: Globals = {
            window: containerEl.ownerDocument?.defaultView ?? (globalThis as unknown as Window),
          } as Globals;
          updateDomWithVdom(containerEl, resolvedVNode, globals);
        }
      } catch (error) {
        console.error("[defuss] Async component error:", error);
        if (containerEl) {
          containerEl.textContent = `Error: ${(error as Error)?.message || error}`;
        }
      }
    };

    // Return a wrapper div that shows fallback initially, then updates via onMount
    return {
      type: "div",
      attributes: {
        key,
        onMount,
        class: "defuss-async-container",
      },
      children: fallback ? [fallback] : [],
      sourceInfo,
    } as VNode;
  }


  // it's a component, divide and conquer children
  // in case of sync functions (not AsyncFunction)
  if (typeof type === "function" && type.constructor.name !== "AsyncFunction") {

    try {
      // Pass all attributes including key (defuss components like Trans use key as a prop)
      const rendered = type({
        children,
        ...attributes,
      });

      // Diff semantics: also apply key to the returned vnode root so morphing can find keyed nodes
      if (typeof key !== "undefined" && rendered && typeof rendered === "object") {
        // Single root vnode
        if ("attributes" in (rendered as any)) {
          (rendered as any).attributes = {
            ...(rendered as any).attributes,
            key,
          };
        }
        // Fragment array: only safe auto-key if it's a single root
        else if (Array.isArray(rendered) && rendered.length === 1) {
          const only = rendered[0];
          if (only && typeof only === "object" && "attributes" in (only as any)) {
            (only as any).attributes = {
              ...(only as any).attributes,
              key,
            };
          }
        }
      }

      return rendered;
    } catch (error) {
      if (typeof error === "string") {
        error = `[JsxError] in ${type.name}: ${error}`;
      } else if (error instanceof Error) {
        error.message = `[JsxError] in ${type.name}: ${error.message}`;
      }

      // render the error in place
      return createInPlaceErrorMessageVNode(error);
    }
  }

  return {
    type,
    attributes,
    children,
    sourceInfo,
  } as VNode;
};

export const observeUnmount = (domNode: Node, onUnmount: () => void): void => {
  if (!domNode || typeof onUnmount !== "function") {
    throw new Error(
      "Invalid arguments. Ensure domNode and onUnmount are valid.",
    );
  }

  let parentNode: Node | null = domNode.parentNode;
  if (!parentNode) {
    throw new Error("The provided domNode does not have a parentNode.");
  }

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.removedNodes.length > 0) {
        for (const removedNode of mutation.removedNodes) {
          if (removedNode === domNode) {
            // Defer check: if node is re-inserted (move), it will be connected
            queueMicrotask(() => {
              if (!domNode.isConnected) {
                // Node was actually unmounted
                onUnmount();
                observer.disconnect();
                return;
              }

              // Node was moved, not unmounted: re-arm observer on new parent
              const newParent = domNode.parentNode;
              if (newParent && newParent !== parentNode) {
                parentNode = newParent;
                observer.disconnect();
                observer.observe(parentNode, { childList: true });
              }
            });
            return;
          }
        }
      }
    }
  });

  // Observe the parentNode for child removals
  observer.observe(parentNode, { childList: true });
};

/** lifecycle event attachment has been implemented separately, because it is also required to run when partially updating the DOM */
export const handleLifecycleEventsForOnMount = (newEl: HTMLElement) => {
  // check for a lifecycle "onMount" hook and call it
  if (typeof (newEl as any)?.$onMount === "function") {
    (newEl as any).$onMount!(); // remove the hook after it's been called
    (newEl as any).$onMount = null;
  }

  // optionally check for a element lifecycle "onUnmount" and hook it up
  if (typeof (newEl as any)?.$onUnmount === "function") {
    // register the unmount observer (MutationObserver)
    observeUnmount(newEl as HTMLElement, (newEl as any).$onUnmount!);
  }
};

export const getRenderer = (document: Document): DomAbstractionImpl => {
  // DOM abstraction layer for manipulation
  const renderer = {
    hasElNamespace: (domElement: Element | Document): boolean =>
      (domElement as Element).namespaceURI === nsMap.svg,

    hasSvgNamespace: (
      parentElement: Element | Document,
      type: string,
    ): boolean =>
      renderer.hasElNamespace(parentElement) &&
      type !== "STYLE" &&
      type !== "SCRIPT",

    createElementOrElements: (
      virtualNode: VNode | undefined | Array<VNode | undefined | string>,
      parentDomElement?: Element | Document,
    ): Array<Element | Text | undefined> | Element | Text | undefined => {
      if (Array.isArray(virtualNode)) {
        return renderer.createChildElements(virtualNode, parentDomElement);
      }
      if (typeof virtualNode !== "undefined") {
        return renderer.createElement(virtualNode, parentDomElement);
      }
      // undefined virtualNode -> e.g. when a tsx variable is used in markup which is undefined
      return renderer.createTextNode("", parentDomElement);
    },

    createElement: (
      virtualNode: VNode,
      parentDomElement?: Element | Document,
    ): Element | undefined => {
      let newEl: Element | undefined = undefined;

      try {
        // if a synchronous function is still a function, VDOM has obviously not resolved, probably an
        // Error occurred while generating the VDOM (in JSX runtime)
        if (virtualNode.constructor.name === "AsyncFunction") {
          newEl = document.createElement("div");
        } else if (typeof virtualNode.type === "function") {
          newEl = document.createElement("div");
          (newEl as HTMLElement).innerText =
            `FATAL ERROR: ${virtualNode.type._error}`;
        } else if (
          // SVG support
          virtualNode.type.toUpperCase() === "SVG" ||
          (parentDomElement &&
            renderer.hasSvgNamespace(
              parentDomElement,
              virtualNode.type.toUpperCase(),
            ))
        ) {
          // SVG support
          newEl = document.createElementNS(
            nsMap.svg,
            virtualNode.type as string,
          );
        } else {
          newEl = document.createElement(virtualNode.type as string);
        }

        if (virtualNode.attributes) {
          renderer.setAttributes(virtualNode, newEl as Element);

          // apply dangerouslySetInnerHTML if provided
          if (virtualNode.attributes.dangerouslySetInnerHTML) {
            (newEl as HTMLElement).innerHTML = virtualNode.attributes.dangerouslySetInnerHTML.__html;
          }
        }

        // Skip child creation when dangerouslySetInnerHTML is used (matches React semantics)
        if (virtualNode.children && !virtualNode.attributes?.dangerouslySetInnerHTML) {
          renderer.createChildElements(virtualNode.children, newEl as Element);
        }

        if (parentDomElement) {
          parentDomElement.appendChild(newEl);
          handleLifecycleEventsForOnMount(newEl as HTMLElement);
        }
      } catch (e) {
        console.error(
          "Fatal error! Error happend while rendering the VDOM!",
          e,
          virtualNode,
        );
        throw e;
      }
      return newEl as Element;
    },

    createTextNode: (text: string, domElement?: Element | Document): Text => {
      const node = document.createTextNode(text.toString());

      if (domElement) {
        domElement.appendChild(node);
      }
      return node;
    },

    createChildElements: (
      virtualChildren: VNodeChildren,
      domElement?: Element | Document,
    ): Array<Element | Text | undefined> => {
      const children: Array<Element | Text | undefined> = [];

      for (let i = 0; i < virtualChildren.length; i++) {
        const virtualChild = virtualChildren[i];

        // Skip booleans entirely - {true} and {false} render nothing (React/JSX semantics)
        if (typeof virtualChild === "boolean") {
          continue;
        }

        if (
          virtualChild === null ||
          (typeof virtualChild !== "object" &&
            typeof virtualChild !== "function")
        ) {
          children.push(
            renderer.createTextNode(
              (typeof virtualChild === "undefined" || virtualChild === null
                ? ""
                : virtualChild!
              ).toString(),
              domElement,
            ),
          );
        } else {
          children.push(
            renderer.createElement(virtualChild as VNode, domElement),
          );
        }
      }
      return children;
    },

    setAttribute: (
      name: string,
      value: any,
      domElement: Element,
      virtualNode: VNode<VNodeAttributes>,
    ) => {
      // attributes not set (undefined) are ignored; use null value to reset an attributes state
      if (typeof value === "undefined") return;

      if (name === DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE) return;

      // internal list key: store on element, do not serialize into DOM
      if (name === "key") {
        (domElement as HTMLElement & { _defussKey?: string })._defussKey = String(value);
        return;
      }

      // save ref as { current: DOMElement } in ref object
      if (name === REF_ATTRIBUTE_NAME && typeof value !== "function") {
        const ref = value as { current?: unknown; orphan?: boolean };
        ref.current = domElement;
        (domElement as HTMLElement)._defussRef = value as any;

        (domElement as any).$onUnmount = queueCallback(() => {
          // value.orphan = true;
        });

        if (domElement.parentNode) {
          observeUnmount(domElement, (domElement as any).$onUnmount);
        } else {
          queueMicrotask(() => {
            if (domElement.parentNode) {
              observeUnmount(domElement, (domElement as any).$onUnmount);
            }
          });
        }
        return;
      }

      // event props: delegate globally; still keep defuss lifecycle hooks
      const parsed = parseEventPropName(name);
      if (parsed && typeof value === "function") {
        const { eventType, capture } = parsed;

        if (eventType === "mount") {
          (domElement as any).$onMount = queueCallback(value as () => void);
          return;
        }

        if (eventType === "unmount") {
          if ((domElement as any).$onUnmount) {
            const existingUnmount = (domElement as any).$onUnmount as () => void;
            (domElement as any).$onUnmount = () => {
              existingUnmount();
              (value as () => void)();
            };
          } else {
            (domElement as any).$onUnmount = queueCallback(value as () => void);
          }
          return;
        }

        registerDelegatedEvent(domElement as HTMLElement, eventType, value as EventListener, { capture });
        return;
      }

      // transforms className="..." -> class="..."
      if (name === "className") {
        name = CLASS_ATTRIBUTE_NAME;
      }

      // transforms class={['a', 'b']} into class="a b"
      if (name === CLASS_ATTRIBUTE_NAME && Array.isArray(value)) {
        value = value.join(" ");
      }

      // SVG support
      const nsEndIndex = name.match(/[A-Z]/)?.index;
      if (renderer.hasElNamespace(domElement) && nsEndIndex) {
        const ns = name.substring(0, nsEndIndex).toLowerCase();
        const attrName = name.substring(nsEndIndex, name.length).toLowerCase();
        const namespace = nsMap[ns as keyof typeof nsMap] || null;
        domElement.setAttributeNS(
          namespace,
          ns === XLINK_ATTRIBUTE_NAME || ns === XMLNS_ATTRIBUTE_NAME
            ? `${ns}:${attrName}`
            : name,
          String(value),
        );
      } else if (name === "style" && typeof value !== "string") {
        const styleObj = value as Record<string, string | number>;
        for (const prop of Object.keys(styleObj)) {
          (domElement as HTMLElement).style[prop as any] = String(styleObj[prop]);
        }
      } else if (typeof value === "boolean") {
        (domElement as any)[name] = value;
      } else if (
        // Controlled input props: use property assignment, not setAttribute
        // setAttribute updates the default value, property updates the live value
        (name === "value" || name === "checked" || name === "selectedIndex") &&
        (domElement instanceof HTMLInputElement ||
          domElement instanceof HTMLTextAreaElement ||
          domElement instanceof HTMLSelectElement)
      ) {
        (domElement as any)[name] = value;
      } else {
        domElement.setAttribute(name, String(value));
      }
    },

    setAttributes: (
      virtualNode: VNode<VNodeAttributes>,
      domElement: Element,
    ) => {
      const attrNames = Object.keys(virtualNode.attributes!);
      for (let i = 0; i < attrNames.length; i++) {
        renderer.setAttribute(
          attrNames[i],
          virtualNode.attributes![attrNames[i]],
          domElement,
          virtualNode,
        );
      }
    },
  };
  return renderer;
};

export type SyncRenderInput =
  | VNode
  | undefined
  | string
  | Array<VNode | undefined | string>;
export type ParentElementInput =
  | Element
  | Document
  | Dequery<NodeType>
  | undefined;
export type SyncRenderResult =
  | Array<Element | Text | undefined>
  | Element
  | Text
  | undefined;

export const renderIsomorphicSync = (
  virtualNode: SyncRenderInput,
  parentDomElement: ParentElementInput,
  globals: Globals,
): SyncRenderResult => {
  if (isDequery(parentDomElement)) {
    parentDomElement =
      ((
        parentDomElement as Dequery<NodeType>
      ).getFirstElement() as unknown as Element) || parentDomElement;
  }

  let renderResult: SyncRenderResult;

  if (typeof virtualNode === "string") {
    renderResult = getRenderer(globals.window.document).createTextNode(
      virtualNode,
      parentDomElement,
    );
  } else {
    renderResult = getRenderer(globals.window.document).createElementOrElements(
      virtualNode,
      parentDomElement,
    );
  }
  return renderResult;
};

export type ParentElementInputAsync =
  | ParentElementInput
  | Dequery<NodeType>
  | Promise<ParentElementInput | Dequery<NodeType>>;

export const renderIsomorphicAsync = async (
  virtualNode: SyncRenderInput | Promise<SyncRenderInput>,
  parentDomElement: ParentElementInputAsync,
  globals: Globals,
): Promise<SyncRenderResult> => {
  if (parentDomElement instanceof Promise) {
    parentDomElement = (await parentDomElement) as
      | ParentElementInput
      | Dequery<NodeType>;
  }

  if (isDequery(parentDomElement)) {
    // awaits the dequery chain to resolve or fail, then renders the VDOM
    parentDomElement = (
      await (parentDomElement as Dequery<NodeType>).toArray()
    )[0] as Element;
  }

  if (virtualNode instanceof Promise) {
    virtualNode = await virtualNode;
  }
  return renderIsomorphicSync(
    virtualNode,
    parentDomElement as ParentElementInput,
    globals,
  );
};

export const globalScopeDomApis = (window: Window, document: Document) => {
  globalThis.__defuss_document = document;
  globalThis.__defuss_window = window;
};

/**
 * React-compatible render function.
 * Renders JSX content into a container element using defuss' DOM morphing engine.
 * 
 * @example
 * ```tsx
 * import { render, $ } from "defuss";
 * 
 * const App = () => <div>Hello World</div>;
 * 
 * // Using with $ selector
 * render(<App />, $("#app").current);
 * 
 * // Using with direct element
 * render(<App />, document.getElementById("app"));
 * ```
 */
export const render = (
  jsx: SyncRenderInput,
  container: Element | null | undefined,
): void => {
  if (!container) {
    console.warn("render: container is null or undefined");
    return;
  }

  const globals: Globals = {
    window: container.ownerDocument?.defaultView ?? (globalThis as unknown as Window),
  } as Globals;

  // Use updateDomWithVdom for intelligent DOM morphing (preserves state, event listeners, etc.)
  updateDomWithVdom(container as HTMLElement, jsx as RenderInput, globals);
};

/**
 * @deprecated Use render instead. Will be removed in v4.
 */
export const renderInto = render;

export const isJSX = (o: any): boolean => {
  if (o === null || typeof o !== "object") return false;
  // Arrays are valid JSX - fragments and child arrays
  // Each element can be a VNode, string, or number (text nodes)
  if (Array.isArray(o)) {
    return o.every((item) =>
      isJSX(item) || typeof item === "string" || typeof item === "number"
    );
  }
  if (typeof o.type === "string") return true;
  if (typeof o.type === "function") return true;
  if (typeof o.attributes === "object" && typeof o.children === "object")
    return true;
  return false;
};

// --- JSX standard (necessary exports for jsx-runtime)
export const Fragment = (props: VNode) => props.children;
export const jsxs = jsx;
export const jsxDEV = (
  type: VNodeType | Function | any,
  attributes:
    | (JSX.HTMLAttributes & JSX.SVGAttributes & Record<string, any>)
    | null,
  key?: string,
  allChildrenAreStatic?: boolean,
  sourceInfo?: JsxSourceInfo,
  selfReference?: any,
): Array<VNode> | VNode => {
  let renderResult: Array<VNode> | VNode;
  try {
    if (sourceInfo) {
      if (
        typeof type === "function" &&
        type.constructor.name !== "AsyncFunction"
      ) {
        // attach sourceInfo to function components for better error messages and for automatic hydration
        sourceInfo.exportName = type.name || sourceInfo?.exportName;
      }
      sourceInfo.allChildrenAreStatic = allChildrenAreStatic;
      sourceInfo.selfReference = selfReference;
    }
    renderResult = jsx(type, attributes, key, sourceInfo);
  } catch (error) {
    console.error(
      "JSX error:",
      error,
      "in",
      sourceInfo,
      "component",
      selfReference,
    );
  }
  return renderResult!;
};

/**
 * Helper function to perform the actual DOM update without transitions
 */
async function performCoreDomUpdate<NT>(
  input:
    | string
    | RenderInput
    | Ref<NodeType>
    | NodeType
    | CallChainImpl<NT>
    | CallChainImplThenable<NT>,
  nodes: readonly NodeType[],
  timeout: number,
  Parser: typeof globalThis.DOMParser,
): Promise<void> {
  let processedInput = input;

  if (isDequery(processedInput)) {
    processedInput = (processedInput as any)[0] as HTMLElement;
  }

  if (isRef(processedInput)) {
    await waitForRef(processedInput as Ref<NodeType>, timeout);
    processedInput = (processedInput as Ref<NodeType>).current;
  }

  // Helper to derive globals from an element (SSR/multi-window compatible)
  const getGlobalsFromElement = (el: NodeType): Globals => {
    const win = (el as Element).ownerDocument?.defaultView;
    return (win as unknown as Globals) ?? (globalThis as unknown as Globals);
  };

  if (processedInput instanceof Node) {
    // Convert DOM node to VNode and use the intelligent updateDomWithVdom
    // This preserves existing DOM structure and event listeners
    const vnode = domNodeToVNode(processedInput);
    nodes.forEach((el) => {
      if (el) {
        updateDomWithVdom(el as HTMLElement, vnode, getGlobalsFromElement(el));
      }
    });
    return;
  }

  if (typeof processedInput === "string") {
    if (isMarkup(processedInput, Parser)) {
      // Convert HTML markup to VNodes and use intelligent updateDomWithVdom
      // This provides better DOM state preservation than the older updateDom approach
      const vNodes = htmlStringToVNodes(processedInput, Parser);
      nodes.forEach((el) => {
        if (el) {
          updateDomWithVdom(el as HTMLElement, vNodes, getGlobalsFromElement(el));
        }
      });
    } else {
      // For plain text, use the more efficient updateDomWithVdom approach
      // This preserves existing DOM structure where possible
      nodes.forEach((el) => {
        if (el) {
          updateDomWithVdom(
            el as HTMLElement,
            processedInput as string,
            getGlobalsFromElement(el),
          );
        }
      });
    }
  } else if (isJSX(processedInput)) {
    // Use the intelligent updateDomWithVdom for JSX
    // This function performs partial updates, preserving existing DOM elements
    // and only updating what has actually changed
    nodes.forEach((el) => {
      if (el) {
        updateDomWithVdom(
          el as HTMLElement,
          processedInput as RenderInput,
          getGlobalsFromElement(el),
        );
      }
    });
  } else {
    console.warn("update: unsupported content type", processedInput);
  }
}


export async function updateDom<NT>(
  input:
    | string
    | RenderInput
    | Ref<NodeType>
    | NodeType
    | CallChainImpl<NT>
    | CallChainImplThenable<NT>,
  nodes: readonly NodeType[],
  timeout: number,
  Parser: typeof globalThis.DOMParser,
  transitionConfig?: TransitionConfig,
): Promise<readonly NodeType[]> {
  // Handle transitions if configuration is provided
  if (transitionConfig && transitionConfig.type !== "none") {
    const config = { ...DEFAULT_TRANSITION_CONFIG, ...transitionConfig };
    const { target = "self" } = config;

    const transitionPromises = nodes.map(async (node) => {
      if (!node) return node;

      const element = node as HTMLElement;
      const transitionTarget =
        target === "self" ? element : element.parentElement;

      if (!transitionTarget) {
        await performCoreDomUpdate(input, [node], timeout, Parser);
        return node;
      }

      await performTransition(
        transitionTarget,
        () => performCoreDomUpdate(input, [node], timeout, Parser),
        config,
      );
      return node;
    });

    await Promise.all(transitionPromises);
    return nodes;
  }

  // No transitions - perform regular update
  await performCoreDomUpdate(input, nodes, timeout, Parser);
  return nodes;
}

export default {
  jsx,
  Fragment,
  renderIsomorphic: renderIsomorphicSync,
  getRenderer,

  // implementing the full standard
  // https://github.com/reactjs/rfcs/blob/createlement-rfc/text/0000-create-element-changes.md
  jsxs,
  jsxDEV,
};

```

./src/render/mount.ts:
```
import { renderIsomorphicSync } from "./isomorph.js";
import { registerComponent, unregisterComponent } from "./component-registry.js";
import { observeUnmount } from "./isomorph.js";
import type { VNode, Globals } from "./types.js";

/**
 * Mount a component to a container, registering it for implicit updates.
 * 
 * After mounting, `$(container).update({ ...props })` will re-render the component
 * with merged props, enabling the FluxDOM implicit update contract.
 * 
 * @param container - The mount boundary element (stable root for updates)
 * @param Component - The component function (props) => VNode
 * @param initialProps - Initial props to render with
 * @returns The container element (for chaining)
 * 
 * @example
 * ```tsx
 * const Counter = ({ count }) => <div>{count}</div>;
 * const root = mount(document.getElementById("app"), Counter, { count: 0 });
 * 
 * // Later: implicit update via props merge
 * $(root).update({ count: 5 });
 * ```
 */
export function mount<P extends Record<string, unknown>>(
    container: Element,
    Component: (props: P) => VNode,
    initialProps: P,
): Element {
    // Clear existing content before mounting (replace semantics, not append)
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // Initial render into container
    const vnode = Component(initialProps);
    renderIsomorphicSync(vnode, container as HTMLElement, globalThis as Globals);

    // Register on the container boundary (stable root)
    registerComponent(
        container,
        Component as (props: Record<string, unknown>) => VNode,
        { ...initialProps } as Record<string, unknown>,
    );

    // Observe unmount to clean up registry
    if (container.parentNode) {
        observeUnmount(container, () => unregisterComponent(container));
    }

    return container;
}

/**
 * Unmount a component and clean up its registry entry.
 */
export function unmount(container: Element): void {
    unregisterComponent(container);
    // Clear children
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
}

```

./src/render/ref.ts:
```
import type { PersistenceProviderType } from "../webstorage/index.js";
import { $ } from "../dequery/dequery.js";
import type {
  NodeType,
  Ref,
  RefUpdateFn,
  RefUpdateRenderFnInput,
} from "../render/types.js";
import { createStore } from "../store/store.js";

export const isRef = <
  ST = any,
  NT extends Node | Element | Text | null = HTMLElement,
>(
  obj: any,
): obj is Ref<ST, NT> =>
  Boolean(obj && typeof obj === "object" && "current" in obj);

export function createRef<
  ST = any,
  NT extends Node | Element | Text | null = HTMLElement,
>(refUpdateFn?: RefUpdateFn<ST>, defaultState?: ST): Ref<ST, NT> {
  const stateStore = createStore<ST>(defaultState as ST);

  const ref: Ref<ST, NT> = {
    current: null as NT,
    store: stateStore,
    get state() {
      return stateStore.value;
    },
    set state(value: ST) {
      stateStore.set(value);
    },
    persist: (key: string, provider: PersistenceProviderType = "local") => {
      stateStore.persist(key, provider);
    },
    restore: (key: string, provider: PersistenceProviderType = "local") => {
      stateStore.restore(key, provider);
    },
    updateState: (state: ST) => {
      stateStore.set(state);
    },
    update: async (input: RefUpdateRenderFnInput) =>
      await $<NodeType>(ref.current).update(input),
    subscribe: (refUpdateFn: RefUpdateFn<ST>) =>
      stateStore.subscribe(refUpdateFn),
  };

  if (typeof refUpdateFn === "function") {
    ref.subscribe(refUpdateFn);
  }
  return ref;
}

```

./src/render/server.ts:
```
import * as HappyDom from "happy-dom";
import {
  renderIsomorphicSync,
  renderIsomorphicAsync,
  globalScopeDomApis,
  type ParentElementInput,
  type ParentElementInputAsync,
} from "./isomorph.js";
import type { RenderInput, RenderResult, Globals } from "./types.js";
import serializeHtml from "w3c-xmlserializer";

export interface RenderOptions {
  /** choose an arbitrary server-side DOM / Document implementation; this library defaults to 'linkedom'; default: undefined */
  browserGlobals?: Globals;

  /** creates a synthetic <html> root element in case you want to render in isolation; default: false; also happens when parentDomElement isn't present */
  createRoot?: boolean;
}

const setupDomApis = (options: RenderOptions = {}) => {
  const browserGlobals = options.browserGlobals
    ? options.browserGlobals
    : getBrowserGlobals();
  const document = getDocument(options.createRoot, browserGlobals);
  globalScopeDomApis(browserGlobals, document);
  return { browserGlobals, document };
};

export const renderSync = <T extends RenderInput>(
  virtualNode: T,
  parentDomElement?: ParentElementInput,
  options: RenderOptions = {},
): RenderResult<T> => {
  const { browserGlobals, document } = setupDomApis(options);
  if (!parentDomElement) {
    parentDomElement = document.documentElement;
  }
  return renderIsomorphicSync(
    virtualNode,
    parentDomElement,
    browserGlobals,
  ) as any;
};

export const render = <T extends RenderInput>(
  virtualNode: T,
  parentDomElement?: ParentElementInputAsync | any,
  options: RenderOptions = {},
): Promise<RenderResult<T>> => {
  const { browserGlobals, document } = setupDomApis(options);
  if (!parentDomElement) {
    parentDomElement = document.documentElement;
  }
  return renderIsomorphicAsync(
    virtualNode,
    parentDomElement,
    browserGlobals,
  ) as any;
};

export const createRoot = (document: Document): Element => {
  const htmlElement = document.createElement("html");
  document.documentElement.appendChild(htmlElement);
  return document.documentElement;
};

export const getBrowserGlobals = (): Globals => {
  return new HappyDom.Window({
    url: "http://localhost/",
  }) as unknown as Globals;
};

export const getDocument = (
  shouldCreateRoot = false,
  browserGlobals?: Globals,
): Document => {
  const document = (browserGlobals || getBrowserGlobals()).document;
  if (shouldCreateRoot) {
    createRoot(document);
    return document;
  }
  return document;
};

export const renderToString = (el: Node) =>
  serializeHtml(el).replaceAll(' xmlns="http://www.w3.org/1999/xhtml"', "");

export * from "./index.js";

```

./src/render/transitions.ts:
```
export type TransitionType =
  | "fade"
  | "slide-left"
  | "slide-right"
  | "shake"
  | "none";

export interface TransitionStyles {
  enter: Record<string, string>;
  enterActive: Record<string, string>;
  exit: Record<string, string>;
  exitActive: Record<string, string>;
}

export type TransitionsEasing =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "step-start"
  | "step-end";

export interface TransitionConfig {
  type?: TransitionType;
  styles?: TransitionStyles;
  duration?: number;
  easing?: TransitionsEasing | string;
  delay?: number;
  target?: "parent" | "self";
}

const injectShakeKeyframes = () => {
  if (!document.getElementById("defuss-shake")) {
    const style = document.createElement("style");
    style.id = "defuss-shake";
    style.textContent =
      "@keyframes shake{0%,100%{transform:translate3d(0,0,0)}10%,30%,50%,70%,90%{transform:translate3d(-10px,0,0)}20%,40%,60%,80%{transform:translate3d(10px,0,0)}}";
    document.head.appendChild(style);
  }
};

export const getTransitionStyles = (
  type: TransitionType,
  duration: number,
  easing = "ease-in-out",
): TransitionStyles => {
  const t = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;
  const styles: Record<string, TransitionStyles> = {
    fade: {
      enter: { opacity: "0", transition: t, transform: "translate3d(0,0,0)" },
      enterActive: { opacity: "1" },
      exit: { opacity: "1", transition: t, transform: "translate3d(0,0,0)" },
      exitActive: { opacity: "0" },
    },
    "slide-left": {
      enter: {
        transform: "translate3d(100%,0,0)",
        opacity: "0.5",
        transition: t,
      },
      enterActive: { transform: "translate3d(0,0,0)", opacity: "1" },
      exit: { transform: "translate3d(0,0,0)", opacity: "1", transition: t },
      exitActive: { transform: "translate3d(-100%,0,0)", opacity: "0.5" },
    },
    "slide-right": {
      enter: {
        transform: "translate3d(-100%,0,0)",
        opacity: "0.5",
        transition: t,
      },
      enterActive: { transform: "translate3d(0,0,0)", opacity: "1" },
      exit: { transform: "translate3d(0,0,0)", opacity: "1", transition: t },
      exitActive: { transform: "translate3d(100%,0,0)", opacity: "0.5" },
    },
    shake: (() => {
      injectShakeKeyframes();
      return {
        enter: {
          transform: "translate3d(0,0,0)",
          opacity: "1",
          transition: "none",
        },
        enterActive: {
          transform: "translate3d(0,0,0)",
          opacity: "1",
          animation: `shake ${duration}ms cubic-bezier(0.36,0.07,0.19,0.97)`,
        },
        exit: {
          transform: "translate3d(0,0,0)",
          opacity: "1",
          transition: "none",
        },
        exitActive: {
          transform: "translate3d(0,0,0)",
          opacity: "1",
          animation: `shake ${duration}ms cubic-bezier(0.36,0.07,0.19,0.97)`,
        },
      };
    })(),
  };
  return (
    styles[type] || { enter: {}, enterActive: {}, exit: {}, exitActive: {} }
  );
};

export const applyStyles = (
  el: HTMLElement,
  styles: Record<string, string | number>,
) =>
  Object.entries(styles).forEach(([k, v]) =>
    el.style.setProperty(k, String(v)),
  );

export const DEFAULT_TRANSITION_CONFIG: TransitionConfig = {
  type: "fade",
  duration: 300,
  easing: "ease-in-out",
  delay: 0,
  target: "parent",
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const performCrossfade = async (
  element: HTMLElement,
  updateCallback: () => Promise<void>,
  duration: number,
  easing: string,
): Promise<void> => {
  const originalStyle = element.style.cssText;
  const snapshot = element.cloneNode(true) as HTMLElement;

  try {
    // Set up container for crossfade
    const container = element.parentElement || element;
    const rect = element.getBoundingClientRect();

    // Position snapshot absolutely over original
    snapshot.style.cssText = `position:absolute;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;opacity:1;transition:opacity ${duration}ms ${easing};z-index:1000;`;

    // Prepare new content (initially hidden)
    element.style.opacity = "0";
    element.style.transition = `opacity ${duration}ms ${easing}`;

    // Insert snapshot and update content
    document.body.appendChild(snapshot);
    await updateCallback();

    // Trigger simultaneous crossfade
    void element.offsetHeight;
    snapshot.style.opacity = "0";
    element.style.opacity = "1";

    await wait(duration);
    document.body.removeChild(snapshot);
  } catch (error) {
    if (snapshot.parentElement) document.body.removeChild(snapshot);
    throw error;
  } finally {
    element.style.cssText = originalStyle;
  }
};

export const performTransition = async (
  element: HTMLElement,
  updateCallback: () => Promise<void>,
  config: TransitionConfig = {},
): Promise<void> => {
  const {
    type = "fade",
    duration = 300,
    easing = "ease-in-out",
    delay = 0,
  } = { ...DEFAULT_TRANSITION_CONFIG, ...config };

  if (type === "none") {
    await updateCallback();
    return;
  }

  if (delay > 0) await wait(delay);

  // Use crossfade for fade transitions
  if (type === "fade") {
    await performCrossfade(element, updateCallback, duration, easing);
    return;
  }

  const styles = config.styles || getTransitionStyles(type, duration, easing);
  const originalTransition = element.style.transition;
  const originalAnimation = element.style.animation;

  try {
    // Clear any existing animation for shake restart
    if (type === "shake") {
      element.style.animation = "none";
      void element.offsetHeight;
    }

    // Apply exit transition
    applyStyles(element, styles.exit);
    void element.offsetHeight;
    applyStyles(element, styles.exitActive);

    await wait(duration);

    // Update content
    await updateCallback();

    // Apply enter transition
    applyStyles(element, styles.enter);
    void element.offsetHeight;
    applyStyles(element, styles.enterActive);

    await wait(duration);

    // Restore original styles
    element.style.transition = originalTransition;
    element.style.animation = originalAnimation;
  } catch (error) {
    element.style.transition = originalTransition;
    element.style.animation = originalAnimation;
    throw error;
  }
};

```

./src/store/index.ts:
```
export * from "./store.js";

```

./src/store/store.bench.ts:
```
import { bench, describe } from "vitest";
import { createStore, deepEquals } from "./store.js";

describe("Store Performance", () => {
    const largeState: Record<string, number> = Array.from({ length: 1000 }).reduce(
        (acc: Record<string, number>, _, i) => {
            acc[`key${i}`] = i;
            return acc;
        },
        {} as Record<string, number>
    );

    // Default is now shallow
    const defaultStore = createStore(largeState);
    const deepStore = createStore(largeState, { equals: deepEquals });
    const pathStore = createStore({ nested: { deep: { value: 1 } } });

    bench("getRaw (O(1))", () => {
        defaultStore.getRaw();
    });

    bench("get (path, O(L))", () => {
        pathStore.get("nested.deep.value");
    });

    bench("setRaw (default shallow, no change)", () => {
        defaultStore.setRaw(largeState);
    });

    bench("setRaw (deep compare, no change, expensive)", () => {
        deepStore.setRaw(largeState);
    });

    bench("setRaw (default shallow, change)", () => {
        // We toggle between two states to force updates
        const stateA = { ...largeState, id: 1 };
        defaultStore.setRaw(stateA);
    });

    bench("set (path update)", () => {
        pathStore.set("nested.deep.value", Math.random());
    });

    bench("creation overhead", () => {
        createStore({ id: 1 });
    });
});

```

./src/store/store.ts:
```
import { getByPath, setByPath } from "defuss-runtime";
import {
  webstorage,
  type PersistenceProviderImpl,
  type PersistenceProviderType,
} from "../webstorage/index.js";

export type Listener<T> = (
  newValue: T,
  oldValue?: T,
  changedKey?: string,
) => void;

export type EqualsFn<T> = (a: T, b: T) => boolean;

export interface StoreOptions<T> {
  /** Custom equality function. Default: Object.is (shallow identity) */
  equals?: EqualsFn<T>;
}

export interface Store<T> {
  value: T;
  /** Get value at path, or entire store if no path */
  get: <D = T>(path?: string) => D;
  /** Set value at path, or replace entire store if no path */
  set: <D = T>(pathOrValue: string | D, value?: D) => void;
  /** Get entire store value (clearer API than get()) */
  getRaw: () => T;
  /** Replace entire store value (clearer API than set(value)) */
  setRaw: (value: T) => void;
  /** Reset store to initial value or provided value */
  reset: (value?: T) => void;
  subscribe: (listener: Listener<T>) => () => void;
  persist: (key: string, provider?: PersistenceProviderType) => void;
  restore: (key: string, provider?: PersistenceProviderType) => void;
}

/** Shallow identity comparison (opt-in for performance) */
export const shallowEquals = <T>(a: T, b: T): boolean => Object.is(a, b);

/** Deep equality via JSON (default - backward compatible) */
export const deepEquals = <T>(a: T, b: T): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

export const createStore = <T>(
  initialValue: T,
  options: StoreOptions<T> = {},
): Store<T> => {
  const equals = options.equals ?? shallowEquals;
  let value: T = initialValue;
  const listeners: Array<Listener<T>> = [];

  const notify = (oldValue: T, changedKey?: string) => {
    listeners.forEach((listener) => listener(value, oldValue, changedKey));
  };

  let storage: PersistenceProviderImpl<T> | null = null;
  let storageKey: string | null = null;
  let storageProvider: PersistenceProviderType | undefined;

  const initStorage = (provider?: PersistenceProviderType) => {
    if (!storage || storageProvider !== provider) {
      storage = webstorage<T>(provider);
      storageProvider = provider;
    }
    return storage;
  };

  const persistToStorage = () => {
    if (storage && storageKey) {
      storage.set(storageKey, value);
    }
  };

  return {
    // allow reading value but prevent external mutation
    get value() {
      return value;
    },

    persist(key: string, provider: PersistenceProviderType = "local") {
      storage = initStorage(provider);
      storageKey = key;
      persistToStorage();
    },

    restore(key: string, provider: PersistenceProviderType = "local") {
      storage = initStorage(provider);
      storageKey = key;
      const storedValue = storage.get(key, value);

      // Capture oldValue before assignment for correct notification
      const oldValue = value;
      if (!equals(oldValue, storedValue)) {
        value = storedValue;
        notify(oldValue);
      }
    },

    get(path?: string) {
      return path ? getByPath(value, path) : value;
    },

    /** Get entire store value (clearer API) */
    getRaw() {
      return value;
    },

    /** Replace entire store value (clearer API) */
    setRaw(newValue: T) {
      const oldValue = value;
      if (!equals(value, newValue)) {
        value = newValue;
        notify(oldValue);
        persistToStorage();
      }
    },

    /** Reset to initial or provided value */
    reset(resetValue?: T) {
      const oldValue = value;
      const newValue = resetValue ?? initialValue;
      if (!equals(value, newValue)) {
        value = newValue;
        notify(oldValue);
        persistToStorage();
      }
    },

    set(pathOrValue: string | any, newValue?: any) {
      const oldValue = value;

      if (newValue === undefined) {
        // replace entire store value
        if (!equals(value, pathOrValue)) {
          value = pathOrValue;
          notify(oldValue);
          persistToStorage();
        }
      } else {
        // update a specific path
        const updatedValue = setByPath(value, pathOrValue, newValue);
        // Use configured equals function for consistency
        if (!equals(value, updatedValue)) {
          value = updatedValue;
          notify(oldValue, pathOrValue);
          persistToStorage();
        }
      }
    },

    subscribe(listener) {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    },
  };
};

```

./src/webstorage/client/index.ts:
```
import { WebStorageProvider } from "../isomporphic/memory.js";
import type {
  PersistenceProviderType,
  PersistenceProviderImpl,
  PersistenceProviderOptions,
} from "../types.js";

/** returns the default persistence provider for each runtime environment */
export const getPersistenceProvider = <T>(
  provider: PersistenceProviderType,
  _options?: PersistenceProviderOptions,
): PersistenceProviderImpl<T> => {
  switch (provider) {
    case "session":
      return new WebStorageProvider<T>(window.sessionStorage);
    case "local":
      return new WebStorageProvider<T>(window.localStorage);
  }
  return new WebStorageProvider<T>(); // memory
};

```

./src/webstorage/index.ts:
```
import type {
  PersistenceProviderType,
  PersistenceProviderImpl,
  PersistenceProviderOptions,
} from "./types.js";
import { getPersistenceProvider as getPersistenceProviderClient } from "./client/index.js";
import { getPersistenceProvider as getPersistenceProviderServer } from "./server/index.js";
import { isServer } from "./runtime.js";

export type {
  PersistenceProviderType,
  PersistenceProviderOptions,
} from "./types.js";

/** returns the persistence provider (isomorphic) */
export const webstorage = <T>(
  provider: PersistenceProviderType = "local",
  options?: PersistenceProviderOptions,
): PersistenceProviderImpl<T> => {
  if (isServer()) {
    return getPersistenceProviderServer(provider, options);
  } else {
    return getPersistenceProviderClient(provider, options);
  }
};

export * from "./types.js";

```

./src/webstorage/isomporphic/generic.ts:
```
/** The web storage API with a generic twist */
export interface GenericLocalStorage<T> {
  /**
   * Removes all key/value pairs, if there are any.
   *
   * Dispatches a storage event on Window objects holding an equivalent Storage object.
   */
  clear(): void;

  /** Returns the current value associated with the given key, or null if the given key does not exist. */
  getItem(key: string): T | null;

  /**
   * Removes the key/value pair with the given key, if a key/value pair with the given key exists.
   *
   * Dispatches a storage event on Window objects holding an equivalent Storage object.
   */
  removeItem(key: string): void;

  /**
   * Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously.
   *
   * Throws a "QuotaExceededError" DOMException exception if the new value couldn't be set. (Setting could fail if, e.g., the user has disabled storage for the site, or if the quota has been exceeded.)
   *
   * Dispatches a storage event on Window objects holding an equivalent Storage object.
   */
  setItem(key: string, value: T): void;
}

```

./src/webstorage/isomporphic/index.ts:
```
export * from "./memory.js";
export * from "./generic.js";

```

./src/webstorage/isomporphic/memory.ts:
```
import type { PersistenceProviderImpl } from "../types.js";
import type { GenericLocalStorage } from "./generic.js";
import type { MiddlewareFn } from "../types.js";

export type MemoryProviderOptions = {};

export const newInMemoryGenericStorageBackend = <
  T = string,
>(): GenericLocalStorage<T> => {
  const cache = new Map<string, T>();
  return {
    clear: (): void => {
      cache.clear();
    },

    getItem: (key: string): T | null => {
      return cache.get(String(key)) ?? null;
    },

    removeItem: (key: string): void => {
      cache.delete(String(key));
    },

    setItem: (key: string, value: T): void => {
      cache.set(String(key), value);
    },
  };
};

/** global in-memory storage backend */
export const memory = newInMemoryGenericStorageBackend();

/** a simple, serverless and high-performance key/value storage engine  */
export class WebStorageProvider<T> implements PersistenceProviderImpl<T> {
  protected storage: GenericLocalStorage<string>;

  constructor(storage?: GenericLocalStorage<string>) {
    this.storage = storage || memory;
  }

  get(key: string, defaultValue: T, middlewareFn?: MiddlewareFn<T>): T {
    const rawValue = this.storage.getItem(key);

    if (rawValue === null) return defaultValue;

    let value: T;
    try {
      value = JSON.parse(rawValue);
    } catch {
      // Handle corrupted/invalid JSON gracefully
      return defaultValue;
    }

    if (middlewareFn) {
      value = middlewareFn(key, value);
    }
    return value;
  }

  set(key: string, value: T, middlewareFn?: MiddlewareFn<T>): void {
    if (middlewareFn) {
      value = middlewareFn(key, value);
    }
    this.storage.setItem(key, JSON.stringify(value));
  }

  remove(key: string): void {
    this.storage.removeItem(key);
  }

  removeAll(): void {
    this.storage.clear();
  }

  get backendApi(): GenericLocalStorage<string> {
    return this.storage;
  }
}

export interface MemoryStorage<T> extends PersistenceProviderImpl<T> {
  backendApi: Omit<Omit<Storage, "key">, "length">;
}

export interface WebStorage<T> extends PersistenceProviderImpl<T> {
  backendApi: Storage;
}

```

./src/webstorage/runtime.ts:
```
//export const isBrowser = (): boolean => typeof window !== "undefined" && typeof window.document !== "undefined";

export const isServer = (): boolean =>
  typeof window === "undefined" || typeof window.document === "undefined";

//export const isWebWorker = (): boolean => typeof self === "object" && self.constructor?.name === "DedicatedWorkerGlobalScope";

```

./src/webstorage/server/index.ts:
```
import { WebStorageProvider } from "../isomporphic/memory.js";
import type {
  PersistenceProviderType,
  PersistenceProviderImpl,
  PersistenceProviderOptions,
} from "../types.js";

/** returns the default persistence provider for each runtime environment */
export const getPersistenceProvider = <T>(
  _provider: PersistenceProviderType,
  _options?: PersistenceProviderOptions,
): PersistenceProviderImpl<T> => {
  return new WebStorageProvider<T>();
};

```

./tsconfig.json:
```
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"],
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["vitest/globals"],
    "jsx": "react-jsx",
    "jsxImportSource": "defuss",
    "sourceMap": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

```

./vitest.bench.config.ts:
```
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["**/*.bench.ts"],
        environment: "node", // Benchmarks usually run faster/cleaner in Node if DOM isn't strictly required, but Store supports both. We'll verify both if possible, but Node is fine for pure JS store logic.
    },
});

```

./vitest.browser-bench.config.ts:
```
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

/**
 * Browser-based benchmark configuration using Playwright with Chrome headless.
 * Run with: pnpm bench:browser
 *
 * NOTE: This separates benchmarks from standard tests to avoid pollution.
 */
export default defineConfig({
    esbuild: {
        target: "es2022",
    },
    resolve: {
        conditions: ["benchmark", "browser", "development", "default", "module"],
    },
    test: {
        browser: {
            enabled: true,
            provider: playwright(),
            instances: [
                { browser: "chromium" }
            ],
            headless: true,
            // Enable CDP support for performance metrics
            // We'll access the CDP session manually in the tests
        },
        benchmark: {
            include: ["**/*.browser-bench.{ts,tsx}"],
            exclude: ["**/node_modules/**", "**/dist/**"],
            // A bit more time for large DOM operations if needed

        },
        // We might need longer timeouts for big benchmark suites
        testTimeout: 20000,
        hookTimeout: 20000,
        teardownTimeout: 20000,
        include: ["**/*.browser-bench.{ts,tsx}"],
        exclude: ["**/kitchensink/**", "**/node_modules/**", "**/dist/**"],
        globals: true,
    },
});

```

./vitest.browser.config.ts:
```
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

/**
 * Browser-based test configuration using Playwright with Chrome headless.
 * Run with: pnpm test:browser
 * 
 * Excludes SSR-specific tests that require happy-dom's virtual DOM.
 */
export default defineConfig({
    plugins: [],
    test: {
        browser: {
            enabled: true,
            provider: playwright(),
            instances: [
                { browser: "chromium" }
            ],
            headless: true,
        },
        testTimeout: 60000,
        include: ["**/*.test.{ts,tsx}"],
        exclude: [
            "**/kitchensink/**",
            "**/node_modules/**",
            "**/dist/**",
            // SSR-specific tests that don't work in real browser
            "**/server.test.tsx",
            "**/dom-ssr.test.tsx",
            // DOMContentLoaded tests that don't work (already fired in browser)
            "**/ready.test.ts",
            // jQuery compat uses node:fs and happy-dom APIs
            "**/jquery-compat/**",
        ],
        clearMocks: true,
        globals: true,
    },
});

```

./vitest.config.ts:
```
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [],
  test: {
    environment: "happy-dom",
    testTimeout: 290000, // 290 seconds per test
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.md", "**/kitchensink/*"],
    clearMocks: true,
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*"],
      exclude: ["**/*.{md,html}"]
    },
  },
});

```


</full-context-dump>
