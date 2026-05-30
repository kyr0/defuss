SHELL := /bin/sh
.DEFAULT_GOAL := build

PROJECT_ROOT := $(abspath .)
CONTAINER_ROOT := /work

HOST_UID := $(shell id -u)
HOST_GID := $(shell id -g)

BUILD_REL ?= .build
DIST_REL ?= dist

BUILD_DIR := $(PROJECT_ROOT)/$(BUILD_REL)
DIST_DIR := $(PROJECT_ROOT)/$(DIST_REL)

CTR_BUILD_DIR := $(CONTAINER_ROOT)/$(BUILD_REL)
CTR_DIST_DIR := $(CONTAINER_ROOT)/$(DIST_REL)
CTR_SRC_DIR := $(CTR_BUILD_DIR)/src
CTR_QJSX_DIR := $(CTR_SRC_DIR)/quickjs-x
CTR_QJSX_BIN_DIR := $(CTR_BUILD_DIR)/bin

ALPINE_IMAGE ?= alpine:3.23
RUNTIME_IMAGE ?= busybox:musl
QJSX_REPO ?= https://github.com/rmst/quickjs-x.git
QJSX_REF ?= main
STATIC ?= 1
APK_PACKAGES ?= build-base bash coreutils file findutils git patch

ifeq ($(STATIC),1)
MUSL_LDFLAGS := -static -s
else
MUSL_LDFLAGS := -s
endif

.PHONY: build clean smoke shell info

build:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "docker is required for this target" >&2; \
		exit 1; \
	fi
	@rm -rf "$(BUILD_DIR)" "$(DIST_DIR)"
	@mkdir -p "$(BUILD_DIR)" "$(DIST_DIR)"
	@{ \
		printf '%s\n' \
			'apk add --no-cache $(APK_PACKAGES)' \
			'mkdir -p "$(CTR_SRC_DIR)" "$(CTR_DIST_DIR)"' \
			'git clone --depth 1 --recurse-submodules --shallow-submodules --branch "$(QJSX_REF)" "$(QJSX_REPO)" "$(CTR_QJSX_DIR)"' \
			'make -C "$(CTR_QJSX_DIR)" build BIN_DIR="$(CTR_QJSX_BIN_DIR)" CC=cc LDFLAGS="$(MUSL_LDFLAGS)"' \
			'make -C "$(CTR_QJSX_BIN_DIR)/quickjs" qjs CC=cc CONFIG_LTO=y LDFLAGS="$(MUSL_LDFLAGS)"' \
			'cp "$(CTR_QJSX_BIN_DIR)/qjsx" "$(CTR_DIST_DIR)/qjsx"' \
			'cp "$(CTR_QJSX_BIN_DIR)/qjsx-node" "$(CTR_DIST_DIR)/js"' \
			'cp "$(CTR_QJSX_BIN_DIR)/quickjs/qjs" "$(CTR_DIST_DIR)/qjs"' \
			'chmod +x "$(CTR_DIST_DIR)/qjsx" "$(CTR_DIST_DIR)/js" "$(CTR_DIST_DIR)/qjs"' \
			'file "$(CTR_DIST_DIR)/qjsx" "$(CTR_DIST_DIR)/js" "$(CTR_DIST_DIR)/qjs"'; \
		if [ "$(STATIC)" = "0" ]; then \
			printf '%s\n' \
				'echo "--- ldd dist/js ---"' \
				'ldd "$(CTR_DIST_DIR)/js" || true' \
				'echo "--- ldd dist/qjs ---"' \
				'ldd "$(CTR_DIST_DIR)/qjs" || true'; \
		fi; \
		printf '%s\n' \
			'chown -R "$(HOST_UID):$(HOST_GID)" "$(CTR_BUILD_DIR)" "$(CTR_DIST_DIR)" 2>/dev/null || true'; \
	} | docker run --rm \
		-v "$(PROJECT_ROOT):$(CONTAINER_ROOT)" \
		-w "$(CONTAINER_ROOT)" \
		"$(ALPINE_IMAGE)" \
		/bin/sh -eux
	@printf 'built:\n  %s\n  %s\n  %s\n' "$(DIST_DIR)/js" "$(DIST_DIR)/qjsx" "$(DIST_DIR)/qjs"

smoke: build
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "docker is required for this target" >&2; \
		exit 1; \
	fi
	@docker run --rm \
		-v "$(DIST_DIR):/dist:ro" \
		-v "$(PROJECT_ROOT)/examples:/examples:ro" \
		"$(RUNTIME_IMAGE)" \
		/bin/sh -euxc '/dist/qjs -e "console.log(40 + 2)"; /dist/js /examples/fs-demo.mjs'

shell:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "docker is required for this target" >&2; \
		exit 1; \
	fi
	@docker run --rm -it \
		-v "$(PROJECT_ROOT):$(CONTAINER_ROOT)" \
		-w "$(CONTAINER_ROOT)" \
		"$(ALPINE_IMAGE)" \
		/bin/sh

info:
	@printf 'ALPINE_IMAGE=%s\nRUNTIME_IMAGE=%s\nQJSX_REPO=%s\nQJSX_REF=%s\nSTATIC=%s\n' \
		"$(ALPINE_IMAGE)" "$(RUNTIME_IMAGE)" "$(QJSX_REPO)" "$(QJSX_REF)" "$(STATIC)"

clean:
	rm -rf "$(BUILD_DIR)" "$(DIST_DIR)"
