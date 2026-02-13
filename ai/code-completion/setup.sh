#!/bin/bash

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

set -euo pipefail

if [[ -z "${HF_TOKEN:-}" ]]; then
  echo "Error: HF_TOKEN is not set" >&2
  exit 1
fi

