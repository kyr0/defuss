/**
 * e2e tests - Browser (vitest + playwright)
 *
 * Run: vitest run --config vitest.browser.config.ts
 */
import { describe } from "vitest";
import * as tenVadWeb from "defuss-vad/tenvad-web";
import { registerTests } from "./e2e.shared.js";

describe("defuss-vad e2e (Browser)", registerTests(tenVadWeb));
