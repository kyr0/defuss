/**
 * e2e tests - FireRed VAD on Node.js (vitest)
 */
import { describe } from "vitest";
import * as fireRedNode from "defuss-vad/firered-node";
import { registerTests } from "./e2e.shared.js";

describe(
	"defuss-vad e2e (FireRed Node.js)",
	registerTests(fireRedNode, { hopSize: 160, minVoiceRatio: 0.1 }),
);
