#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 /path/to/origin.crt /path/to/origin.key" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_CONTENT="$(sed 's/^/    /' "$1")"
KEY_CONTENT="$(sed 's/^/    /' "$2")"
TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

cat > "$TMP_FILE" <<EOF2
---
vault_hcloud_token: REPLACE_HETZNER_TOKEN
vault_cloudflare_api_token: REPLACE_CLOUDFLARE_API_TOKEN
vault_cloudflare_origin_cert_pem: |
$CERT_CONTENT
vault_cloudflare_origin_key_pem: |
$KEY_CONTENT
vault_app_env:
  APP_NAME: edge-web
  LOG_LEVEL: info
EOF2

ansible-vault encrypt --encrypt-vault-id default --vault-password-file "$ROOT_DIR/scripts/vault_pass.sh" --output "$ROOT_DIR/inventory/group_vars/all/vault.yml" "$TMP_FILE"
