/**
 * Shared e2e test suite for defuss-openai against a running bonsai server.
 * Imported by both Node.js and browser test entries.
 */
import { describe, it, expect } from "vitest";
import { createClient, type ChatTool } from "../src/index.js";

const BASE_URL = "http://127.0.0.1:8430/v1";
const MODEL = "prism-ml/Bonsai-8B-mlx-1bit";

const bonsai = createClient({ baseUrl: BASE_URL });

// ---------------------------------------------------------------------------
// Tool-calling fixtures
// ---------------------------------------------------------------------------

const TOOLS: ChatTool[] = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get the current weather for a given location.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City name, e.g. 'San Francisco'",
          },
          unit: {
            type: "string",
            enum: ["celsius", "fahrenheit"],
            description: "Temperature unit",
          },
        },
        required: ["location"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "Evaluate a mathematical expression.",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "Math expression, e.g. '2 + 2'",
          },
        },
        required: ["expression"],
      },
    },
  },
];

const TOOL_RESULTS: Record<string, string> = {
  get_weather: JSON.stringify({
    temperature: 18,
    unit: "celsius",
    condition: "partly cloudy",
  }),
  calculate: JSON.stringify({ result: 42 }),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple chat helper with defaults */
function chat(
  content: string,
  overrides: Record<string, unknown> = {},
) {
  return bonsai.createChatCompletion({
    model: MODEL,
    messages: [{ role: "user", content }],
    max_tokens: 128,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

export function registerTests() {
  // -- Chat completions -----------------------------------------------------

  describe("chat completions", () => {
    it("returns a response for a simple prompt", async () => {
      const res = await chat("What is the capital of France?", {
        max_tokens: 64,
      });
      expect(res.choices.length).toBeGreaterThan(0);
      expect(res.choices[0]!.message.content).toBeTruthy();
    });

    it("handles system + user messages", async () => {
      const res = await bonsai.createChatCompletion({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that responds concisely.",
          },
          { role: "user", content: "What is the capital of France?" },
        ],
        max_tokens: 64,
      });
      expect(res.choices[0]!.message.content).toBeTruthy();
    });

    it("generates code", async () => {
      const res = await chat(
        "Write a Python function that returns the nth Fibonacci number.",
      );
      const content = res.choices[0]!.message.content ?? "";
      expect(content.length).toBeGreaterThan(10);
    });

    it("writes creative content (haiku)", async () => {
      const res = await chat("Write a haiku about programming.", {
        max_tokens: 64,
      });
      expect(res.choices[0]!.message.content).toBeTruthy();
    });

    it("writes creative content (limerick)", async () => {
      const res = await chat(
        "Write a limerick about a program that never compiles.",
        { max_tokens: 64 },
      );
      expect(res.choices[0]!.message.content).toBeTruthy();
    });
  });

  // -- Streaming ------------------------------------------------------------

  describe("streaming chat completions", () => {
    it("streams chunks with delta content", async () => {
      const stream = await bonsai.streamChatCompletion({
        model: MODEL,
        messages: [{ role: "user", content: "Count from 1 to 5." }],
        max_tokens: 64,
      });

      const chunks: string[] = [];
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const delta = value.choices[0]?.delta?.content;
          if (delta) chunks.push(delta);
        }
      } finally {
        reader.releaseLock();
      }

      expect(chunks.length).toBeGreaterThan(1);
      const full = chunks.join("");
      expect(full.length).toBeGreaterThan(0);
    });
  });

  // -- Sampling parameters --------------------------------------------------

  describe("sampling parameters", () => {
    it("temp=0 (greedy)", async () => {
      const res = await chat("What is 2+2?", {
        max_tokens: 32,
        temperature: 0.0,
      });
      expect(res.choices[0]!.message.content).toBeTruthy();
    });

    it("temp=1.5 (high creativity)", async () => {
      const res = await chat("Invent a new word and define it.", {
        max_tokens: 64,
        temperature: 1.5,
      });
      expect(res.choices[0]!.message.content).toBeTruthy();
    });

    it("top_p=0.1 (narrow nucleus)", async () => {
      const res = await chat("Name three colors.", {
        max_tokens: 32,
        temperature: 0.7,
        top_p: 0.1,
      });
      expect(res.choices[0]!.message.content).toBeTruthy();
    });

    it("temp=0 + top_p=1 (deterministic)", async () => {
      const res = await chat("What is the speed of light in m/s?", {
        max_tokens: 32,
        temperature: 0.0,
        top_p: 1.0,
      });
      expect(res.choices[0]!.message.content).toBeTruthy();
    });

    it("high temp + low top_p", async () => {
      const res = await chat("Write one sentence about a cat.", {
        max_tokens: 48,
        temperature: 1.2,
        top_p: 0.3,
      });
      expect(res.choices[0]!.message.content).toBeTruthy();
    });
  });

  // -- Seed reproducibility -------------------------------------------------

  describe("seed reproducibility", () => {
    it("produces identical output with same seed", async () => {
      const params = {
        max_tokens: 16,
        temperature: 0.5,
        seed: 42,
      } as const;

      const res1 = await chat(
        "Pick a random number between 1 and 100.",
        params,
      );
      const res2 = await chat(
        "Pick a random number between 1 and 100.",
        params,
      );

      expect(res1.choices[0]!.message.content).toBe(
        res2.choices[0]!.message.content,
      );
    });

    it("5x determinism with seed=42 temp=0.01", async () => {
      const params = {
        max_tokens: 128,
        temperature: 0.01,
        seed: 42,
      } as const;

      const results: string[] = [];
      for (let i = 0; i < 5; i++) {
        const res = await chat("Hello!", params);
        results.push(res.choices[0]!.message.content ?? "");
      }

      const first = results[0];
      for (const r of results) {
        expect(r).toBe(first);
      }
    });
  });

  // -- finish_reason: length ------------------------------------------------

  describe("finish_reason", () => {
    it("returns length when truncated by max_tokens", async () => {
      const res = await chat(
        "Write a very long and detailed essay about the history of mathematics from ancient civilizations to modern times.",
        { max_tokens: 5, temperature: 0.0 },
      );

      expect(res.choices[0]!.finish_reason).toBe("length");
    });
  });

  // -- Tool calling ---------------------------------------------------------

  describe("tool calling", () => {
    it("calls get_weather tool", async () => {
      const res = await bonsai.createChatCompletion({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: "What's the weather like in San Francisco?",
          },
        ],
        tools: TOOLS,
        max_tokens: 256,
        temperature: 0.1,
      });

      const msg = res.choices[0]!.message;
      const toolCalls = msg.tool_calls ?? [];
      expect(toolCalls.length).toBeGreaterThan(0);

      const weatherCall = toolCalls.find(
        (tc) => tc.function.name === "get_weather",
      );
      expect(weatherCall).toBeDefined();

      // Send tool result back and get final answer
      const followUp = await bonsai.createChatCompletion({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: "What's the weather like in San Francisco?",
          },
          msg,
          {
            role: "tool",
            tool_call_id: weatherCall!.id,
            content: TOOL_RESULTS.get_weather!,
          },
        ],
        max_tokens: 256,
      });

      expect(followUp.choices[0]!.message.content).toBeTruthy();
    });

    it("calls calculate tool for math", async () => {
      const res = await bonsai.createChatCompletion({
        model: MODEL,
        messages: [{ role: "user", content: "What is 6 times 7?" }],
        tools: TOOLS,
        max_tokens: 256,
        temperature: 0.1,
      });

      const msg = res.choices[0]!.message;
      const toolCalls = msg.tool_calls ?? [];

      // Model may answer directly or call a tool - both are valid
      if (toolCalls.length === 0) {
        expect(msg.content).toBeTruthy();
        return;
      }

      const calcCall = toolCalls.find(
        (tc) => tc.function.name === "calculate",
      );
      expect(calcCall).toBeDefined();

      const followUp = await bonsai.createChatCompletion({
        model: MODEL,
        messages: [
          { role: "user", content: "What is 6 times 7?" },
          msg,
          {
            role: "tool",
            tool_call_id: calcCall!.id,
            content: TOOL_RESULTS.calculate!,
          },
        ],
        max_tokens: 256,
      });

      expect(followUp.choices[0]!.message.content).toBeTruthy();
    });

    it("handles multi-tool request", async () => {
      const res = await bonsai.createChatCompletion({
        model: MODEL,
        messages: [
          {
            role: "user",
            content:
              "What's the weather in Tokyo and also calculate 123 + 456?",
          },
        ],
        tools: TOOLS,
        max_tokens: 256,
        temperature: 0.1,
      });

      const msg = res.choices[0]!.message;
      const toolCalls = msg.tool_calls ?? [];
      expect(toolCalls.length).toBeGreaterThan(0);

      // Build tool result messages for all calls
      const toolMessages = toolCalls.map((tc) => ({
        role: "tool" as const,
        tool_call_id: tc.id,
        content:
          TOOL_RESULTS[tc.function.name] ??
          JSON.stringify({ error: "unknown tool" }),
      }));

      const followUp = await bonsai.createChatCompletion({
        model: MODEL,
        messages: [
          {
            role: "user",
            content:
              "What's the weather in Tokyo and also calculate 123 + 456?",
          },
          msg,
          ...toolMessages,
        ],
        max_tokens: 256,
      });

      expect(followUp.choices[0]!.message.content).toBeTruthy();
    });
  });
}
