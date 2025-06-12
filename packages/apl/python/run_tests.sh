#!/usr/bin/env bash
# run_tests.sh — run pytest from the repo-local .venv
# Usage: ./run_tests.sh [pytest extra args]
# Adds verbose (-vv) by default unless -q/-v flags are present.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" )" && pwd)"
VENV_DIR="${SCRIPT_DIR}/.venv"
PYTHON_BIN="${VENV_DIR}/bin/python"

if [[ ! -x "${PYTHON_BIN}" ]]; then
  echo "Virtual environment not found or python binary missing at ${VENV_DIR}" >&2
  exit 1
fi

# Inject -vv unless caller already supplied -q/-v flags
if [[ "$*" =~ (\s|^)-q|\s-v ]]; then
  PYTEST_FLAGS=()
else
  PYTEST_FLAGS=(-v)
fi

exec "${PYTHON_BIN}" -m pytest "${PYTEST_FLAGS[@]}" "$@"