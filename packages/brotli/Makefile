.PHONY: setup build test bench clean example

## Install Rust, wasm-pack, and all required targets cross-platform
setup:
	@echo "── defuss-brotli setup ──"
	@command -v rustup >/dev/null 2>&1 || { \
		echo "Rust not found. Installing via rustup…"; \
		curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y; \
		echo "Source the cargo env: . \"$$HOME/.cargo/env\""; \
		. "$$HOME/.cargo/env"; \
	}
	rustup target add wasm32-unknown-unknown
	@command -v wasm-pack >/dev/null 2>&1 || { \
		echo "Installing wasm-pack..."; \
		curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh; \
	}
	@command -v wasm-opt >/dev/null 2>&1 || { \
		echo "wasm-opt not found (optional). Install binaryen for smaller WASM output."; \
	}
	@echo "Setup complete — run 'bun run build' next."

build:
	bun run build

test:
	bun run test

bench:
	bun run bench

clean:
	bun run clean

example:
	bun run example
