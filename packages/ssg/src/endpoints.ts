import esbuild from "esbuild";
import glob from "fast-glob";
import { join, relative, dirname } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { writeFile, readFile } from "node:fs/promises";
import type { SsgConfig } from "./types.js";

// ── Types ────────────────────────────────────────────────────────────

/** HTTP method names that endpoint files may export. */
export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
  "ALL",
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

/**
 * Context object passed to every endpoint handler function.
 * Mirrors Astro's `APIContext`.
 */
export interface EndpointContext {
  /** Dynamic route parameters (e.g. `{ id: "42" }`) */
  params: Record<string, string | undefined>;
  /** Standard Web `Request` representing the incoming request */
  request: Request;
  /** Helper to create a redirect `Response` */
  redirect: (url: string, status?: number) => Response;
}

/** Signature of an endpoint handler function (`APIRoute` in Astro). */
export type EndpointHandler = (
  context: EndpointContext,
) => Response | Promise<Response>;

/** Convenience alias matching Astro's `APIRoute` type. */
export type APIRoute = EndpointHandler;

/** Shape of a dynamically-imported endpoint module. */
export interface EndpointModule {
  GET?: EndpointHandler;
  POST?: EndpointHandler;
  PUT?: EndpointHandler;
  DELETE?: EndpointHandler;
  PATCH?: EndpointHandler;
  HEAD?: EndpointHandler;
  OPTIONS?: EndpointHandler;
  ALL?: EndpointHandler;
  /** When `true`, the endpoint is pre-rendered at build time and NOT served dynamically. */
  prerender?: boolean;
  getStaticPaths?: () =>
    | Array<{ params: Record<string, string> }>
    | Promise<Array<{ params: Record<string, string> }>>;
  [key: string]: unknown;
}

/** A fully resolved endpoint ready for building or registration. */
export interface ResolvedEndpoint {
  /** Absolute path to the source `.ts` file */
  sourceFile: string;
  /** Absolute path to the compiled `.mjs` file in `.endpoints/` */
  compiledFile: string;
  /** Route pattern derived from the file path (e.g. `/api/data.json`) */
  routePattern: string;
  /** The loaded module exports */
  module: EndpointModule;
  /** Whether the route contains dynamic `[param]` segments */
  isDynamic: boolean;
  /** Names of the dynamic parameters */
  paramNames: string[];
  /** Whether this endpoint is pre-rendered only (not served dynamically) */
  prerender: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Create a redirect `Response`.
 */
const createRedirect = (url: string, status = 302): Response =>
  new Response(null, {
    status,
    headers: { Location: url },
  });

/**
 * Derive a route pattern from an endpoint **source** file path.
 *
 * The `.ts` (or `.js`) extension is stripped; everything else is kept
 * as-is so that compound extensions like `.json.ts` become `.json`.
 *
 * Examples:
 * - `pages/api/data.json.ts`       → `/api/data.json`
 * - `pages/api/[id].json.ts`       → `/api/[id].json`
 * - `pages/feed.xml.ts`            → `/feed.xml`
 */
export const endpointFileToRoute = (
  filePath: string,
  pagesDir: string,
): string => {
  let route = relative(pagesDir, filePath)
    .replace(/\\/g, "/") // normalise to forward slashes
    .replace(/\.(ts|js)$/, ""); // strip the .ts / .js extension

  if (!route.startsWith("/")) {
    route = `/${route}`;
  }
  return route;
};

/**
 * Convert bracket-style dynamic segments to Express `:param` style.
 *
 * `"/api/[id].json"` → `"/api/:id.json"`
 */
const routeToExpressPattern = (route: string): string =>
  route.replace(/\[([^\]]+)\]/g, ":$1");

/**
 * Extract dynamic parameter names from a route pattern.
 *
 * `"/api/[category]/[id].json"` → `["category", "id"]`
 */
const extractParamNames = (route: string): string[] =>
  Array.from(route.matchAll(/\[([^\]]+)\]/g), (m) => m[1]);

// ── Discovery ────────────────────────────────────────────────────────

/**
 * Find all endpoint source files (`*.ts` / `*.js`, excluding `*.mdx`)
 * inside the given pages directory.
 */
export const discoverEndpointSourceFiles = async (
  pagesDir: string,
): Promise<string[]> => {
  if (!existsSync(pagesDir)) return [];
  // Match .ts and .js but NOT .mdx (page files)
  return glob.async(join(pagesDir, "**/*.{ts,js}"), {
    ignore: ["**/*.d.ts"],
  });
};

// ── Compilation ──────────────────────────────────────────────────────

/**
 * Compile endpoint `.ts` / `.js` source files with esbuild into the
 * `.endpoints/` directory as `.mjs` ES modules.
 *
 * The compiled code is kept separate from `dist/` so that server-side
 * source code is never exposed via static file serving.  Only the
 * *output* of pre-rendered GET handlers is written to `dist/`.
 *
 * @param sourceFiles  Absolute paths to the endpoint source files
 * @param pagesDir     Absolute path to the source pages directory
 * @param outDir       Absolute path to the `.endpoints/` directory
 * @param debug        Enable verbose logging
 * @returns Map from source file path → compiled `.mjs` file path
 */
export const compileEndpoints = async (
  sourceFiles: string[],
  pagesDir: string,
  outDir: string,
  debug = false,
): Promise<Map<string, string>> => {
  if (sourceFiles.length === 0) return new Map();

  if (debug) {
    console.log(`Compiling ${sourceFiles.length} endpoint source file(s)…`);
  }

  console.time("[endpoints] esbuild-compile");
  await esbuild.build({
    entryPoints: sourceFiles,
    format: "esm",
    bundle: true,
    platform: "node",
    target: ["esnext"],
    outdir: outDir,
    outbase: pagesDir,
    outExtension: { ".js": ".mjs" },
  });
  console.timeEnd("[endpoints] esbuild-compile");

  // Build the source→compiled mapping
  const mapping = new Map<string, string>();
  for (const src of sourceFiles) {
    const rel = relative(pagesDir, src)
      .replace(/\.(ts|js)$/, ".mjs");
    mapping.set(src, join(outDir, rel));
  }
  return mapping;
};

// ── Loading ──────────────────────────────────────────────────────────

/**
 * Dynamically import a compiled endpoint module.
 * Uses a base-64 data-URL to bust Node's import cache so that edits are
 * picked up on the next request (important in serve / dev mode).
 */
const loadEndpointModule = async (
  filePath: string,
): Promise<EndpointModule> => {
  const code = await readFile(filePath, "utf-8");
  const encoded = Buffer.from(code).toString("base64");
  const dataUrl = `data:text/javascript;base64,${encoded}`;
  return import(dataUrl);
};

// ── Resolve ──────────────────────────────────────────────────────────

/**
 * Discover, compile, load and resolve all endpoint files.
 *
 * Source `.ts`/`.js` files are compiled with esbuild into the
 * `.endpoints/` directory as `.mjs` modules.  The compiled modules
 * are then dynamically imported so we can inspect their exports.
 *
 * @param pagesDir      Absolute path to the source pages directory
 * @param endpointsDir  Absolute path to the `.endpoints/` directory
 * @param debug         Enable verbose logging
 */
export const resolveEndpoints = async (
  pagesDir: string,
  endpointsDir: string,
  debug = false,
): Promise<ResolvedEndpoint[]> => {
  const sourceFiles = await discoverEndpointSourceFiles(pagesDir);
  if (sourceFiles.length === 0) return [];

  console.time("[endpoints] compile-all");
  const mapping = await compileEndpoints(sourceFiles, pagesDir, endpointsDir, debug);
  console.timeEnd("[endpoints] compile-all");
  const endpoints: ResolvedEndpoint[] = [];

  console.time("[endpoints] load-modules");
  for (const [sourceFile, compiledFile] of mapping) {
    const routePattern = endpointFileToRoute(sourceFile, pagesDir);
    const paramNames = extractParamNames(routePattern);
    const isDynamic = paramNames.length > 0;

    if (debug) {
      console.log(
        `Endpoint: ${sourceFile} → ${compiledFile} → ${routePattern}` +
          (isDynamic ? ` (params: ${paramNames.join(", ")})` : ""),
      );
    }

    const module = await loadEndpointModule(compiledFile);
    const prerender = module.prerender === true;

    endpoints.push({
      sourceFile,
      compiledFile,
      routePattern,
      module,
      isDynamic,
      paramNames,
      prerender,
    });
  }
  console.timeEnd("[endpoints] load-modules");

  return endpoints;
};

// ── Build ────────────────────────────────────────────────────────────

/**
 * Build all endpoints during the SSG build phase.
 *
 * 1. Discovers `*.ts` / `*.js` files in the pages directory
 * 2. Compiles them with esbuild into `.mjs` ES modules in the
 *    `.endpoints/` folder (server-side code, NOT in `dist/`)
 * 3. For endpoints that export `prerender = true` **and** a `GET`
 *    handler, the handler is invoked at build time and the response
 *    body is written to a static file in `dist/`.
 *
 * Endpoints that do NOT export `prerender = true` are compiled but
 * their handlers are NOT invoked — they will be served dynamically
 * from `.endpoints/`.
 */
export const buildEndpoints = async (
  projectDir: string,
  config: SsgConfig,
  debug = false,
): Promise<void> => {
  const pagesDir = join(projectDir, config.pages);
  const outputDir = join(projectDir, config.output);
  const endpointsDir = join(projectDir, ".endpoints");
  const endpoints = await resolveEndpoints(pagesDir, endpointsDir, debug);

  if (endpoints.length === 0) return;

  const prerenderEndpoints = endpoints.filter((e) => e.prerender);
  const dynamicEndpoints = endpoints.filter((e) => !e.prerender);

  console.log(
    `Endpoints: ${endpoints.length} compiled` +
      (prerenderEndpoints.length
        ? `, ${prerenderEndpoints.length} pre-rendered`
        : "") +
      (dynamicEndpoints.length
        ? `, ${dynamicEndpoints.length} dynamic`
        : ""),
  );

  // Only pre-render endpoints that opt in with `export const prerender = true`
  for (const endpoint of prerenderEndpoints) {
    const { module, routePattern, isDynamic } = endpoint;
    const handler = module.GET;

    if (!handler) {
      if (debug) {
        console.log(
          `Endpoint ${routePattern}: prerender=true but no GET export – skipping`,
        );
      }
      continue;
    }

    // Collect the set of param combinations to generate
    let paramSets: Array<Record<string, string>> = [{}];

    if (isDynamic) {
      if (!module.getStaticPaths) {
        console.warn(
          `Dynamic endpoint ${routePattern} has no getStaticPaths() – skipping`,
        );
        continue;
      }
      const paths = await module.getStaticPaths();
      paramSets = paths.map((p) => p.params);
    }

    for (const params of paramSets) {
      // Replace [param] placeholders with concrete values
      let resolvedRoute = routePattern;
      for (const [key, value] of Object.entries(params)) {
        resolvedRoute = resolvedRoute.replace(`[${key}]`, value);
      }

      const requestUrl = `http://localhost${resolvedRoute}`;
      const context: EndpointContext = {
        params,
        request: new Request(requestUrl),
        redirect: createRedirect,
      };

      if (debug) {
        console.log(`Pre-rendering endpoint: ${resolvedRoute}`);
      }

      try {
        const response = await handler(context);

        const outputFile = join(outputDir, resolvedRoute);
        const outputFileDir = dirname(outputFile);
        if (!existsSync(outputFileDir)) {
          mkdirSync(outputFileDir, { recursive: true });
        }

        // Redirect responses → small meta-refresh HTML page
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("Location") || "/";
          await writeFile(
            outputFile,
            `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${location}"><link rel="canonical" href="${location}"></head><body>Redirecting to <a href="${location}">${location}</a></body></html>`,
          );
        } else {
          // Write the response body (works for both text and binary)
          const buffer = Buffer.from(await response.arrayBuffer());
          await writeFile(outputFile, buffer);
        }

        if (debug) {
          console.log(`  → ${outputFile}`);
        }
      } catch (error) {
        console.error(`Error pre-rendering endpoint ${resolvedRoute}:`, error);
      }
    }
  }
};

// ── Dynamic route handler ────────────────────────────────────────────

/**
 * Handle an incoming request for an endpoint route.
 *
 * Loads the compiled `.mjs` from `.endpoints/` (cache-busted so edits
 * are picked up immediately in dev mode), finds the matching HTTP method
 * handler (falling back to `ALL`), and streams the Web `Response` back
 * through Express.
 */
const handleEndpointRoute = async (
  req: any,
  res: any,
  compiledFile: string,
  routePattern: string,
  method: HttpMethod,
): Promise<void> => {
  // Load the module fresh on every request (cache-busted for dev)
  let currentModule: EndpointModule;
  try {
    currentModule = await loadEndpointModule(compiledFile);
  } catch (err) {
    console.error(`Failed to load endpoint: ${compiledFile}`, err);
    res.status(500).send("Internal Server Error");
    return;
  }

  // Pick the matching handler; fall back to ALL
  const handlerFn =
    (currentModule[method] as EndpointHandler | undefined) ??
    (currentModule.ALL as EndpointHandler | undefined);

  if (!handlerFn) {
    res.status(405).send("Method Not Allowed");
    return;
  }

  // ── Build a standard Web Request from Express req ──────────────
  const protocol = req.protocol || "http";
  const host = req.get?.("host") || req.headers?.host || "localhost";
  const url = `${protocol}://${host}${req.originalUrl}`;

  const reqInit: RequestInit = {
    method: req.method,
    headers: req.headers as HeadersInit,
  };

  // Read the raw body for methods that typically carry a payload
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    try {
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        req.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
        req.on("end", resolve);
        req.on("error", reject);
      });
      if (chunks.length > 0) {
        reqInit.body = Buffer.concat(chunks);
      }
    } catch {
      // Body reading failed – continue without body
    }
  }

  const request = new Request(url, reqInit);

  const context: EndpointContext = {
    params: req.params || {},
    request,
    redirect: createRedirect,
  };

  try {
    const response = await handlerFn(context);

    // Transfer status & headers
    res.status(response.status);
    response.headers.forEach((value: string, key: string) => {
      res.set(key, value);
    });

    // HEAD → send headers only, strip the body
    if (req.method === "HEAD") {
      res.end();
      return;
    }

    // Transfer the body
    if (response.body) {
      const buf = Buffer.from(await response.arrayBuffer());
      res.send(buf);
    } else {
      res.end();
    }
  } catch (error) {
    console.error(`Endpoint error ${req.method} ${routePattern}:`, error);
    res.status(500).send("Internal Server Error");
  }
};

// ── Serve / SSR ──────────────────────────────────────────────────────

/**
 * Register dynamic endpoint routes on an Express-compatible app.
 *
 * Loads the already-compiled `.mjs` files from the `.endpoints/`
 * folder and registers an Express route for each exported HTTP method.
 *
 * Endpoints that export `prerender = true` are skipped — they were
 * already written as static files during the build step and will be
 * served by the static-file middleware.
 *
 * If a `GET` handler is exported but no `HEAD` handler, a `HEAD` route
 * is automatically registered that calls `GET` and strips the body
 * (per the Astro spec).
 */
export const registerEndpoints = async (
  app: any,
  projectDir: string,
  config: SsgConfig,
  debug = false,
): Promise<void> => {
  const endpointsDir = join(projectDir, ".endpoints");

  // Discover compiled .mjs endpoint files from .endpoints/
  const mjsFiles = await glob.async(join(endpointsDir, "**/*.mjs"));
  if (mjsFiles.length === 0) return;

  let registered = 0;

  for (const compiledFile of mjsFiles) {
    // Derive the route pattern from the compiled file path
    let route = relative(endpointsDir, compiledFile)
      .replace(/\\/g, "/")
      .replace(/\.mjs$/, "");
    if (!route.startsWith("/")) route = `/${route}`;

    // Load the module to inspect exports
    let module: EndpointModule;
    try {
      module = await loadEndpointModule(compiledFile);
    } catch (err) {
      console.error(`Failed to load endpoint: ${compiledFile}`, err);
      continue;
    }

    // Skip pre-rendered endpoints — they are served as static files
    if (module.prerender === true) {
      if (debug) {
        console.log(`Skipping prerender endpoint: ${route}`);
      }
      continue;
    }

    const expressRoute = routeToExpressPattern(route);
    const hasExportedMethods = HTTP_METHODS.some(
      (m) => m in module && typeof module[m] === "function",
    );

    if (!hasExportedMethods) continue;

    if (debug) {
      console.log(`Registering dynamic endpoint: ${expressRoute}`);
    }

    // Register a handler for each exported HTTP method
    for (const method of HTTP_METHODS) {
      if (method in module && typeof module[method] === "function") {
        const expressMethod = method === "ALL" ? "all" : method.toLowerCase();
        (app as any)[expressMethod](
          expressRoute,
          async (req: any, res: any) =>
            handleEndpointRoute(req, res, compiledFile, route, method),
        );
        if (debug) {
          console.log(`  ${method} ${expressRoute}`);
        }
      }
    }

    // Auto HEAD from GET when HEAD is not explicitly exported
    if (module.GET && !module.HEAD) {
      app.head(
        expressRoute,
        async (req: any, res: any) =>
          handleEndpointRoute(req, res, compiledFile, route, "GET"),
      );
      if (debug) {
        console.log(`  HEAD ${expressRoute} (auto from GET)`);
      }
    }

    registered++;
  }

  if (registered > 0) {
    console.log(`Registered ${registered} dynamic endpoint(s)`);
  }
};
