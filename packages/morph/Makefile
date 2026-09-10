# defuss-morph — maintainer shortcuts (thin wrappers around bun scripts)
# KISS: every target delegates to package.json so there is one source of truth.

.DEFAULT_GOAL := help
.PHONY: help setup test test-watch coverage e2e lint typecheck bundle minify stats verify build purge-cdn clean

help: ## Show available targets
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

setup: ## Install bun dependencies and the Playwright chromium browser
	bun install
	bunx playwright install chromium

test: ## Vitest happy-dom unit tests (single run, with coverage)
	bun run test

test-watch: ## Vitest happy-dom unit tests (watch mode)
	bun run test:watch

coverage: ## Vitest unit tests with coverage report
	bun run test

e2e: ## Playwright chromium browser e2e tests
	bun run e2e

lint: ## Lint src/ and scripts/ with oxlint
	bun run lint

typecheck: ## Strict tsc type-check (no emit)
	bun run typecheck

bundle: ## Bundle src/index.ts → dist/all.js (+ all.js.map) for CDN loading
	bun run bundle

minify: ## Minify dist/all.js → dist/all.min.js (+ map) via oxc-minify
	bun run minify

stats: ## Write dist/stats.json (byte + gzip sizes) and refresh the README bundle-size block
	bun run stats

verify: ## Static consistency gate (artifacts present, stats.json + README fresh)
	bun run verify

build: ## Full pipeline: lint → typecheck → compile → bundle → minify → stats → verify → tests → e2e
	bun run lint
	bun run typecheck
	bun run build
	bun run bundle
	bun run minify
	bun run stats
	bun run verify
	bun run test
	bun run e2e

purge-cdn: ## Purge jsDelivr @latest cache for the CDN assets (run after npm publish)
	bun run purge-cdn

clean: ## Remove dist/, coverage/ and vite caches
	bun run clean
