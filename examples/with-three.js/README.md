# defuss + TalkingHead + HeadTTS demo

A minimal Astro + defuss + defuss-shadcn demo that integrates:

- `@met4citizen/talkinghead`
- `@met4citizen/headtts`

It follows the same broad app shape as `defuss/examples/with-shadcn`, but keeps the client side intentionally small and DOM-first.

## What it does

- Initializes a `TalkingHead` avatar inside a plain DOM container.
- Initializes `HeadTTS` in in-browser mode (`webgpu`, fallback `wasm`).
- Calls `head.streamStart()`.
- Configures `HeadTTS` for `audioEncoding: "pcm"`.
- For every `audio` message from `HeadTTS`, forwards `message.data.audio` and the returned viseme timing arrays into `head.streamAudio()`.
- Calls `head.streamNotifyEnd()` when the `HeadTTS` queue is drained.

## Install

```bash
npm install
npm run dev
```

## Notes

- The demo uses a remote avatar URL from the TalkingHead repository for convenience. Replace it with your own production avatar, and verify the source asset license before shipping.
- The first initialization is heavy because the avatar asset plus HeadTTS model backend must load.
- `HeadTTS` is configured with explicit CDN worker and dictionary URLs. That avoids path issues when bundling the app through Astro/Vite.
- The UI intentionally uses direct DOM access and defuss `$()` updates instead of any VDOM-like state layer.

## Files

- `src/csr/avatar-demo.tsx`: main integration logic
- `src/csr/app.tsx`: app entry
- `src/pages/index.astro`: page mount
- `src/layouts/*`: base layout and theme
