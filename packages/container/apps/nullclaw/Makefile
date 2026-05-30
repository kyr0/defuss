VERSION   ?= dev
DIST_DIR  ?= dist
BIN_NAME  ?= nullclaw
TEST_IMAGE ?= alpine:3.23
TARGET ?= x86_64-linux-musl
PROFILE ?= ReleaseSmall

.PHONY: all build smoke clean help

all: build

$(DIST_DIR):
	mkdir -p $(DIST_DIR)

build: $(DIST_DIR)
	docker buildx build \
		--platform=linux/amd64 \
		--target artifact \
		--build-arg VERSION=$(VERSION) \
		--output type=local,dest=$(DIST_DIR) \
		.
	test -f $(DIST_DIR)/nullclaw
	chmod +x $(DIST_DIR)/nullclaw
	@echo "Built: $(DIST_DIR)/$(BIN_NAME)"
	@file $(DIST_DIR)/$(BIN_NAME) || true

smoke: build
	docker run --rm \
		--platform=linux/amd64 \
		-v "$(PWD)/$(DIST_DIR):/dist:ro" \
		--entrypoint /dist/$(BIN_NAME) \
		$(TEST_IMAGE) \
		--help >/dev/null

clean:
	rm -rf $(DIST_DIR)

help:
	@echo "Usage:"
	@echo "  make build    - Build static binary to $(DIST_DIR)/$(BIN_NAME)"
	@echo "  make smoke    - Run smoke test with Alpine container"
	@echo "  make clean    - Remove dist folder"
	@echo ""
	@echo "Variables:"
	@echo "  VERSION=$(VERSION)"
	@echo "  DIST_DIR=$(DIST_DIR)"
	@echo "  BIN_NAME=$(BIN_NAME)"
