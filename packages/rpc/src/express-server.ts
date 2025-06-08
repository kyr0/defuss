import express from "express";
import type { Request, Response, Express } from "express";
import { rpcRoute } from "./server.js";

export interface ExpressRpcServerOptions {
  port?: number;
  basePath?: string;
}

export class ExpressRpcServer {
  private app: Express;
  private server: any;
  private port: number;
  private basePath: string;

  constructor(options: ExpressRpcServerOptions = {}) {
    this.app = express();
    this.port = options.port || 0; // 0 means random available port
    this.basePath = options.basePath || "";

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    // Parse JSON bodies
    this.app.use(express.json({ limit: "10mb" }));

    // CORS middleware for testing
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
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
    this.app.get(`${this.basePath}/health`, (req: Request, res: Response) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // RPC endpoint - forward to the existing rpcRoute handler
    this.app.post(`${this.basePath}/rpc`, this.handleRpcRequest.bind(this));

    // RPC schema endpoint - forward to the existing rpcRoute handler
    this.app.post(
      `${this.basePath}/rpc/schema`,
      this.handleRpcRequest.bind(this),
    );
  }

  private async handleRpcRequest(req: Request, res: Response) {
    try {
      // Create a mock Astro Request object from Express request
      const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
      const astroRequest = new Request(url, {
        method: req.method,
        headers: req.headers as Record<string, string>,
        body:
          req.method !== "GET" && req.method !== "HEAD"
            ? JSON.stringify(req.body)
            : undefined,
      });

      // Call the existing rpcRoute handler
      const response = await rpcRoute({ request: astroRequest } as any);

      // Convert Response to Express response
      const responseText = await response.text();
      const contentType =
        response.headers.get("content-type") || "application/json";

      res
        .status(response.status)
        .set("content-type", contentType)
        .send(responseText);
    } catch (error) {
      console.error("RPC request error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async start(): Promise<{ port: number; url: string }> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (err?: Error) => {
        if (err) {
          reject(err);
          return;
        }

        const address = this.server.address();
        const actualPort =
          typeof address === "object" && address ? address.port : this.port;
        const url = `http://localhost:${actualPort}${this.basePath}`;

        console.log(`RPC server running on ${url}`);
        resolve({ port: actualPort, url });
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err?: Error) => {
          if (err) {
            reject(err);
          } else {
            console.log("RPC server stopped");
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  getApp(): Express {
    return this.app;
  }

  getPort(): number {
    const address = this.server?.address();
    return typeof address === "object" && address ? address.port : this.port;
  }

  getUrl(): string {
    const port = this.getPort();
    return `http://localhost:${port}${this.basePath}`;
  }
}

// Helper function to create and start a server quickly
export async function createExpressRpcServer(
  options: ExpressRpcServerOptions = {},
) {
  const server = new ExpressRpcServer(options);
  const info = await server.start();
  return { server, ...info };
}
