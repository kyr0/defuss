# defuss + TalkingHead + HeadTTS demo

A minimal Astro + defuss + defuss-shadcn demo that integrates:

- `@met4citizen/talkinghead`
- `@met4citizen/headtts`

It follows the same broad app shape as `defuss/examples/with-shadcn`, but keeps the client side intentionally small and DOM-first.

## What it does

- Initializes a `TalkingHead` avatar inside a plain DOM container.
- Lets you switch the live VAD backend between `TEN-VAD`, `FireRed`, and `Silero`.
- Runs offline reference-audio analysis and reuses detected voice segments to improve lip-sync timing.
- Streams microphone audio into the selected backend for realtime mouth motion.
- Shows live meters for input energy, detected voice, and noise/other activity.

## Install

```bash
npm install
npm run dev
```

## Notes

- The demo uses a remote avatar URL from the TalkingHead repository for convenience. Replace it with your own production avatar, and verify the source asset license before shipping.
- FireRed and Silero pull ONNX assets through `defuss-vad`, so the first use of those backends can be noticeably heavier than TenVAD.
- Browser tests and some local validation steps may require `bunx playwright install chromium-headless-shell`.
- The UI intentionally uses direct DOM access and defuss `$()` updates instead of any VDOM-like state layer.

## Files

- `src/csr/avatar-demo-screen.tsx`: main integration logic
- `src/csr/app.tsx`: app entry
- `src/pages/index.astro`: page mount
- `src/layouts/*`: base layout and theme
