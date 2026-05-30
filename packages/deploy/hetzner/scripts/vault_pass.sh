#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -n "${ANSIBLE_VAULT_PASSWORD:-}" ]]; then
  printf '%s' "$ANSIBLE_VAULT_PASSWORD"
elif [[ -n "${VAULT_PASSWORD:-}" ]]; then
  printf '%s' "$VAULT_PASSWORD"
elif [[ -f "$ROOT_DIR/.vault_pass.txt" ]]; then
  tr -d '\r\n' < "$ROOT_DIR/.vault_pass.txt"
else
  echo "Missing vault password. Set ANSIBLE_VAULT_PASSWORD or create .vault_pass.txt" >&2
  exit 1
fi
