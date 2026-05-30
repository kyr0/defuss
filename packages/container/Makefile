SHELL := /bin/bash
.DEFAULT_GOAL := help

ROOT := $(abspath .)
DIST_DIR := $(ROOT)/dist
CACHE_DIR := $(ROOT)/.cache
TOOLS_DIR := $(ROOT)/.tools
TOOLS_BIN := $(TOOLS_DIR)/bin
HOST_BUN := $(shell command -v bun 2>/dev/null)

# Derive the image tag from feature flags (matches docker-container/Makefile logic).
_FEAT_SUFFIX := $(if $(CONTAINER_FEATURES),-$(subst $(eval ) ,-,$(strip $(CONTAINER_FEATURES))),)
IMAGE_NAME := defuss-container:diet$(_FEAT_SUFFIX)
CONTAINER_DIR := ./docker-container
CONTAINER_FEATURES ?=
WASM_OUT := $(DIST_DIR)/out.wasm
PORT ?= 8080
C2W_FLAGS ?= \
  --target-arch=riscv64 \
  --build-arg INIT_DEBUG=false \
  --build-arg LINUX_LOGLEVEL=0 \
  --build-arg NO_BINFMT=true
#  --build-arg OPTIMIZATION_MODE=native

OS := $(shell uname -s)
ARCH := $(shell uname -m)

ifeq ($(OS),Darwin)
OPEN_CMD := open
else
OPEN_CMD := xdg-open
endif

.PHONY: help setup build clean verify-host verify-docker prepare-dist docker-image wasm bundle-static stats serve test shell\:node shell\:browser

help:
	@printf '%s\n' \
	  'Targets:' \
	  '  make setup          Install local build tooling into ./.tools (Linux/macOS; Windows via WSL2)' \
	  '  make build                        Build Docker image, convert to WASI, write ./dist' \
	  '  make build CONTAINER_FEATURES="with-jq with-python"' \
	  '                                  Build with optional features (jq, python)' \
	  '  make stats          Show WASM file size + estimated gzip transfer size + boot times' \
	  '  make serve          Serve ./dist on http://127.0.0.1:PORT (default 8080)' \
	  '  make test           Run vitest boot tests (shell:node + shell:browser)' \
	  '  make shell:node     Run ./dist/out.wasm locally through Node (interactive WASI shim)' \
	  '  make shell:browser  Serve ./dist and open the interactive browser terminal (recommended)' \
	  '  make clean          Remove dist/ and local tool/cache directories'

verify-host:
	@if [[ "$(OS)" != "Linux" && "$(OS)" != "Darwin" ]]; then \
	  echo 'This project supports Linux and macOS hosts. On Windows, use WSL2.' >&2; \
	  exit 1; \
	fi
	@for cmd in tar unzip; do \
	  command -v $$cmd >/dev/null 2>&1 || { echo "Missing required host tool: $$cmd" >&2; exit 1; }; \
	done
	@if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then \
	  echo 'Missing downloader: install curl or wget.' >&2; \
	  exit 1; \
	fi

verify-docker:
	@command -v docker >/dev/null 2>&1 || { echo 'Docker is required but was not found in PATH.' >&2; exit 1; }

$(TOOLS_BIN)/c2w:
	@if [ -z "$(HOST_BUN)" ]; then echo 'bun is required but was not found in PATH.' >&2; exit 1; fi
	@echo 'Installing container2wasm release binaries into ./.tools/bin'
	@"$(HOST_BUN)" run ./scripts/install-c2w.ts
	@"$(TOOLS_BIN)/c2w" --help >/dev/null

setup: verify-host verify-docker $(TOOLS_BIN)/c2w
	@npx playwright install chrome >/dev/null 2>&1 || echo 'Warning: Playwright chrome install failed (optional, needed for browser boot tests).'
	@echo 'Local toolchain is ready.'

prepare-dist:
	@mkdir -p "$(DIST_DIR)"

docker-image: verify-docker
	@echo 'Building container image via $(CONTAINER_DIR)'
	$(MAKE) -C "$(CONTAINER_DIR)" build $(CONTAINER_FEATURES)

wasm: prepare-dist
	@if [ -f "$(WASM_OUT)" ]; then \
	  echo 'Skipping WASI conversion — $(WASM_OUT) already exists. Run "make clean" to rebuild.'; \
	else \
	  $(MAKE) docker-image || exit 1; \
	  $(MAKE) setup || exit 1; \
	  echo 'Converting container image to WASI'; \
	  rm -f "$(WASM_OUT)"; \
	  "$(TOOLS_BIN)/c2w" $(C2W_FLAGS) "$(IMAGE_NAME)" "$(WASM_OUT)"; \
	fi

bundle-static: prepare-dist
	@echo 'Writing browser assets into ./dist'
	@rm -rf "$(DIST_DIR)/browser_wasi_shim"
	@cp ./web/index.html "$(DIST_DIR)/index.html"
	@cp ./web/worker.js "$(DIST_DIR)/worker.js"
	@cp ./web/worker-util.js "$(DIST_DIR)/worker-util.js"
	@cp ./web/wasi-util.js "$(DIST_DIR)/wasi-util.js"
	@mkdir -p "$(DIST_DIR)/browser_wasi_shim"
	@cp ./web/browser_wasi_shim/index.js "$(DIST_DIR)/browser_wasi_shim/index.js"
	@cp ./web/browser_wasi_shim/wasi_defs.js "$(DIST_DIR)/browser_wasi_shim/wasi_defs.js"

build: wasm bundle-static
	@echo 'Build complete: ./dist/out.wasm and browser assets are ready.'

stats:
	@if [ ! -f "$(WASM_OUT)" ]; then \
	  echo 'No WASM file found. Run "make build" first.' >&2; exit 1; \
	fi
	@echo "--- out.wasm ---"
	@raw=$$(wc -c < "$(WASM_OUT)" | tr -d ' '); \
	  gz=$$(gzip -c "$(WASM_OUT)" | wc -c | tr -d ' '); \
	  raw_mb=$$(echo "scale=1; $$raw / 1048576" | bc); \
	  gz_mb=$$(echo "scale=1; $$gz / 1048576" | bc); \
	  ratio=$$(echo "scale=1; $$gz * 100 / $$raw" | bc); \
	  printf 'Raw:  %s MiB (%d bytes)\n' "$$raw_mb" $$raw; \
	  printf 'Gzip: %s MiB (%d bytes)\n' "$$gz_mb" $$gz; \
	  printf 'Ratio: %s%%\n' "$$ratio"
	@echo "--- docker image ---"
	@docker images "$(IMAGE_NAME)" --format 'Image: {{.Repository}}:{{.Tag}}  Size: {{.Size}}'
	@echo "--- cold boot ---"
	@t0=$$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time()*1000'); \
	  printf 'exit\n' | node ./scripts/run-wasi-shell.mjs "$(WASM_OUT)" >/dev/null 2>&1; \
	  t1=$$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time()*1000'); \
	  ms=$$((t1 - t0)); \
	  printf 'Node WASI:  %d.%03ds  (exit-after-boot)\n' $$((ms / 1000)) $$((ms % 1000))
	@_p=19731; \
	  t0=$$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time()*1000'); \
	  PORT=$$_p "$(HOST_BUN)" run ./scripts/serve.ts >/dev/null 2>&1 & _srv=$$!; \
	  while ! curl -sf "http://127.0.0.1:$$_p/" >/dev/null 2>&1; do sleep 0.05; done; \
	  t1=$$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time()*1000'); \
	  kill $$_srv 2>/dev/null; wait $$_srv 2>/dev/null || true; \
	  ms=$$((t1 - t0)); \
	  printf 'Bun server: %d.%03ds  (time to first HTTP response)\n' $$((ms / 1000)) $$((ms % 1000))

test:
	@if [ ! -f "$(WASM_OUT)" ]; then $(MAKE) build; fi
	@$(MAKE) bundle-static
	@npx vitest run --reporter verbose

serve:
	@if [ ! -f "$(WASM_OUT)" ]; then $(MAKE) build; fi
	@echo 'Serving ./dist on http://127.0.0.1:$(PORT)'
	@PORT="$(PORT)" "$(HOST_BUN)" run ./scripts/serve.ts

shell\:node:
	@if [ ! -f "$(WASM_OUT)" ]; then $(MAKE) build; fi
	@echo 'Launching ./dist/out.wasm through Node WASI shim (interactive)'
	@node ./scripts/run-wasi-shell.mjs "$(WASM_OUT)" $(ARGS)

shell\:browser:
	@if [ ! -f "$(WASM_OUT)" ]; then $(MAKE) build; fi
	@if command -v $(OPEN_CMD) >/dev/null 2>&1; then \
	  (sleep 1; $(OPEN_CMD) "http://127.0.0.1:$(PORT)/" >/dev/null 2>&1 || true) & \
	else \
	  echo 'No browser opener found; open http://127.0.0.1:$(PORT)/ manually.'; \
	fi
	@$(MAKE) serve

clean:
	rm -rf "$(DIST_DIR)" "$(CACHE_DIR)" "$(TOOLS_DIR)"
