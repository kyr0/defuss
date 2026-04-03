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
- **Tool calling support**

## Supported endpoints

- `POST /v1/chat/completions`
- `POST /v1/embeddings`
- `POST /v1/moderations`
- `POST /v1/audio/speech`

## Install

```bash
npm install defuss-openai
```

Requires a runtime with native `fetch`, `ReadableStream`, `AbortController`, and `TextDecoder`.

## Usage


```ts
import { createClient } from 'defuss-openai';

const openai = createClient({
  baseUrl: 'http://localhost:8430/v1',
});

const chat = await openai.createChatCompletion({
  model: 'prism-ml/Bonsai-8B-mlx-1bit',
  messages: [{ role: 'user', content: 'hello' }],
});

console.log(chat.choices[0]?.message?.content);
```

## Streaming chat completions

```ts
const stream = await openai.streamChatCompletion({
  model: 'prism-ml/Bonsai-8B-mlx-1bit',
  messages: [{ role: 'user', content: 'count to 3' }],
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? '');
}
```

## TTS / speech

`createSpeech()` returns the raw `Response`. That keeps the API isomorphic and lets you choose how to consume the audio.

```ts
const response = await openai.createSpeech({
  model: 'gpt-4o-mini-tts',
  voice: 'alloy',
  input: 'hello from a tiny client',
});

const audio = await response.arrayBuffer();
```

Or stream it:

```ts
const stream = await openai.createSpeechStream({
  model: 'gpt-4o-mini-tts',
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

- `createChatCompletion(params, opts?)`
- `streamChatCompletion(params, opts?)`
- `createEmbeddings(params, opts?)`
- `createModeration(params, opts?)`
- `createSpeech(params, opts?)`
- `createSpeechBuffer(params, opts?)`
- `createSpeechStream(params, opts?)`

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
