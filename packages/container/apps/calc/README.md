# rustcalc

Tiny Rust CLI calculator demo. It is intentionally minimal: one binary, no external Rust dependencies, and a build path that targets **x86_64 Linux with musl** so it runs cleanly in BusyBox/musl environments.
# Calc - Static Binary Build

## Behavior

```bash
rustcalc <lhs> <op> <rhs>
```

Examples:

```bash
rustcalc 1 + 2
rustcalc 7 / 2
rustcalc 9 '%' 4
rustcalc 3 '*' 5
```

Supported operators:

- `+`
- `-`
- `*`
- `/`
- `%`
## Building (No Rust Required!)

**No Rust toolchain needed!** The build uses Docker to compile a static binary.

```bash
# Build for default platform (linux/amd64)
make build

# Build for ARM64
make build PLATFORM=linux/arm64

# Output: dist/rustcalc (static binary)
```

## Requirements

- Docker with buildx support
- No local Rust installation needed

## How It Works

The Dockerfile:
1. Uses `rust:1.75` as base image
2. Installs `cargo-zigbuild` and `zig` for cross-compilation
3. Builds a static musl binary using `cargo zigbuild`
4. Outputs the binary to a `scratch` stage for minimal size

## Output

- `dist/rustcalc` - Single static binary (x86_64 or aarch64, depending on PLATFORM)
- The binary is fully static and can run on any compatible Linux system without dependencies

## Testing

To run tests, you'll need a local Rust toolchain:
```bash
cargo test
```

## Distribution

Create a distribution tarball:
```bash
make dist
# Creates: ../rustcalc-dist.tar.gz containing only the binary
```

## Cross-compile on macOS for BusyBox/musl

Recommended path:

1. Install the Rust target:

   ```bash
   rustup target add x86_64-unknown-linux-musl
   ```

2. Install Zig and `cargo-zigbuild`.

   Example:

   ```bash
   brew install zig
   cargo install --locked cargo-zigbuild
   ```

3. Build:

   ```bash
   cargo zigbuild --release --target x86_64-unknown-linux-musl
   # Calc - Static Binary Build

   A simple calculator built as a static musl binary using Docker for reproducible builds.

   ## Behavior

   ```bash
   rustcalc <lhs> <op> <rhs>
   ```

   Examples:

   ```bash
   rustcalc 1 + 2
   rustcalc 7 / 2
   rustcalc 9 '%' 4
   rustcalc 3 '*' 5
   ```

   Supported operators: `+`, `-`, `*`, `/`, `%`

   ## Building (No Rust Required!)

   **No Rust toolchain needed!** The build uses Docker to compile a static binary.

   ```bash
   # Build for default platform (linux/amd64)
   make build

   # Build for ARM64
   make build PLATFORM=linux/arm64

   # Output: dist/rustcalc (static binary)
   ```

   ## Requirements

   - Docker with buildx support
   - No local Rust installation needed

   ## How It Works

   The Dockerfile:
   1. Uses `rust:1.75` as base image
   2. Installs `cargo-zigbuild` and `zig` for cross-compilation
   3. Builds a static musl binary using `cargo zigbuild`
   4. Outputs the binary to a `scratch` stage for minimal size

   ## Output

   - `dist/rustcalc` - Single static binary (x86_64 or aarch64, depending on PLATFORM)
   - The binary is fully static and can run on any compatible Linux system without dependencies

   ## Testing

   To run tests, you'll need a local Rust toolchain:
   ```bash
   cargo test
   ```

   ## Distribution

   Create a distribution tarball:
   ```bash
   make dist
   # Creates: ../rustcalc-dist.tar.gz containing only the binary
   ```

   ## Makefile Targets

   - `make build` - Build static binary using Docker
   - `make release` - Build optimized release (alias for build)
   - `make test` - Show test instructions
   - `make clean` - Remove dist folder
   - `make dist` - Create distribution tarball
   - `make help` - Show usage information

   ## Configuration Variables

   - `PLATFORM` - Target platform (default: `linux/amd64`, options: `linux/amd64` or `linux/arm64`)
   - `VERSION` - Version string (default: `dev`)
   - `DIST_DIR` - Output directory (default: `dist`)
   - `BIN` - Binary name (default: `rustcalc`)
   
   # Calc - Static Binary Build

   A simple calculator built as a static musl binary using Docker for reproducible builds.

   ## Behavior

   ```bash
   rustcalc <lhs> <op> <rhs>
   ```

   Examples:

   ```bash
   rustcalc 1 + 2
   rustcalc 7 / 2
   rustcalc 9 '%' 4
   rustcalc 3 '*' 5
   ```

   Supported operators: `+`, `-`, `*`, `/`, `%`

   ## Building (No Rust Required!)

   **No Rust toolchain needed!** The build uses Docker to compile a static binary.

   ```bash
   # Build for default platform (linux/amd64)
   make build

   # Build for ARM64
   make build PLATFORM=linux/arm64

   # Output: dist/rustcalc (static binary)
   ```

   ## Requirements

   - Docker with buildx support
   - No local Rust installation needed

   ## How It Works

   The Dockerfile:
   1. Uses `rust:1.75` as base image
   2. Installs `cargo-zigbuild` and `zig` for cross-compilation
   3. Builds a static musl binary using `cargo zigbuild`
   4. Outputs the binary to a `scratch` stage for minimal size

   ## Output

   - `dist/rustcalc` - Single static binary (x86_64 or aarch64, depending on PLATFORM)
   - The binary is fully static and can run on any compatible Linux system without dependencies

   ## Testing

   To run tests, you'll need a local Rust toolchain:
   ```bash
   cargo test
   ```

   ## Distribution

   Create a distribution tarball:
   ```bash
   make dist
   # Creates: ../rustcalc-dist.tar.gz containing only the binary
   ```

   ## Makefile Targets

   - `make build` - Build static binary using Docker
   - `make release` - Build optimized release (alias for build)
   - `make test` - Show test instructions
   - `make clean` - Remove dist folder
   - `make dist` - Create distribution tarball
   - `make help` - Show usage information

   ## Configuration Variables

   - `PLATFORM` - Target platform (default: `linux/amd64`, options: `linux/amd64` or `linux/arm64`)
   - `VERSION` - Version string (default: `dev`)
   - `DIST_DIR` - Output directory (default: `dist`)
   - `BIN` - Binary name (default: `rustcalc`)
   *Note: This approach has been replaced by Docker-based builds for better reproducibility and no local toolchain requirements.*
   ```

The output binary will be:

```bash
target/x86_64-unknown-linux-musl/release/rustcalc
```

Or use the helper script:

```bash
./build-x86_64-musl.sh
```

Or use the Makefile:

```bash
make
```


## Notes

- `x86_64-unknown-linux-musl` is the correct Rust target for a 64-bit Linux binary linked against musl.
- For this target, Rust commonly produces a static C runtime link by default, which is what you usually want for BusyBox/musl deployment.
- In most shells, `*` must be quoted as `'*'`.
