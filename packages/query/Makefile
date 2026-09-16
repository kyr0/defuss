# defuss-query — maintainer shortcuts (thin wrappers around package scripts)
# KISS: every target delegates to package.json so there is one source of truth.

.DEFAULT_GOAL := help
.PHONY: help setup build typecheck test test-browser test-types test-package verify check serve clean

help: ## Show available targets
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup: ## Install bun dependencies and the Playwright chromium browser
	bun install
	bunx playwright install chromium

build: ## Compile ESM + CJS + browser bundles and write dist/stats.json
	bun run build

typecheck: ## Strict tsc type-check (no emit)
	bun run typecheck

test: ## Vitest node + Playwright chromium browser tests
	bun run test

test-browser: ## Vitest Playwright chromium browser tests only
	bun run test:browser

test-types: ## Compile-only positive/negative API type tests
	bun run test:types

test-package: ## npm pack into a temp dir and check packed ESM/CJS/type consumers
	bun run test:package

verify: ## Static consistency gate (artifacts present, stats fresh, size budgets)
	bun run verify

check: ## Full pipeline: build → type tests → tests → package tests → verify
	bun run check

serve: ## Serve the demo at http://127.0.0.1:8080
	bun run serve

clean: ## Remove dist/
	node -e "require('node:fs').rmSync('dist',{recursive:true,force:true})"
