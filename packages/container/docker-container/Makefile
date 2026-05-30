IMAGE    := defuss-container
PLATFORM := linux/riscv64

# ── Feature flags via command-line targets ──────────────────────────────
# Usage:  make build with-python with-jq
#         make test  with-python
#         make build                   (base image, no extras)

FEATURES  :=
BUILD_ARGS :=

ifneq (,$(filter with-jq,$(MAKECMDGOALS)))
  FEATURES  += with-jq
  BUILD_ARGS += --build-arg WITH_JQ=1
endif

ifneq (,$(filter with-python,$(MAKECMDGOALS)))
  FEATURES  += with-python
  BUILD_ARGS += --build-arg WITH_PYTHON=1
endif

# Compose the tag: "diet" or "diet-with-python" etc.
space := $(subst ,, )
ifdef FEATURES
  TAG := diet-$(subst $(space),-,$(strip $(FEATURES)))
else
  TAG := diet
endif

FULL := $(IMAGE):$(TAG)
NAME := $(subst :,-,$(FULL))

# No-op targets so make doesn't complain about feature flags.
with-python:
	@:
with-jq:
	@:
with-node:
	@:

.PHONY: build run shell test stats logs clean with-python with-jq with-node

## Build the container image.
build:
	docker build --platform $(PLATFORM) $(BUILD_ARGS) -t $(FULL) .
	@echo "Built $(FULL)"

## Run the default CMD (/bin/sh) interactively.
run:
	docker run --rm -it --platform $(PLATFORM) --name $(NAME) $(FULL)

## Open an interactive shell.
shell:
	docker run --rm -it --platform $(PLATFORM) --name $(NAME) $(FULL) /bin/sh

## Smoke-test: verify busybox + conditionally python3.
test: build
	@echo "=== Testing $(FULL) ==="
	@echo "--- busybox ---"
	docker run --rm --platform $(PLATFORM) $(FULL) busybox --help | head -1
ifneq (,$(filter with-jq,$(MAKECMDGOALS)))
	@echo "--- jq ---"
	docker run --rm --platform $(PLATFORM) $(FULL) sh -c 'echo '"'"'{"a":1}'"'"' | jq .a'
endif
	@echo "--- aliases (ll) ---"
	docker run --rm --platform $(PLATFORM) $(FULL) sh -lc 'll /bin | head -3'
ifneq (,$(filter with-node,$(MAKECMDGOALS)))
	@echo "--- node version ---"
	docker run --rm --platform $(PLATFORM) $(FULL) node --version
	@echo "--- npm version ---"
	docker run --rm --platform $(PLATFORM) $(FULL) npm --version
endif
ifneq (,$(filter with-python,$(MAKECMDGOALS)))
	@echo "--- python3 version ---"
	docker run --rm --platform $(PLATFORM) $(FULL) python3 --version
	@echo "--- python3 eval ---"
	docker run --rm --platform $(PLATFORM) $(FULL) python3 -c "import sys, json, os, io, math; print('stdlib OK')"
	@echo "--- python / python3 symlinks ---"
	docker run --rm --platform $(PLATFORM) $(FULL) python -c "print('python symlink OK')"
endif
	@echo "--- image size ---"
	@docker images $(FULL) --format '{{.Size}}'
	@echo "ALL TESTS PASSED"

## Remove the image (respects feature flags for tag).
clean:
	docker rmi -f $(FULL) 2>/dev/null || true

## Image size and last container memory stats.
stats:
	@echo "--- image ---"
	@docker images $(FULL) --format 'ID: {{.ID}}  Size: {{.Size}}  Created: {{.CreatedSince}}'
	@docker inspect $(FULL) --format 'Arch: {{.Architecture}}' 2>/dev/null || true
	@echo "--- last container memory ---"
	@if cid=$$(docker ps -aq --filter ancestor=$(FULL) | head -1) && [ -n "$$cid" ]; then \
	  docker stats --no-stream --format 'Container: {{.Name}}  Mem: {{.MemUsage}}  MemPct: {{.MemPerc}}  CPU: {{.CPUPerc}}  PIDs: {{.PIDs}}' "$$cid"; \
	elif cid=$$(docker ps -q --filter name=$(NAME) | head -1) && [ -n "$$cid" ]; then \
	  docker stats --no-stream --format 'Container: {{.Name}}  Mem: {{.MemUsage}}  MemPct: {{.MemPerc}}  CPU: {{.CPUPerc}}  PIDs: {{.PIDs}}' "$$cid"; \
	else \
	  echo "(no running container found)"; \
	fi

## Follow logs of the running container.
logs:
	@if cid=$$(docker ps -q --filter name=$(NAME) | head -1) && [ -n "$$cid" ]; then \
	  docker logs -f "$$cid"; \
	elif cid=$$(docker ps -q --filter ancestor=$(FULL) | head -1) && [ -n "$$cid" ]; then \
	  docker logs -f "$$cid"; \
	else \
	  echo "(no running container found)"; \
	fi
