# Prerequisites

In case you'd like to contribute to defuss, you should know about the following:

- You should be familiar with TypeScript
- You should be familiar with pnpm

Please install the following tools:

- Node.js (LTS)
- pnpm

It's important to `build` the project before running any tests or examples. You can do this by running `pnpm build` in the root directory.

## Building the core libary

The core libary is the main library of defuss. It contains the main API of defuss. It is used by most of the other packages.

```sh
packages/
    defuss
    defuss-runtime
    defuss-vite
    defuss-astro
    defuss-rpc
    defuss-transval
    defuss-dson
    defuss-desktop
```

By building the core, all of the examples in `./examples` should work.

```bash
pnpm build:core
```

## Building everything

Defuss is a full-stack web framework that uses cutting-edge technology like WebAssembly with C and Rust integration.Thus, you need additional tools depending on what you want to work on. 

- Rust
- emscripten
- wasm-pack
