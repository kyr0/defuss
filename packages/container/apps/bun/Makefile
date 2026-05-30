VERSION ?= 1.3.11
DIST_DIR ?= dist
BIN_NAME ?= bun
DOWNLOAD_URL ?= https://github.com/oven-sh/bun/releases/download/bun-v$(VERSION)/bun-linux-x64-musl.zip

.PHONY: all build clean

all: build

$(DIST_DIR):
	mkdir -p $(DIST_DIR)

build: $(DIST_DIR)
	@echo "Downloading Bun $(VERSION) for linux-x64-musl..."
	curl -L -o $(DIST_DIR)/bun.zip $(DOWNLOAD_URL)
	unzip -o $(DIST_DIR)/bun.zip -d $(DIST_DIR)
	# Bun extracts to bun-linux-x64-musl/bun, move it to dist/bun
	mv $(DIST_DIR)/bun-linux-x64-musl/bun $(DIST_DIR)/$(BIN_NAME)
	rmdir $(DIST_DIR)/bun-linux-x64-musl
	rm -f $(DIST_DIR)/bun.zip
	chmod +x $(DIST_DIR)/$(BIN_NAME)
	@echo "Built: $(DIST_DIR)/$(BIN_NAME)"
	@file $(DIST_DIR)/$(BIN_NAME) || true

clean:
	rm -rf $(DIST_DIR)
