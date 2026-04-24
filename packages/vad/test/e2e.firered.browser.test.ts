/**
 * e2e tests - FireRed VAD in browser (vitest + playwright)
 */
import { describe } from "vitest";
import * as fireRedWeb from "defuss-vad/firered-web";
import { registerTests } from "./e2e.shared.js";

describe(
  "defuss-vad e2e (FireRed Browser)",
  registerTests(fireRedWeb, { hopSize: 160, minVoiceRatio: 0.1 }),
);