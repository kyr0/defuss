/**
 * e2e tests - Node.js (vitest)
 *
 * Run: vitest run --config vitest.config.ts
 */
import { describe } from "vitest";
import { registerTests } from "./e2e.shared.js";

describe("defuss-vad e2e (Node.js)", registerTests);
