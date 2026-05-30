# bun-wasi-shell (WIP)

Tiny shell-first Linux container image for `container2wasm`, built from:

- `busybox:1.37-musl` — a minimal Linux userland with a single binary for common shell utilities.
- a scratch final image

It produces:

- `dist/out.wasm` — the converted WASI image
- `dist/out.wasm.br` — Brotli-compressed browser payload
- `dist/index.html` + worker/browser support files — browser terminal shell

## Targets

- `make setup`
- `make build`
- `make shell:browser`
- `make shell:node`
- `make clean`

## Notes

- Host support: Linux and macOS. On Windows, use WSL2.
- `setup` installs local tooling into `./.tools/`; it does **not** touch your global shell profile.
- Docker still needs to be installed separately. `setup` verifies it exists.
- `shell:bun` uses Bun's `node:wasi` implementation. That path is convenient, but Bun documents it as only **partially implemented**, so the browser flow and Wasmtime-style runtimes remain the more reliable execution path for complex modules.

## Typical flow

```bash
make setup
make build
make shell:browser
```

Or run the built WASI artifact directly under Bun:

```bash
make shell:node
```

## Browser assets

The browser worker glue in `web/worker.js`, `web/worker-util.js`, `web/wasi-util.js`, and `web/browser_wasi_shim/*` is adapted from the upstream `container2wasm` WASI-browser example.
