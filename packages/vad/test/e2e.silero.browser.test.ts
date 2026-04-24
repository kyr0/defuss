import { describe } from "vitest";
import * as sileroWeb from "defuss-vad/silero-web";
import { registerTests } from "./e2e.shared.js";

describe(
  "defuss-vad e2e (Silero Browser)",
  registerTests(sileroWeb, {
    hopSize: 512,
    minVoiceRatio: 0.1,
    sampleRate: 16000,
  }),
);