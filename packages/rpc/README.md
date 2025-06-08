<h1 align="center">

<img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss-rpc</code>
</p>

<sup align="center">

Remote Procedure Call (RPC)

</sup>

</h1>

> `defuss-rpc` is a tiny but powerful RPC library for building type-safe APIs in JavaScript and TypeScript. It enables seamless client-server communication with automatic type safety and minimal setup.

**💡 Can you imagine?** The whole codebase is written in only ~180 Lines of Code, providing full-featured RPC capabilities including type-safe client generation, server-side method routing, and automatic serialization using `defuss-dson`.

## ✨ Features

- ✅ **Type-safe**: Full TypeScript support with automatic client type generation
- ✅ **Minimal setup**: Just define your API classes and go
- ✅ **Automatic serialization**: Uses `defuss-dson` for robust data serialization
- ✅ **Proxy-based client**: Dynamic client generation with method interception
- ✅ **Schema introspection**: Automatic API schema generation and discovery
- ✅ **Authentication support**: Built-in guard function support for access control
- ✅ **Framework agnostic**: Works with Astro, Express.js, and any framework that supports Request/Response
- ✅ **Zero runtime dependencies**: Tiny bundle size with minimal overhead

<h3 align="center">

Getting Started

</h3>

#### 1. Install `defuss-rpc`:

```bash
pnpm install defuss-rpc
```

#### 2. Define your API classes:

```ts
// <root>/service/FooApi.ts
export class FooApi {
  async getFoo(id: string) {
    // Your implementation here
    return { id, name: "Foo Item", data: "..." };
  }
  
  async createFoo(item: { name: string; data: string }) {
    // Your implementation here
    return { id: "new-id", ...item };
  }
}

// <root>/service/BarApi.ts
export class BarApi {
  async baz(value: string) {
    // Your implementation here
    return { result: `Processed: ${value}` };
  }
}
```

#### 3. Set up the server and API registry:

##### Create the RPC API definition
```ts
// <root>/rpc.ts - Shared RPC API definition
import { createRpcServer, setGuardFunction } from "defuss-rpc/server";
import { FooApi } from "./service/FooApi.js";
import { BarApi } from "./service/BarApi.js";

// server-side RPC API definition
export const RpcApi = {
  FooApi,
  BarApi,
};

setGuardFunction(async (request) => {
  const payload = await request.json();
  console.log("Guard function called with request:", payload);
  // Implement your guard logic here
  return true;
});

createRpcServer(RpcApi); // expose the RPC API

// client-side RPC API type (for type safety)
export type RpcApi = typeof RpcApi;
```

##### Create the RPC route handler (Astro)
```ts
// pages/rpc/[...all].ts - Astro catch-all route handler
import { rpcRoute } from "defuss-rpc/server";
import "../../rpc.js"; // Import to register the RPC API

// Export the RPC route handler
export const POST = rpcRoute;
export const prerender = false;
```

#### 4. Use on the client:

```ts
// <root>/component/some-component.ts
import { getRpcClient } from "defuss-rpc/client";
import type { RpcApi } from "../rpc.js";

// Get the RPC client with full type safety
// For Astro (default):
const rpc = await getRpcClient<RpcApi>();

// For Express.js or custom base URL:
// const rpc = await getRpcClient<RpcApi>("http://localhost:3000");

// Create API instances of the services, just as if we were on the server and use them
const fooApi = new rpc.FooApi();
const barApi = new rpc.BarApi();

// Call methods with full TypeScript support
const foo = await fooApi.getFoo("123");
const result = await barApi.baz("test value");

console.log(foo.name); // TypeScript knows this is a string
console.log(result.result); // Fully typed response
```

<h3 align="center">

Advanced Features

</h3>

#### Authentication & Guards

Protect your RPC endpoints with guard functions:

```ts
// <root>/rpc.ts - Set up guard function for authentication
import { setGuardFunction, type RpcCallDescriptor } from "defuss-rpc/server";

setGuardFunction(async (request: Request) => {
  const authHeader = request.headers.get("authorization");
  const call: RpcCallDescriptor = await request.json();

  // call.className, call.methodName, call.args can be used to check permissions
  console.log("Guard function called with request:", call);
  // Your authentication logic here - e.g. check JWT token, look up user in database and check for ACL
  return true; // Return true to allow access, false to deny (results in 403 Forbidden)
});
```

#### Schema Introspection

The RPC server automatically provides schema information:

```ts
import { getSchema } from "defuss-rpc/client";

const schema = await getSchema(); // btw. it caches the schema for the page lifetime
console.log(schema); // Array of class schemas with methods and properties
```


##### Alternative: Use with Express.js
```ts
// server.ts - Express.js server setup
import express from "express";
import { rpcRoute } from "defuss-rpc/server";
import "./rpc.js"; // Import to register the RPC API

const app = express();
const port = 3000;

// Parse JSON bodies
app.use(express.json());

// Add CORS headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// RPC endpoint handler
app.post("/rpc", async (req, res) => {
  try {
    // Convert Express request to standard Request object
    const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const request = new Request(url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: JSON.stringify(req.body),
    });

    // Use the defuss-rpc route handler
    const response = await rpcRoute({ request } as any);
    
    // Send response back to Express
    const responseText = await response.text();
    res.status(response.status)
       .set("content-type", response.headers.get("content-type") || "application/json")
       .send(responseText);
  } catch (error) {
    console.error("RPC request error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// RPC schema endpoint
app.post("/rpc/schema", async (req, res) => {
  try {
    const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const request = new Request(url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: JSON.stringify(req.body),
    });

    const response = await rpcRoute({ request } as any);
    const responseText = await response.text();
    res.status(response.status)
       .set("content-type", response.headers.get("content-type") || "application/json")
       .send(responseText);
  } catch (error) {
    console.error("RPC schema error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

app.listen(port, () => {
  console.log(`RPC server running on http://localhost:${port}`);
});
```

<h3 align="center">

🚀 How does `defuss-rpc` work?

</h3>

Inside this package, you'll find the following relevant folders and files:

```text
/
├── src/client.ts     # Client-side RPC implementation
├── src/server.ts     # Server-side RPC implementation  
├── src/types.d.ts    # TypeScript type definitions
├── tsconfig.json
├── LICENSE
├── package.json
```

#### Architecture

1. **Server-side**: 
   - Classes are registered with `createRpcServer()`
   - The `rpcRoute` handler processes incoming RPC calls
   - Method calls are dynamically routed to the appropriate class instances
   - Results are serialized using `defuss-dson`

2. **Client-side**:
   - `getRpcClient()` creates a type-safe proxy-based client
   - Method calls are intercepted and sent as HTTP requests
   - Responses are automatically deserialized back to JavaScript objects
   - Full TypeScript intellisense and type checking

3. **Type Safety**:
   - Share your API class definitions between client and server
   - The client provides the same interface as your server classes
   - Compile-time type checking ensures method signatures match

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command       | Action                                           |
| :------------ | :----------------------------------------------- |
| `npm build`   | Build a new version of the RPC package.         |
| `npm test`    | Run the test suite.                             |
| `npm publish` | Publish a new version of the `defuss-rpc` package. |

---

<img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_comic.png" />

<caption><i><b>Come visit us on defuss island!</b></i></caption>