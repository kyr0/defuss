# defuss-tauri

Tiny PoC CLI/library that wraps a `defuss-ssg` app in a generated Tauri v2 host.

```bash
bunx defuss-tauri build . --platform macos
bunx defuss-tauri dev . --platform macos
```

## Current design

`defuss-tauri` always uses the same runtime route:

```text
Tauri WebView → http://127.0.0.1:<port>
```

The localhost server is always `defuss-ssg`, executed from the target app's local dependency:

```bash
node_modules/defuss-ssg/dist/cli.mjs dev .
node_modules/defuss-ssg/dist/cli.mjs serve .
```

The packaged app does **not** require system Node, system npm, or system npx. `defuss-tauri` downloads an official per-platform Node.js distribution, stages the full Node distribution as a resource, and also copies the Node executable as a Tauri sidecar binary.

## What it does

### `build`

```bash
bunx defuss-tauri build . --platform macos
```

1. Generates/refreshes `<project>/.defuss-tauri/src-tauri`.
2. Downloads/stages Node.js for the selected target, defaulting to `latest-v22.x`.
3. Ensures local `defuss-ssg` exists in `<project>/node_modules`; if missing, runs the project package-manager install, then falls back to `bun add -d defuss-ssg@latest`.
4. Runs local `defuss-ssg` with the staged Node binary:

   ```bash
   <node-sidecar> <project>/node_modules/defuss-ssg/dist/cli.mjs build .
   ```

5. Stages the app into Tauri resources:

   ```text
   .defuss-tauri/src-tauri/resources/app/
     dist/
     node_modules/
     package.json
     config.ts
     rpc.ts
     ...project files...
   ```

6. Runs `bun run tauri build` inside `<project>/.defuss-tauri`.
7. At native-app runtime, Rust starts:

   ```bash
   <bundled-node> app/node_modules/defuss-ssg/dist/cli.mjs serve .
   ```

   with:

   ```text
   cwd=app/
   HOST=127.0.0.1
   PORT=3000
   ```

8. The Tauri window opens `http://127.0.0.1:3000`.

### `dev`

```bash
bunx defuss-tauri dev . --platform macos
```

1. Generates/refreshes the managed Tauri host.
2. Downloads/stages Node.js sidecar if missing.
3. Ensures local `defuss-ssg` exists.
4. Starts Tauri dev.
5. During Tauri startup, Rust starts:

   ```bash
   <bundled-node> <project>/node_modules/defuss-ssg/dist/cli.mjs dev .
   ```

   with:

   ```text
   cwd=<project>
   HOST=127.0.0.1
   PORT=3000
   ```

6. The Tauri window opens the same localhost URL.

So dev/prod differ only in `defuss-ssg dev` vs `defuss-ssg serve` and `cwd`.

## Generated layout

```text
my-defuss-app/
  dist/                         # defuss-ssg output
  dist-tauri/                   # collected release bundles
  node_modules/defuss-ssg/      # local SSG package used by defuss-tauri
  .defuss-tauri/
    package.json                # local @tauri-apps/cli dev dependency
    cache/node/                 # downloaded Node archives/extractions
    src-tauri/
      Cargo.toml
      build.rs
      tauri.conf.json
      frontend-dist/index.html  # unused placeholder; Tauri build expects frontendDist
      binaries/
        node-aarch64-apple-darwin
      resources/
        app/                    # staged app for packaged prod
        node/                   # full Node distribution, incl. npm/npx files
      capabilities/default.json
      src/main.rs
      src/lib.rs
```

## Options

```text
--platform <native|macos|windows|linux>
--target <rust-target-triple>
--port, -p <number>              Default: 3000
--host, -H <host>                Default: 127.0.0.1
--app-name <name>
--identifier <reverse.dns.id>
--version <semver>
--ssg-output <dir>               Default: dist
--managed-dir <dir>              Default: .defuss-tauri
--tauri-out <dir>                Default: dist-tauri
--node-version <latest-v22.x|x.y.z> Default: latest-v22.x
--node-dist-base-url <url>       Default: https://nodejs.org/download/release
--skip-ssg                       Do not call local defuss-ssg build
--skip-ssg-install               Do not install defuss-ssg if local package is missing
--skip-node                      Do not download/stage bundled Node
--skip-install                   Do not run bun install in the managed Tauri host
--strict-security                Emit less permissive Tauri/macOS settings
--dry-run                        Print external commands; still writes generated host files
--debug, -d
```

## Node packaging

Default Node resolution is dynamic:

```text
https://nodejs.org/download/release/latest-v22.x/SHASUMS256.txt
```

The CLI resolves the concrete version from `SHASUMS256.txt`, downloads the matching archive, extracts it, copies the Node executable to the Tauri sidecar path, and copies the full Node distribution into resources.

Target mapping examples:

```text
aarch64-apple-darwin      -> node-v<version>-darwin-arm64.tar.gz
x86_64-apple-darwin       -> node-v<version>-darwin-x64.tar.gz
x86_64-unknown-linux-gnu   -> node-v<version>-linux-x64.tar.xz
aarch64-unknown-linux-gnu  -> node-v<version>-linux-arm64.tar.xz
x86_64-pc-windows-msvc     -> node-v<version>-win-x64.zip
```

Tauri requires the sidecar binary to be named with the Rust target triple suffix, so `externalBin: ["binaries/node"]` maps to files such as:

```text
src-tauri/binaries/node-aarch64-apple-darwin
src-tauri/binaries/node-x86_64-pc-windows-msvc.exe
```

## Security posture

This PoC defaults to a permissive development/prototype profile:

- disables Tauri CSP injection and emits `csp: null` / `devCsp: null`;
- emits broad response headers and a permissive `Permissions-Policy`;
- enables global `window.__TAURI__`;
- adds broad macOS usage descriptions for camera, microphone, location, Bluetooth, local network, speech recognition, and Apple Events;
- adds macOS entitlements for networking, camera, audio input, location, Bluetooth, USB, JIT, and unsigned executable memory;
- allows arbitrary macOS App Transport Security loads in the generated `Info.plist`.

Use `--strict-security` to emit a narrower base.

## Library API

```ts
import { buildDefussTauri, devDefussTauri, initDefussTauri } from "defuss-tauri";

await buildDefussTauri({
  projectDir: ".",
  platform: "macos",
});
```
