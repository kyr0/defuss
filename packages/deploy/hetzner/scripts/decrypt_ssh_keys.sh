#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime/ssh"
mkdir -p "$RUNTIME_DIR"

for src in "$ROOT_DIR"/secrets/ssh/*.vault; do
  [[ -e "$src" ]] || continue
  base="$(basename "$src" .vault)"
  ansible-vault view --vault-password-file "$ROOT_DIR/scripts/vault_pass.sh" "$src" > "$RUNTIME_DIR/$base"
  chmod 600 "$RUNTIME_DIR/$base"
done
