# syntax=docker/dockerfile:1.7

FROM --platform=$BUILDPLATFORM rust:1.75 AS builder
WORKDIR /src

# Install cargo-zigbuild and zig
RUN apt-get update && apt-get install -y \
    curl \
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && . "$HOME/.cargo/env" \
    && cargo install cargo-zigbuild \
    && apt-get remove -y curl \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Add zig via apt (Debian-based)
RUN curl -fsSL https://ziglang.org/download/master/zig-linux-x86_64-master.tar.xz -o zig.tar.xz \
    && tar -xf zig.tar.xz \
    && mv zig-linux-x86_64-* /usr/local/zig \
    && rm zig.tar.xz \
    && ln -s /usr/local/zig/zig /usr/local/bin/zig

ENV PATH="/root/.cargo/bin:/usr/local/bin:$PATH"

# Copy source
COPY Cargo.toml ./
COPY src/ ./src/

ARG TARGETPLATFORM
ARG VERSION=dev

# Build based on platform
RUN if [ "$TARGETPLATFORM" = "linux/amd64" ]; then \
        TARGET="x86_64-unknown-linux-musl"; \
    elif [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
        TARGET="aarch64-unknown-linux-musl"; \
    else \
        echo "Unsupported platform: $TARGETPLATFORM" && exit 1; \
    fi && \
    rustup target add "$TARGET" && \
    cargo zigbuild --release --target "$TARGET"

# Copy binary to artifact stage
FROM scratch AS artifact
COPY --from=builder /src/target/$(if [ "$TARGETPLATFORM" = "linux/amd64" ]; then echo "x86_64-unknown-linux-musl"; elif [ "$TARGETPLATFORM" = "linux/arm64" ]; then echo "aarch64-unknown-linux-musl"; fi)/release/rustcalc /rustcalc
