# defuss-container

A minimal `FROM scratch` container image for agentic code execution. Built on `linux/amd64` with composable feature flags.

## What's Inside

| Variant | Tag | Contents | Size |
|---------|-----|----------|------|
| Base | `diet` | BusyBox (static) + CA certs + shell aliases | ~2 MB |
| + jq | `diet-with-jq` | Base + jq + musl | ~3 MB |
| + Python | `diet-with-python` | Base + CPython 3.12 (trimmed stdlib, stripped) + musl | ~25 MB |
| + both | `diet-with-jq-with-python` | All of the above | ~25 MB |

All binaries are stripped of debug symbols. The Python stdlib is pruned of test suites, IDE modules, CJK codecs, and other heavyweight packages not needed at runtime.

## Quick Start

```bash
# Build base image
make build

# Build with jq
make build with-jq

# Build with Python
make build with-python

# Build with everything
make build with-jq with-python

# Interactive shell
make shell
make shell with-jq with-python

# Run smoke tests
make test
make test with-jq with-python
```

## Makefile Targets

| Target | Description |
|--------|-------------|
| `make build` | Build the image |
| `make run` | Run default CMD (`/bin/sh`) interactively |
| `make shell` | Open an interactive shell |
| `make test` | Build + smoke-test (busybox, aliases, + flag-specific checks) |
| `make stats` | Show image size and running container memory stats |
| `make logs` | Follow logs of the running container |
| `make clean` | Remove the image |

Append feature flags to any target to select the variant:

```bash
make stats with-jq with-python
make clean with-python
```

## Feature Flags

| Flag | Build arg | What it adds |
|------|-----------|-------------|
| `with-jq` | `WITH_JQ=1` | jq binary + shared libs (musl) |
| `with-python` | `WITH_PYTHON=1` | CPython 3.12 + trimmed stdlib + shared libs (musl) |

Flags are passed as extra Make targets. They automatically:

1. Set the corresponding `--build-arg` (e.g. `WITH_PYTHON=1`)
2. Append to the image tag (e.g. `diet-with-python`)
3. Enable conditional test assertions

Adding new flags follows the same pattern in the Makefile — add an `ifneq` block and a no-op target.

## Shell Aliases

The image ships with `/etc/profile` loaded via `ENV=/etc/profile`:

| Alias | Command |
|-------|---------|
| `ll` | `ls -la` |
| `la` | `ls -A` |
| `l` | `ls -CF` |
| `..` | `cd ..` |
| `...` | `cd ../..` |
| `md` | `mkdir -p` |
| `cls` | `clear` |

## Architecture

- **Platform:** `linux/amd64` (targeting WASM transpilation)
- **Base:** `FROM scratch` — no OS layer, no package manager
- **Shell:** BusyBox static (full coreutils + sh)
- **jq (optional):** JSON processor, dynamically linked against musl
- **Python (optional):** Alpine CPython 3.12 dynamically linked against musl, with trimmed stdlib

### Stripped Python Modules

The following are removed to minimize image size:

- **stdlib dirs:** test, idlelib, tkinter, turtledemo, lib2to3, ensurepip, unittest, pydoc_data, venv, xmlrpc, wsgiref, ctypes, config-*
- **stdlib files:** pydoc.py, doctest.py, _pydecimal.py, pickletools.py, difflib.py, _pydatetime.py, _pyio.py, turtle*.py
- **lib-dynload:** _test*, _xxtestfuzz*, xxlimited*, CJK codecs (_codecs_jp/cn/hk/kr/tw, _codecs_iso2022, _multibytecodec), _curses*, _sqlite3*, _dbm*, _crypt*, audioop*, spwd*, _ctypes*, _decimal*, unicodedata*, _lsprof*
- **caches:** all `__pycache__` dirs and `.pyc` files
