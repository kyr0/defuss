<h1 align="center">

<img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss-rpc</code>
</p>

<sup align="center">

Remote Procedure Call (RPC)

</sup>

</h1>

> **⚠️ Runtime Requirement: Node.js only.** The RPC server uses [`uWebSockets.js`](https://github.com/uNetworking/uWebSockets.js) (via `ultimate-express`), a native addon that **requires Node.js**. It does **not** run under Bun or Deno.
>
> | | Supported Versions |
> |---|---|
> | **Node.js** | **20, 22, 24, 25** |
> | **Platforms** | macOS (x64, arm64), Linux (x64, arm64), Windows (x64) |
> | **Linux glibc** | **≥ 2.38** (Ubuntu 24.04+, Debian 13+, RHEL 9.4+) |
>
> Tests **must** be run with `bun run test` (which invokes `vitest` under Node.js). **Do not** use `bun test` — that triggers Bun's built-in test runner which cannot load the uWebSockets.js native addon.

`defuss-rpc` is a tiny but powerful RPC library for building type-safe APIs in JavaScript and TypeScript. It enables seamless client-server communication with automatic type safety, bi-directional, seamless binary data format support (via `DSON` - just pass `Uint8Array` around; uploads and downloads of TB of data are possible, including streaming and chunked transfers, progress tracking, resend, hash integrity checks, etc.), generator streaming, and minimal setup.

## ✨ Features

- ✅ **Type-safe** - Full TypeScript support with automatic client type generation
- ✅ **Classes & Modules** - Define APIs as classes (stateful) or plain objects (functional)
- ✅ **Generator Streaming** - `async *` generators stream to the client as NDJSON, consumed via `for await...of`
- ✅ **DSON Serialization** - `Date`, `Map`, `Set`, `Uint8Array`, `BigInt`, and more survive the wire
- ✅ **Vite Plugin** - Auto-starts an RPC server alongside Vite dev, with file watching and HMR
- ✅ **Astro Integration** - First-class Astro support via `defussRpc()`, with `Astro.locals.rpcEndpoint`
- ✅ **ExpressRpcServer** - Managed Express.js adapter with CORS, health check, and streaming support
- ✅ **Hook System** - Guard and result hooks on both server and client for auth, logging, and auditing
- ✅ **Schema Introspection** - Automatic API schema generation and discovery at `/rpc/schema`
- ✅ **Framework Agnostic** - Works with Astro, Vite, Express.js, or any framework that supports `Request`/`Response`

---

## Getting Started

### 1. Install

```bash
bun install defuss-rpc
```

### 2. Define your API

APIs can be **classes** (instantiated fresh per call) or **plain objects** (module-style):

```ts
// src/api/foo-api.ts - Class-based API
export class FooApi {
  async getFoo(id: string) {
    return { id, name: "Foo Item" };
  }
  async createFoo(item: { name: string }) {
    return { id: "new-id", ...item };
  }
}
```

```ts
// src/api/math-utils.ts - Module-based API
export const MathUtils = {
  async add(a: number, b: number) {
    return a + b;
  },
  async multiply(a: number, b: number) {
    return a * b;
  },
};
```

### 3. Create the RPC registry

```ts
// src/rpc.ts
import { FooApi } from "./api/foo-api.js";
import { MathUtils } from "./api/math-utils.js";

const RpcApi = { FooApi, MathUtils };
export default RpcApi;
export type RpcApi = typeof RpcApi;
```

### 4. Wire it up

Choose one of the integrations below - [Astro](#astro-integration), [Vite](#vite-plugin), or [Express](#expressrpcserver).

### 5. Use on the client

When using the Vite or Astro plugin, the RPC endpoint is **auto-registered** — just import the virtual module anywhere in your app and call `getRpcClient()` without options:

```ts
import "virtual:defuss-rpc"; // auto-registers the endpoint (import once in your entry point)
import { getRpcClient } from "defuss-rpc/client";
import type { RpcApi } from "../rpc.js";

const rpc = await getRpcClient<RpcApi>(); // endpoint is resolved automatically

// Class-based: instantiate, then call methods
const fooApi = new rpc.FooApi();
const foo = await fooApi.getFoo("123"); // fully typed

// Module-based: call functions directly
const sum = await rpc.MathUtils.add(2, 3); // 5
```

You can also read the endpoint value directly if needed:

```ts
import { rpcEndpoint } from "virtual:defuss-rpc";
console.log(rpcEndpoint); // e.g. "http://localhost:3210"
```

Or override the endpoint per-client:

```ts
const rpc = await getRpcClient<RpcApi>({ baseUrl: "http://other-host:4000" });
```

**Resolution order:** explicit `baseUrl` option → auto-registered endpoint from virtual module → `""` (current page origin).

---

## Astro Integration

The `defussRpc()` Astro integration wraps the Vite plugin and injects middleware to populate `Astro.locals.rpcEndpoint`.

```ts
// astro.config.ts
import { defineConfig } from "astro/config";
import defuss from "defuss-astro";
import node from "@astrojs/node";
import { defussRpc } from "defuss-rpc/astro.js";
import RpcApi from "./src/rpc.js";

export default defineConfig({
  integrations: [
    defuss({ include: ["src/**/*.tsx"] }),
    defussRpc({
      api: RpcApi,
      port: 0,                       // 0 = random available port
      watch: ["src/api/**/*.ts"],     // hot-reload API files
    }),
  ],
  adapter: node({ mode: "standalone" }),
});
```

Add the type to your `env.d.ts`:

```ts
declare namespace App {
  interface Locals {
    rpcEndpoint: string;
  }
}
```

No manual route handler needed - the integration handles everything.

---

## Vite Plugin

Use the Vite plugin directly in non-Astro projects:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import defuss from "defuss-vite";
import { defussRpc } from "defuss-rpc/vite-plugin.js";
import RpcApi from "./src/rpc.js";

export default defineConfig({
  plugins: [
    defuss(),
    defussRpc({
      api: RpcApi,
      port: 0,
      watch: ["src/api/**/*.ts"],
    }),
  ],
});
```

The plugin:
- Starts an `ExpressRpcServer` alongside Vite's dev server
- Provides a `virtual:defuss-rpc` module that **auto-registers** the RPC endpoint with the client
- Watches API files and hot-reloads the RPC namespace on change

```ts
// Client code — just import the virtual module and go
import "virtual:defuss-rpc";
import { getRpcClient } from "defuss-rpc/client";

const rpc = await getRpcClient<RpcApi>(); // endpoint auto-resolved
```

### Plugin Options

| Option          | Type                   | Default              | Description                                           |
| :-------------- | :--------------------- | :------------------- | :---------------------------------------------------- |
| `api`           | `ApiNamespace`         | *(required)*         | Map of namespace name → class or module               |
| `port`          | `number`               | `0`                  | Port for the RPC server (`0` = OS-assigned)           |
| `protocol`      | `"http" \| "https"`    | `"http"`             | Protocol for the endpoint URL                         |
| `host`          | `string`               | `"localhost"`        | Host/IP to bind (`"0.0.0.0"` for all interfaces)     |
| `basePath`      | `string`               | `""`                 | URL prefix for all RPC endpoints                      |
| `jsonSizeLimit` | `string`               | `"1mb"`              | Max request body size (use `upload()` for large files) |
| `corsOrigin`    | `string \| string[]`   | `"*"`                | `Access-Control-Allow-Origin` value                   |
| `watch`         | `string \| string[]`   | `["src/**/*.ts"]`    | Glob patterns for API file watching                   |
| `endpoint`      | `string`               | *(auto-constructed)* | Full RPC endpoint URL for the client to connect to    |

---

## ExpressRpcServer

A managed Express adapter that bridges `rpcRoute` to an HTTP server with CORS, health checks, and NDJSON streaming support. Used internally by the Vite plugin, but also available standalone:

```ts
import { createRpcServer } from "defuss-rpc/server";
import { ExpressRpcServer } from "defuss-rpc/express-server";
import RpcApi from "./rpc.js";

createRpcServer(RpcApi);

const server = new ExpressRpcServer({
  port: 3210,
  corsOrigin: "https://app.example.com",
});

const { port, url } = await server.start();
console.log(`RPC server running on ${url}`);

// Later:
await server.stop();
```

**Endpoints exposed:**
| Endpoint              | Description                               |
| :-------------------- | :---------------------------------------- |
| `GET/POST /health`    | Liveness check `{ status: "ok" }`         |
| `POST /rpc`           | Dispatch an RPC call                      |
| `POST /rpc/schema`    | Return the registered namespace schema    |

---

## Generator Streaming

Any `async *` generator function in your API automatically streams to the client using the NDJSON protocol. The client receives an async generator that you consume with `for await...of`.

### Server - define a generator

```ts
// src/api/chat.ts
export const ChatApi = {
  async *streamMessage(prompt: string) {
    const words = "Hello from the streaming RPC server!".split(" ");
    for (const word of words) {
      await new Promise((r) => setTimeout(r, 100));
      yield word;
    }
    return words.join(" "); // return value is the final frame
  },

  async ping() {
    return "pong";
  },
};
```

### Client - consume the stream

```ts
import { getRpcClient } from "defuss-rpc/client";

const rpc = await getRpcClient<RpcApi>();

for await (const chunk of rpc.ChatApi.streamMessage("hi")) {
  console.log(chunk); // "Hello", "from", "the", ...
}
```

### Wire protocol

Generator responses use `Content-Type: application/x-ndjson`. Each line is a DSON-serialized frame:

```jsonl
{"type":"yield","value":"Hello"}
{"type":"yield","value":"from"}
{"type":"yield","value":"the"}
{"type":"return","value":"Hello from the streaming RPC server!"}
```

If the generator throws, an error frame is sent:

```jsonl
{"type":"error","error":{"message":"Something went wrong","stack":"..."}}
```

Non-generator methods continue to use standard single-response JSON as before.

---

## Hook System

Both server and client support a hook system for cross-cutting concerns like auth, logging, and auditing.

### Server hooks

```ts
import { addHook } from "defuss-rpc/server";

// Guard hook - runs before method invocation. Return false to reject (HTTP 403).
addHook({
  phase: "guard",
  fn: async (className, methodName, args, request) => {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return false; // blocks the call
    return true;
  },
});

// Result hook - runs after successful return, before response is sent.
addHook({
  phase: "result",
  fn: async (className, methodName, args, request, result) => {
    console.log(`${className}.${methodName} returned`, result);
  },
});
```

### Client hooks

```ts
import { addHook, setHeaders } from "defuss-rpc/client";

// Set custom headers on every RPC request
setHeaders({ Authorization: "Bearer my-token" });

// Guard hook - runs before the fetch is dispatched
addHook({
  phase: "guard",
  fn: async (className, methodName, args, request) => {
    console.log(`Calling ${className}.${methodName}`);
    return true; // return false to abort the call
  },
});

// Response hook - runs after the HTTP response arrives, before body is read
addHook({
  phase: "response",
  fn: async (className, methodName, args, request, response) => {
    console.log(`Response status: ${response.status}`);
  },
});

// Result hook - runs after DSON deserialization
addHook({
  phase: "result",
  fn: async (className, methodName, args, request, response, data) => {
    console.log(`Got result:`, data);
  },
});
```

---

## Schema Introspection

The RPC server automatically generates a schema describing all registered namespaces:

```ts
import { getSchema } from "defuss-rpc/client";

const schema = await getSchema(); // cached for the page lifetime
```

Example response:

```json
[
  {
    "kind": "class",
    "className": "FooApi",
    "methods": {
      "getFoo": { "async": true, "generator": false },
      "createFoo": { "async": true, "generator": false }
    },
    "properties": {}
  },
  {
    "kind": "module",
    "moduleName": "ChatApi",
    "methods": {
      "streamMessage": { "async": true, "generator": true },
      "ping": { "async": true, "generator": false }
    }
  }
]
```

---

## DSON Transport

All RPC payloads are serialized with [`defuss-dson`](../dson/), which extends JSON to preserve types that `JSON.stringify` drops:

- `Date`, `Map`, `Set`
- `Uint8Array`, `Int32Array`, `ArrayBuffer`, and all typed arrays
- `BigInt`
- `undefined` (inside objects)

This means you can pass and return binary data (`Uint8Array`), dates, maps, and sets transparently - no manual encoding needed.

---

## Architecture

```text
/
├-- src/
│   ├-- client.ts            # Proxy-based RPC client, generator consumer
│   ├-- server.ts            # rpcRoute handler, schema generation, streaming
│   ├-- express-server.ts    # ExpressRpcServer adapter with CORS & streaming
│   ├-- vite-plugin.ts       # Vite plugin: dev server, virtual module, HMR
│   ├-- astro-integration.ts # Astro integration wrapping the Vite plugin
│   ├-- astro-middleware.ts  # Injects Astro.locals.rpcEndpoint
│   ├-- rpc-state.ts         # Shared state: config, base URL, server reference
│   └-- types.d.ts           # TypeScript type definitions
├-- tsconfig.json
├-- LICENSE
└-- package.json
```

1. **Server** - `createRpcServer()` registers namespace entries. `rpcRoute` handles dispatch: schema requests return introspection data, RPC calls route to the class instance or module function. Generator results are streamed as NDJSON via `ReadableStream`.

2. **Client** - `getRpcClient()` fetches the schema, then builds a `Proxy`-based client. Regular methods use `fetch` + DSON. Generator methods return `async function*` that reads the NDJSON stream via `getReader()` and reconstructs the yields/returns/errors.

3. **Express Adapter** - `ExpressRpcServer` converts Express requests to Fetch API `Request` objects, delegates to `rpcRoute`, and maps the response back. NDJSON responses are piped chunk-by-chunk via `res.write()`.

4. **Vite/Astro** - The Vite plugin starts an `ExpressRpcServer` in dev, exposes `rpcEndpoint` via a virtual module, and watches API files for hot-reload. The Astro integration wraps this and adds middleware for `Astro.locals.rpcEndpoint`.

## Examples

- [`examples/with-rpc-upload`](../../examples/with-rpc-upload/) - Chunked binary file upload with `Uint8Array` via DSON
- [`examples/with-rpc-chat-streaming`](../../examples/with-rpc-chat-streaming/) - AI-style chat streaming using async generators

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command       | Action                                           |
| :------------ | :----------------------------------------------- |
| `bun run build`   | Build the RPC package.                      |
| `bun run test`    | Run the test suite (**runs under Node.js via Vitest**). |
| `bun run publish` | Publish a new version of `defuss-rpc`.      |

> **Note:** `bun run test` invokes `vitest run` which executes under Node.js. Do **not** use `bun test` (Bun's built-in test runner) — the uWebSockets.js native addon is incompatible with Bun's module loader.

---

<img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_comic.png" />

<caption><i><b>Come visit us on defuss island!</b></i></caption>
