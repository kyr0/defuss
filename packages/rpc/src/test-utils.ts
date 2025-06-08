import { ExpressRpcServer } from "./express-server.js";
import { createRpcServer, clearRpcServer } from "./server.js";
import type { ApiNamespace } from "./types.d.js";

/**
 * Test utility to create a temporary RPC server for testing
 */
export class TestRpcServer {
  private server: ExpressRpcServer | null = null;
  private serverInfo: { port: number; url: string } | null = null;

  async start(
    apiNamespace: ApiNamespace,
    options: { port?: number; basePath?: string } = {},
  ) {
    // Register the API namespace
    createRpcServer(apiNamespace);

    // Create and start the Express server
    this.server = new ExpressRpcServer(options);
    this.serverInfo = await this.server.start();

    return this.serverInfo;
  }

  async stop() {
    if (this.server) {
      await this.server.stop();
      this.server = null;
      this.serverInfo = null;
    }

    // Clean up RPC classes using clearRpcServer
    clearRpcServer();
  }

  getUrl(): string {
    if (!this.serverInfo) {
      throw new Error("Server not started");
    }
    return this.serverInfo.url;
  }

  getPort(): number {
    if (!this.serverInfo) {
      throw new Error("Server not started");
    }
    return this.serverInfo.port;
  }

  async call(className: string, methodName: string, args: any[] = []) {
    if (!this.serverInfo) {
      throw new Error("Server not started");
    }

    const response = await fetch(`${this.serverInfo.url}/rpc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        className,
        methodName,
        args,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`RPC call failed: ${error.error || response.statusText}`);
    }

    const result = await response.text();
    const { DSON } = await import("defuss-dson");
    return DSON.parse(result);
  }

  async getSchema() {
    if (!this.serverInfo) {
      throw new Error("Server not started");
    }

    const response = await fetch(`${this.serverInfo.url}/rpc/schema`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Schema request failed: ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Helper function to create a test server with automatic cleanup
 * Usage in tests:
 *
 * ```typescript
 * import { withTestServer } from './test-utils.js';
 *
 * it('should work', async () => {
 *   await withTestServer({ MyApi }, async (server) => {
 *     const result = await server.call('MyApi', 'myMethod', ['arg1']);
 *     expect(result).toBe('expected');
 *   });
 * });
 * ```
 */
export async function withTestServer<T>(
  apiNamespace: ApiNamespace,
  callback: (server: TestRpcServer) => Promise<T>,
  options: { port?: number; basePath?: string } = {},
): Promise<T> {
  const server = new TestRpcServer();

  try {
    await server.start(apiNamespace, options);
    return await callback(server);
  } finally {
    await server.stop();
  }
}
