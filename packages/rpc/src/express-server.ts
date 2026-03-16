import { express, type ExpressRequest, type ExpressResponse, type ExpressNextFunction } from "defuss-express";
import { rpcRoute } from "./server.js";

export interface ExpressRpcServerOptions {
  port?: number;
  basePath?: string;
  jsonSizeLimit?: string;
  /**
   * Value for the `Access-Control-Allow-Origin` response header.
   *
   * - Pass a single origin string: `"https://app.example.com"`
   * - Pass an array to allow multiple origins: they are joined as a comma-separated string.
   * - Defaults to `"*"` (permissive, suitable for development and internal services).
   */
  corsOrigin?: string | string[];
}

/**
 * Express adapter that bridges an `ultimate-express` (uWebSockets.js) HTTP server to the
 * framework-agnostic `rpcRoute` handler.
 *
 * Converts each incoming Express request into a Fetch API `Request` so that `rpcRoute`
 * — designed for Astro's SSR adapter — can process it without modification, then maps the
 * resulting Fetch `Response` back to an Express response.
 *
 * **Endpoints exposed:**
 * - `GET/POST  {basePath}/health`      → liveness check `{ status: "ok", timestamp }`.
 * - `POST      {basePath}/rpc`         → dispatches an RPC call via `rpcRoute`.
 * - `any       {basePath}/rpc/schema`  → returns the registered namespace schema.
 */
export class ExpressRpcServer {
  private app: ReturnType<typeof express>;
  private server: ReturnType<ReturnType<typeof express>["listen"]> | null;
  private port: number;
  private basePath: string;
  private jsonSizeLimit: string;
  private corsOrigin: string;

  constructor(options: ExpressRpcServerOptions = {}) {
    this.app = express({ threads: 0 });
    this.server = null;
    this.port = options.port || 0; // 0 means random available port
    this.basePath = options.basePath || "";
    this.jsonSizeLimit = options.jsonSizeLimit || "10mb";
    this.corsOrigin = Array.isArray(options.corsOrigin)
      ? options.corsOrigin.join(",")
      : (options.corsOrigin ?? "*");

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    // Text body parser keeps the raw DSON string intact so typed arrays survive deserialization.
    this.app.use(express.text({ limit: this.jsonSizeLimit, type: "application/json" }));

    // CORS — applied to every response, including pre-flight OPTIONS requests.
    this.app.use((req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
      res.header("Access-Control-Allow-Origin", this.corsOrigin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization",
      );

      if (req.method === "OPTIONS") {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.all(`${this.basePath}/health`, (_req: ExpressRequest, res: ExpressResponse) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // RPC endpoint - forward to the existing rpcRoute handler
    this.app.all(`${this.basePath}/rpc`, this.handleRpcRequest.bind(this));

    // RPC schema endpoint - forward to the existing rpcRoute handler
    this.app.all(
      `${this.basePath}/rpc/schema`,
      this.handleRpcRequest.bind(this),
    );
  }

  /**
   * Adapts an Express request into a Fetch API `Request`, delegates to `rpcRoute`,
   * and maps the resulting Fetch `Response` back to the Express response.
   *
   * Body forwarding: `express.text()` middleware gives us the raw DSON string in
   * `req.body`. We forward it as-is so `rpcRoute` can `DSON.parse()` it and
   * reconstruct typed arrays like `Uint8Array`.
   */
  private async handleRpcRequest(req: ExpressRequest, res: ExpressResponse) {
    try {
      // Reconstruct the full request URL so rpcRoute can inspect the pathname.
      const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
      const astroRequest = new Request(url, {
        method: req.method,
        headers: req.headers as Record<string, string>,
        body:
          req.method !== "GET" && req.method !== "HEAD" && typeof req.body === "string" && req.body
            ? req.body
            : undefined,
      });

      // Call the existing rpcRoute handler
      const response = await rpcRoute({ request: astroRequest } as any);

      const contentType =
        response.headers.get("content-type") || "application/json";

      if (contentType === "application/x-ndjson" && response.body) {
        // Stream NDJSON responses chunk-by-chunk instead of buffering
        res.status(response.status).set("content-type", contentType);
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } else {
        // Buffer and send the full response for non-streaming content
        const responseText = await response.text();
        res
          .status(response.status)
          .set("content-type", contentType)
          .send(responseText);
      }
    } catch (error) {
      console.error("RPC request error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Start listening for HTTP connections.
   *
   * @returns `{ port, url }` — the port the server is bound to and the full base URL.
   *   If `options.port` was `0` (the default), the OS assigns a random available port;
   *   the actual bound port is reflected in the returned value.
   */
  async start(): Promise<{ port: number; url: string }> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, (listenPort: number) => {
        this.port = listenPort;
        const url = `http://localhost:${listenPort}${this.basePath}`;

        console.log(`RPC server running on ${url}`);
        resolve({ port: listenPort, url });
      });
    });
  }

  /**
   * Stop the HTTP server.
   *
   * Uses uWebSockets.js' synchronous `close()` — in-flight requests are not drained.
   * Resolves immediately after the listening socket is released.
   */
  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log("RPC server stopped");
    }
  }

  /** Returns the underlying `ultimate-express` app instance for custom route registration. */
  getApp(): ReturnType<typeof express> {
    return this.app;
  }

  /** Returns the port the server is currently bound to (0 if not yet started). */
  getPort(): number {
    return this.port;
  }

  /** Returns the full base URL of the server (e.g. `"http://localhost:3210"`). */
  getUrl(): string {
    const port = this.getPort();
    return `http://localhost:${port}${this.basePath}`;
  }
}

/**
 * Convenience helper — creates an `ExpressRpcServer`, starts it, and returns the instance
 * together with the bound port and base URL.
 *
 * @example
 * ```ts
 * import { createExpressRpcServer } from "defuss-rpc/express";
 * import { createRpcServer } from "defuss-rpc/server";
 * import { UserApi } from "./api.ts";
 *
 * createRpcServer({ UserApi });
 * const { server, port, url } = await createExpressRpcServer({ port: 3210 });
 * console.log(`RPC listening on ${url}`);
 * ```
 *
 * @param options - Same options as `new ExpressRpcServer(options)`.
 * @returns `{ server, port, url }`
 */
export async function createExpressRpcServer(
  options: ExpressRpcServerOptions = {},
) {
  const server = new ExpressRpcServer(options);
  const info = await server.start();
  return { server, ...info };
}
