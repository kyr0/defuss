<h1 align="center">

<img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/examples/with-vite-ts/public/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss</code>
</p>

<sup align="center">

WebAssembly demo + `defuss` Starter Kit

</sup>

</h1>

With this template, you can jumpstart your next `Vite` + `defuss` project!

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/kyr0/defuss/tree/main/examples/multicore-defuss)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/kyr0/defuss?devcontainer_path=.devcontainer/multicore-defuss/devcontainer.json)

> 👩‍💻 **Seasoned developer?** Delete this file. Have fun!

## 🛠️ Setup

### 1. Get a decent package manager ;)

We recommend using `pnpm` as a package manager. It's fast, mature and handles monorepos well. If you haven't installed `pnpm` yet:

```bash
npm i -g pnpm@^9.14.2
```

### 2. Install the projects dependencies

```bash
pnpm i --frozen
```

### 2.1. Emscripten

To compile C to WebAssembly, Emscripten is the way to go. _(Make sure you have a C/C++ compiler installed - clang, gcc and alike - buildtools)_.

[Download and install emsdk!](https://emscripten.org/docs/getting_started/downloads.html)

> **Are you on Linux or macOS?** `brew install emscripten`

```sh
> emcc -v # should print something alike:
emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 4.0.10-git
clang version 21.0.0git
Target: wasm32-unknown-emscripten
Thread model: posix
InstalledDir: /opt/homebrew/Cellar/emscripten/4.0.10/libexec/llvm/bin
```

### 2.2. Rust

To compile Rust to WebAssembly, you want to use the Rust compiler, and (usually) `wasm-pack`.

[Download and install Rust!](https://www.rust-lang.org/tools/install)

## 🚀 Project Structure

Inside of this project, you'll find a few implementations of the same algorithm: dot product calculations.

```text
/
├── public/                   # Public assets 
└── public/wasm_rust          # Rust WebAssembly module storage location
└── public/wasm_c             # Emscripten/C WebAssembly module storage location
└── scripts/                  # Automation scripts for building WebAssembly modules
├── scripts/compile_c.ts.     # Script to build the C WebAssembly module
├── scripts/compile_rust.ts   # Script to build the Rust WebAssembly module
├── src/                      # Source code
├── src/index.tsx             # Imports all implementations
├── src/wasm_c.c              # C implementation of the dot product
├── src/wasm_rust.rs          # Rust implementation of the dot product  
├── src/js.ts                 # TypeScript implementation of the dot product
├── src/js_jit.ts             # JIT-optimized TypeScript implementation of the dot product
├── index.html                # Main HTML file to import the index.tsx
├── tsconfig.json             # TypeScript configuration
├── package.json              # Package configuration, e.g. providing exports and scripts
├── vite.config.ts            # Vite configuration
├── rust-toolchain.toml       # Rust toolchain configuration
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command       | Action                                                                                                                                                                                                                           |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run dev`    | Run in dev mode and check your custom renderer                                                    |
| `pnpm run build` | Build for production  |
| `pnpm run preview` | Build for production, then preview |

---

<img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_comic.png" />

<caption><i><b>Come visit us on <code>defuss</code> Island!</b></i></caption>