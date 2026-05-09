# defuss-openai

A tiny OpenAI client built directly on top of the standard `fetch()` API.

## Goals

- **0 runtime dependencies**
- **No classes**
- **No fetch patching**
- **Works anywhere `fetch` works**
- **Streaming support for chat/completions**
- **Audio/TTS support via standard `Response` streams**
- **Only the types this package actually needs**
- **Tool calling support (including zyphra format)**

## Supported endpoints

- `POST /v1/chat/completions`
- `POST /v1/embeddings`
- `POST /v1/moderations`
- `POST /v1/audio/speech`

## Install

```bash
bun add defuss-openai
```

Requires a runtime with native `fetch`, `ReadableStream`, `AbortController`, and `TextDecoder`.

## Usage

```ts
import { createClient } from 'defuss-openai';

const openai = createClient({
  baseUrl: 'http://localhost:8430/v1',
});

const chat = await openai.createChatCompletion({
  model: 'kyr0/zaya1-base-8b-4bit-MLX',
  messages: [{ role: 'user', content: 'hello' }],
});

console.log(chat.choices[0]?.message?.content);
```

## Streaming chat completions

```ts
const stream = await openai.streamChatCompletion({
  model: 'kyr0/zaya1-base-8b-4bit-MLX',
  messages: [{ role: 'user', content: 'count to 3' }],
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? '');
}
```

## Tool Calling

### Standard OpenAI tool calling

Pass tools via the `tools` parameter as usual:

```ts
const chat = await openai.createChatCompletion({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'What is the weather in Berlin?' }],
  tools: [
    {
      type: 'function',
      function: {
        name: 'getWeather',
        parameters: { type: 'object', properties: { city: { type: 'string' } } },
      },
    },
  ],
});

// Tool calls appear on the message
const toolCalls = chat.choices[0]?.message?.tool_calls;
```

### Zyphra tool call parsing

For models that emit tool calls in the zyphra XML format (wrapped in `<zyphra_tool_call>` tags), `createChatCompletion` automatically parses them into standard `tool_calls` on the response message. The XML blocks are stripped from `content` after parsing.

You can also parse zyphra tool calls manually:

```ts
import { parseZyphraToolCalls } from 'defuss-openai';

const toolCalls = parseZyphraToolCalls(rawModelOutput);
// → ToolCall[] with { id, type: 'function', function: { name, arguments } }
```

## TTS / speech

`createSpeech()` returns the raw `Response`. That keeps the API isomorphic and lets you choose how to consume the audio.

```ts
const response = await openai.createSpeech({
  model: 'gpt-5-mini-tts',
  voice: 'alloy',
  input: 'hello from a tiny client',
});

const audio = await response.arrayBuffer();
```

Or use the convenience wrappers:

```ts
// Get the full audio as an ArrayBuffer
const buffer = await openai.createSpeechBuffer({
  model: 'gpt-5-mini-tts',
  voice: 'alloy',
  input: 'hello from a tiny client',
});

// Get a ReadableStream of raw bytes for progressive playback
const stream = await openai.createSpeechStream({
  model: 'gpt-5-mini-tts',
  voice: 'alloy',
  input: 'hello from a tiny client',
});

for await (const chunk of stream) {
  console.log(chunk.length);
}
```

## API

```ts
createClient(config?: ClientConfig): OpenAIClient
```

The returned client is a frozen plain object with these methods:

- `createChatCompletion(params, opts?)` — Non-streaming chat completion (auto-parses zyphra tool calls)
- `streamChatCompletion(params, opts?)` — SSE streaming chat completion
- `createEmbeddings(params, opts?)` — Vector embeddings
- `createModeration(params, opts?)` — Content moderation
- `createSpeech(params, opts?)` — TTS, returns raw `Response`
- `createSpeechBuffer(params, opts?)` — TTS, returns `ArrayBuffer`
- `createSpeechStream(params, opts?)` — TTS, returns `ReadableStream<Uint8Array>`

### Client Configuration

```ts
type ClientConfig = {
  apiKey?: string;       // Falls back to OPENAI_API_KEY in process.env
  organization?: string;  // Falls back to OPENAI_ORG_ID in process.env
  project?: string;       // Falls back to OPENAI_PROJECT_ID in process.env
  baseUrl?: string;       // Override for local/custom servers (default: https://api.openai.com/v1)
  fetch?: typeof fetch;   // Custom fetch implementation
  headers?: HeadersInit;  // Additional headers
  timeout?: number;       // Per-request timeout in ms (default: 10min)
  maxRetries?: number;    // Retry count on 5xx/429 (default: 2)
};
```

### Environment Variables

This client reads env vars directly from `process.env` — it does not use an in-memory store. To load values from a `.env` file, use [`defuss-env`](https://www.npmjs.com/package/defuss-env) with `inject: true`:

```ts
import { load } from 'defuss-env';

// Load .env and inject into process.env (required for this client to pick up values)
load('.env', true);

import { createClient } from 'defuss-openai';

// Now apiKey, organization, and project will be read from process.env
const openai = createClient();
```

Env vars read by the client:

| Variable | Config Field | Default | Description |
|----------|-------------|---------|-------------|
| `OPENAI_API_KEY` | `apiKey` | `""` | API key (optional for local servers) |
| `OPENAI_ORG_ID` | `organization` | _(none)_ | Organization ID |
| `OPENAI_PROJECT_ID` | `project` | _(none)_ | Project ID |

Env vars used by examples and tests:

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_BASE_URL` | `http://127.0.0.1:8430/v1` | Base URL for local inference server |
| `OPENAI_MODEL` | `kyr0/zaya1-base-8b-4bit-MLX` | Default model for examples/tests (5 GB VRAM, great quality), other local models could be used - for example, `prism-ml/Bonsai-8B-mlx-1bit` (2GB VRAM, lower quality) or `kyr0/Gemma-4-Waldwicht-Winzling` (4 bit dynamic quant of Gemma4-E2B, 3GB VRAM, medium quality) with the [Waldwicht Inference server](https://github.com/kyr0/waldwicht) |

In browsers, `process.env` is not available. Pass credentials explicitly via `ClientConfig` or use a backend proxy.

### Per-Request Options

Each method accepts an optional `RequestOptions` as the second argument:

```ts
type RequestOptions = {
  headers?: HeadersInit;
  signal?: AbortSignal;
  fetch?: typeof fetch;
  timeout?: number;
  maxRetries?: number;
};
```

### Errors

The package exports structured error constructors and utilities:

```ts
import {
  castToError,
  createAPIError,
  createConnectionError,
  createConnectionTimeoutError,
  createOpenAIError,
  createUserAbortError,
  isAbortError,
} from 'defuss-openai';
```

All errors are `OpenAIError` instances with optional `status`, `headers`, `code`, `param`, `type`, `requestId`, and `cause` properties.

### Other Exports

```ts
// Parse zyphra XML tool calls from raw model output
import { parseZyphraToolCalls } from 'defuss-openai';

// SSE stream helper (for building custom streaming logic)
import { createSSEStream } from 'defuss-openai';

// Deprecated alias for createClient
import { createOpenAI, OpenAI } from 'defuss-openai';
```

## Why this shape?

The official SDK is broader and more feature-rich. This package is intentionally narrower: flat API, standard fetch semantics, tiny surface area, and no generated type dump.

## Browser note

This library works in browsers, but shipping a secret OpenAI API key to the browser is usually a bad idea. Use a backend or edge proxy unless you fully understand the trade-offs.

## Running tests

The e2e tests run against a local OpenAI-compatible inference server. You need [Bonsai-8B-mlx-1bit-server](https://github.com/kyr0/Bonsai-8B-mlx-1bit-server) running on `http://127.0.0.1:8430`:

```bash
# clone and start the server (requires macOS with Apple Silicon)
git clone https://github.com/kyr0/Bonsai-8B-mlx-1bit-server.git
cd Bonsai-8B-mlx-1bit-server
make setup && make start
```

Then run the tests:

```bash
# Node.js + browser (Playwright)
bun run test

# Node.js only
bun run test:e2e

# Browser only
bun run test:e2e:browser
```

## License

MIT
