/**
 * e2e tests - Browser (vitest + playwright)
 *
 * Run: vitest run --config vitest.browser.config.ts
 */
import { describe } from "vitest";
import { registerTests } from "./e2e.shared.js";

describe("defuss-openai e2e (Browser)", registerTests);
