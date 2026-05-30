TARGET ?= x86_64-unknown-linux-musl
BIN ?= rustcalc
DIST_DIR ?= dist
OUT := $(DIST_DIR)/$(BIN)
PLATFORM ?= linux/amd64
VERSION ?= dev

.PHONY: all help build release test clean dist $(DIST_DIR)

all: build

$(DIST_DIR):
	mkdir -p $(DIST_DIR)

build: $(DIST_DIR)
	@echo "Building $(BIN) for $(PLATFORM) using Docker..."
	docker buildx build \
		--platform=$(PLATFORM) \
		--target artifact \
		--build-arg VERSION=$(VERSION) \
		--output type=local,dest=$(DIST_DIR) \
		.
	mv $(DIST_DIR)/rustcalc $(OUT) 2>/dev/null || true
	chmod +x $(OUT)
	@echo "Built: $(OUT)"
	@file $(OUT) || true

release: build

test:
	@echo "Note: Tests require local Rust toolchain. Run 'cargo test' manually if needed."

clean:
	rm -rf $(DIST_DIR)

dist:
	tar -czf ../$(BIN)-dist.tar.gz -C $(DIST_DIR) $(BIN)
	@echo "Created: ../$(BIN)-dist.tar.gz"

help:
	@echo "Usage:"
	@echo "  make build      - Build static binary to $(DIST_DIR)/$(BIN) using Docker"
	@echo "  make release    - Build optimized release binary (alias for build)"
	@echo "  make test       - Show test instructions"
	@echo "  make clean      - Remove dist folder"
	@echo "  make dist       - Create distribution tarball"
	@echo ""
	@echo "Variables:"
	@echo "  PLATFORM=$(PLATFORM)  - Target platform (linux/amd64 or linux/arm64)"
	@echo "  VERSION=$(VERSION)"
	@echo "  DIST_DIR=$(DIST_DIR)"
	@echo "  BIN=$(BIN)"
	@echo ""
	@echo "Requirements: Docker with buildx"
	@echo ""
	@echo "Examples:"
	@echo "  make build                    # Build for default platform (linux/amd64)"
	@echo "  make build PLATFORM=linux/arm64  # Build for ARM64"
CARGO ?= cargo
RUSTUP ?= rustup
ZIGBUILD ?= cargo-zigbuild
OUT := $(DIST_DIR)/$(BIN)
PLATFORM ?= linux/amd64
VERSION ?= dev

.PHONY: all help build release test clean dist $(DIST_DIR)

all: build

$(DIST_DIR):
	mkdir -p $(DIST_DIR)

help:
	@echo "Targets:"
	@echo "  make build      Build $(BIN) for $(TARGET)"
	@echo "  make release    Alias for build"
	@echo "  make test       Run unit tests on the host toolchain"
	@echo "  make clean      Remove target/"
	@echo "  make dist       Create a project tarball in ../$(BIN)-dist.tar.gz"
	@echo ""
	@echo "Variables:"
	@echo "  TARGET=$(TARGET)"
	@echo "  PROFILE=$(PROFILE)"
	@echo "  BIN=$(BIN)"
	@echo "  DIST_DIR=$(DIST_DIR)"

target:
	@$(RUSTUP) target add $(TARGET)

check-tools:
	@command -v $(CARGO) >/dev/null 2>&1 || { echo "error: cargo not found" >&2; exit 1; }
	@command -v $(RUSTUP) >/dev/null 2>&1 || { echo "error: rustup not found" >&2; exit 1; }
	@command -v $(ZIGBUILD) >/dev/null 2>&1 || { echo "error: cargo-zigbuild not found. Install with: cargo install --locked cargo-zigbuild" >&2; exit 1; }
	@command -v zig >/dev/null 2>&1 || { echo "error: zig not found. Install with: brew install zig" >&2; exit 1; }

build: $(DIST_DIR) check-tools target
	$(CARGO) zigbuild --$(PROFILE) --target $(TARGET)
	cp target/$(TARGET)/$(PROFILE)/$(BIN) $(OUT)
	@echo "built: $(OUT)"
	@file $(OUT) || true

release: build

test:
	@echo "Note: Tests require local Rust toolchain. Run 'cargo test' manually if needed."

clean:
	rm -rf $(DIST_DIR)

dist:
	tar -czf ../$(BIN)-dist.tar.gz -C $(DIST_DIR) $(BIN)
	@echo "created: ../$(BIN)-dist.tar.gz"

help:
	@echo "Usage:"
	@echo "  make build      - Build static binary to $(DIST_DIR)/$(BIN) using Docker"
	@echo "  make release    - Build optimized release binary (alias for build)"
	@echo "  make test       - Show test instructions"
	@echo "  make clean      - Remove dist folder"
	@echo "  make dist       - Create distribution tarball"
	@echo ""
	@echo "Variables:"
	@echo "  PLATFORM=$(PLATFORM)"
	@echo "  VERSION=$(VERSION)"
	@echo "  DIST_DIR=$(DIST_DIR)"
	@echo "  BIN=$(BIN)"
	@echo ""
	@echo "Requirements: Docker with buildx"
