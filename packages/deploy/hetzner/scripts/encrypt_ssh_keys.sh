#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
for src in "$ROOT_DIR"/.runtime/ssh/id_ops_*; do
  [[ -e "$src" ]] || continue
  dst="$ROOT_DIR/secrets/ssh/$(basename "$src").vault"
  cp "$src" "$dst.plain"
  ansible-vault encrypt --encrypt-vault-id default --vault-password-file "$ROOT_DIR/scripts/vault_pass.sh" "$dst.plain"
  mv "$dst.plain" "$dst"
done
