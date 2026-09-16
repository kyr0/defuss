#!/usr/bin/env bun
/**
 * Why: manual playground launcher for the examples/ page. Browser tests use
 * server.ts directly on an ephemeral port; this script exists for humans
 * trying the CDN bundles by hand on a fixed port (PORT env, default 8080).
 */
import { resolve } from "node:path";
import { serve } from "./server.ts";
const { url } = await serve(
  resolve(import.meta.dirname, ".."),
  Number(process.env.PORT ?? 8080),
);
console.log(url);
