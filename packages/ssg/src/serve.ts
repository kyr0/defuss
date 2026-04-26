import { existsSync } from "node:fs";
import { join } from "node:path";

import { express, startServer } from "defuss-express";

import { readConfig } from "./config.js";
import { registerEndpoints } from "./endpoints.js";
import {
  createWebRequest,
  readIncomingBody,
  sendWebResponse,
} from "./http-adapter.js";
import { handleRpcRequest, initializeRpc } from "./rpc.js";
import type {
  EndpointRouteRegistrar,
  ServeOptions,
  Status,
} from "./types.js";
import { validateProjectDir } from "./validation.js";

const createEndpointRouteRegistrar = (
  app: Record<string, unknown>,
): EndpointRouteRegistrar => ({
  register(method, route, handler) {
    const registerRoute = (app as Record<string, Function>)[method];
    if (typeof registerRoute !== "function") {
      throw new Error(
        `Unsupported route method for production adapter: ${method}`,
      );
    }

    registerRoute.call(app, route, async (req: any, res: any) => {
      try {
        const body = await readIncomingBody(req);
        const request = createWebRequest(req, body);
        const response = await handler({
          request,
          params: (req.params ?? {}) as Record<string, string | undefined>,
        });
        await sendWebResponse(res, response, request.method === "HEAD");
      } catch (error) {
        console.error(
          `[defuss-ssg] Endpoint adapter error for ${method.toUpperCase()} ${route}:`,
          error,
        );
        if (!res.headersSent) {
          res.status?.(500);
          res.end?.("Internal Server Error");
        }
      }
    });
  },
});

const createRpcHandler = () => {
  return async (req: any, res: any) => {
    try {
      const rawBody = await readIncomingBody(req);
      const request = createWebRequest(req, rawBody);
      const response = await handleRpcRequest({
        request,
      });

      await sendWebResponse(res, response, request.method === "HEAD");
    } catch (error) {
      console.error("[defuss-ssg] RPC adapter error:", error);
      if (!res.headersSent) {
        res.status?.(500);
        res.end?.("Internal Server Error");
      }
    }
  };
};

/**
 * Serve an already-built defuss-ssg project with defuss-express.
 */
export const serve = async ({
  projectDir,
  debug = false,
  port = 3000,
  workers = 1,
}: ServeOptions): Promise<Status> => {
  const projectDirStatus = validateProjectDir(projectDir);
  if (projectDirStatus.code !== "OK") return projectDirStatus;

  const config = await readConfig(projectDir, debug);
  const outputDir = join(projectDir, config.output);

  if (!existsSync(outputDir)) {
    return {
      code: "MISSING_BUILD_OUTPUT",
      message: `Build output not found in ${outputDir}. Run defuss-ssg build first.`,
    };
  }

  const app = express({ threads: 0 });
  app.disable?.("x-powered-by");

  await registerEndpoints(
    createEndpointRouteRegistrar(app as Record<string, unknown>),
    projectDir,
    config,
    debug,
  );

  const rpcActive = await initializeRpc(projectDir, config, debug);
  if (rpcActive) {
    const rpcHandler = createRpcHandler();
    app.post?.("/rpc", rpcHandler);
    app.post?.("/rpc/schema", rpcHandler);
  }

  const staticMiddleware = express.static?.(outputDir);
  if (staticMiddleware) {
    app.use?.(staticMiddleware);
  }

  try {
    await startServer(app, {
      port,
      workers,
    });
  } catch (error) {
    return {
      code: "SERVER_START_FAILED",
      message:
        error instanceof Error
          ? error.message
          : "Failed to start production server",
    };
  }

  console.log(`defuss-ssg production server running at http://localhost:${port}`);
  console.log(`Serving static output from ${outputDir}`);

  return {
    code: "OK",
    message: `Serving ${outputDir}`,
  };
};