#!/usr/bin/env bash
set -euo pipefail

TARGET="x86_64-unknown-linux-musl"
BIN="rustcalc"

if ! command -v cargo >/dev/null 2>&1; then
  echo "error: cargo not found" >&2
  exit 1
fi

if ! command -v rustup >/dev/null 2>&1; then
  echo "error: rustup not found" >&2
  exit 1
fi

if ! command -v cargo-zigbuild >/dev/null 2>&1; then
  echo "error: cargo-zigbuild not found. Install it with: cargo install --locked cargo-zigbuild" >&2
  exit 1
fi

if ! command -v zig >/dev/null 2>&1; then
  echo "error: zig not found. Install Zig first." >&2
  exit 1
fi

rustup target add "$TARGET"
cargo zigbuild --release --target "$TARGET"

OUT="target/$TARGET/release/$BIN"
echo "built: $OUT"
file "$OUT" || true
