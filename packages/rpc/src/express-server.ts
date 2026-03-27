import {
  createGzip,
  gunzipSync,
  gzipSync,
  inflateSync,
  constants as zlibConstants,
} from "node:zlib";
import {
  express,
  type ExpressRequest,
  type ExpressResponse,
  type ExpressNextFunction,
} from "defuss-express";
import { rpcRoute } from "./server.js";

export interface ExpressRpcServerOptions {
  port?: number;
  /**
   * Host/IP the server should bind to.
   *
   * - `"localhost"` (default) — only reachable from the local machine.
   * - `"0.0.0.0"` — listen on all network interfaces (useful for Docker / LAN access).
   * - Any valid IPv4/IPv6 address.
   */
  host?: string;
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
  /**
   * Enable transport-level gzip compression for RPC responses.
   *
   * - `true` (default): compress with `Z_BEST_SPEED` (level 1) — optimised for
   *   latency-sensitive streaming (e.g. real-time PCM audio over NDJSON).
   * - `false`: disable compression entirely.
   * - `{ level: 1–9 }`: enable with a custom zlib compression level.
   *
   * Streaming (NDJSON) responses use `Z_SYNC_FLUSH` so each frame is immediately
   * decompressible by the client.  Browsers transparently decompress
   * `Content-Encoding: gzip` in `fetch()`, so no client-side changes are needed.
   *
   * When enabled the server also accepts gzip / deflate-compressed **request**
   * bodies (`Content-Encoding: gzip | deflate`) — useful for uploading large
   * binary payloads such as PCM audio chunks.
   */
  compression?: boolean | { level?: number };
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
  private host: string;
  private basePath: string;
  private jsonSizeLimit: string;
  private corsOrigin: string;
  private compression: { enabled: boolean; level: number };

  constructor(options: ExpressRpcServerOptions = {}) {
    this.app = express({ threads: 0 });
    this.server = null;
    this.port = options.port || 0; // 0 means random available port
    this.host = options.host || "localhost";
    this.basePath = options.basePath || "";
    this.jsonSizeLimit = options.jsonSizeLimit || "1mb";
    this.corsOrigin = Array.isArray(options.corsOrigin)
      ? options.corsOrigin.join(",")
      : (options.corsOrigin ?? "*");

    // Resolve compression config: true → level 1, false → disabled, { level } → custom.
    const comp = options.compression ?? true;
    if (comp === false) {
      this.compression = { enabled: false, level: 0 };
    } else if (comp === true) {
      this.compression = { enabled: true, level: 1 }; // Z_BEST_SPEED
    } else {
      this.compression = { enabled: true, level: comp.level ?? 1 };
    }

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    // Phase 2: Decompress gzip / deflate request bodies before the text parser runs.
    // When a client sends `Content-Encoding: gzip` (e.g. compressed PCM upload),
    // we transparently inflate the body so `express.text()` receives plain text.
    if (this.compression.enabled) {
      this.app.use(
        (
          req: ExpressRequest,
          _res: ExpressResponse,
          next: ExpressNextFunction,
        ) => {
          const encoding = (req.headers as Record<string, string>)[
            "content-encoding"
          ];
          if (!encoding) return next();

          try {
            const rawBody =
              typeof req.body === "string"
                ? Buffer.from(req.body, "latin1")
                : req.body instanceof Buffer || req.body instanceof Uint8Array
                  ? Buffer.from(req.body)
                  : null;

            if (rawBody && rawBody.length > 0) {
              const decompressed = encoding.includes("gzip")
                ? gunzipSync(rawBody)
                : encoding.includes("deflate")
                  ? inflateSync(rawBody)
                  : null;

              if (decompressed) {
                (req as any).body = decompressed.toString("utf-8");
                delete (req.headers as Record<string, string>)[
                  "content-encoding"
                ];
              }
            }
          } catch (_err) {
            // If decompression fails, fall through — the text parser will handle it
            // (likely producing a parse error, which is the correct behaviour).
          }
          next();
        },
      );
    }

    // Text body parser keeps the raw DSON string intact so typed arrays survive deserialization.
    this.app.use(
      express.text({ limit: this.jsonSizeLimit, type: "application/json" }),
    );

    // CORS — applied to every response, including pre-flight OPTIONS requests.
    this.app.use(
      (
        req: ExpressRequest,
        res: ExpressResponse,
        next: ExpressNextFunction,
      ) => {
        res.header("Access-Control-Allow-Origin", this.corsOrigin);
        res.header(
          "Access-Control-Allow-Methods",
          "GET, POST, PUT, DELETE, OPTIONS",
        );
        res.header(
          "Access-Control-Allow-Headers",
          "Origin, X-Requested-With, Content-Type, Accept, Authorization, Content-Encoding",
        );

        if (req.method === "OPTIONS") {
          res.sendStatus(200);
        } else {
          next();
        }
      },
    );
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.all(
      `${this.basePath}/health`,
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
      },
    );

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
          req.method !== "GET" &&
          req.method !== "HEAD" &&
          typeof req.body === "string" &&
          req.body
            ? req.body
            : undefined,
      });

      // Call the existing rpcRoute handler
      const response = await rpcRoute({ request: astroRequest } as any);

      const contentType =
        response.headers.get("content-type") || "application/json";

      const acceptEncoding =
        (req.headers as Record<string, string>)["accept-encoding"] || "";
      const useGzip =
        this.compression.enabled && acceptEncoding.includes("gzip");

      if (contentType === "application/x-ndjson" && response.body) {
        // Stream NDJSON responses chunk-by-chunk instead of buffering.
        // When gzip is negotiated, pipe through a zlib Gzip transform with
        // Z_SYNC_FLUSH so each NDJSON frame is immediately decompressible
        // (critical for real-time audio streaming latency).
        res.status(response.status).set("content-type", contentType);

        if (useGzip) {
          res.set("content-encoding", "gzip");
          res.set("vary", "Accept-Encoding");

          const gzip = createGzip({
            level: this.compression.level,
            flush: zlibConstants.Z_SYNC_FLUSH,
          });

          gzip.on("data", (compressed: Buffer) => {
            res.write(compressed);
          });

          const reader = response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            // Write the raw NDJSON bytes into the gzip transform.
            // Z_SYNC_FLUSH ensures each write produces output immediately.
            await new Promise<void>((resolve, reject) => {
              gzip.write(value, (err) => (err ? reject(err) : resolve()));
            });
          }

          // Finalise the gzip stream and wait for all compressed output
          // (incl. the gzip trailer) to be emitted via the 'data' handler
          // before closing the HTTP response.
          await new Promise<void>((resolve, reject) => {
            gzip.on("end", () => resolve());
            gzip.on("error", reject);
            gzip.end();
          });
          res.end();
        } else {
          const reader = response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        }
      } else {
        // Buffer and send the full response for non-streaming content.
        const responseText = await response.text();

        if (useGzip && responseText.length > 1024) {
          // Compress larger buffered responses (>1 KB) to save bandwidth.
          const compressed = gzipSync(responseText, {
            level: this.compression.level,
          });
          res
            .status(response.status)
            .set("content-type", contentType)
            .set("content-encoding", "gzip")
            .set("vary", "Accept-Encoding");
          res.end(compressed);
        } else {
          res
            .status(response.status)
            .set("content-type", contentType)
            .send(responseText);
        }
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
      this.server = this.app.listen(this.port, this.host, (listenPort: number) => {
        this.port = listenPort;
        const url = `http://${this.host}:${listenPort}${this.basePath}`;

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
    return `http://${this.host}:${port}${this.basePath}`;
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
