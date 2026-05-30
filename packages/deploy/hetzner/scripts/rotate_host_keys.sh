#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export ROOT_DIR
python3 - <<'PY'
import os
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization
root = Path(os.environ['ROOT_DIR'])
(root / '.runtime/ssh').mkdir(parents=True, exist_ok=True)
(root / 'secrets/ssh/public').mkdir(parents=True, exist_ok=True)
for suffix, name in (('a', 'edge-a'), ('b', 'edge-b')):
    key = Ed25519PrivateKey.generate()
    priv = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.OpenSSH,
        encryption_algorithm=serialization.NoEncryption(),
    )
    pub = key.public_key().public_bytes(
        encoding=serialization.Encoding.OpenSSH,
        format=serialization.PublicFormat.OpenSSH,
    ) + f' ansible-{name}\n'.encode()
    (root / '.runtime/ssh' / f'id_ops_{suffix}').write_bytes(priv)
    (root / 'secrets/ssh/public' / f'id_ops_{suffix}.pub').write_bytes(pub)
PY
"$ROOT_DIR/scripts/encrypt_ssh_keys.sh"
