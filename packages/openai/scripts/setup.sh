#!/usr/bin/env bash
#
# setup.sh — Create a Python virtual environment and install the forked mlx-lm.
#
# Usage:
#   ./scripts/setup.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_DIR="$PROJECT_DIR/.venv"
MLX_LM_FORK="https://github.com/kyr0/mlx-lm.git"
MLX_LM_BRANCH="feat/zaya-support"

echo "==> Setting up MLX LM server environment..."

# Create venv if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
  echo "==> Creating Python virtual environment at $VENV_DIR"
  python3 -m venv "$VENV_DIR"
else
  echo "==> Virtual environment already exists at $VENV_DIR"
fi

# Activate venv
echo "==> Activating virtual environment..."
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

# Upgrade pip
echo "==> Upgrading pip..."
pip install --upgrade pip

# Install forked mlx-lm from the specified branch
echo "==> Installing mlx-lm from fork ($MLX_LM_FORK, branch: $MLX_LM_BRANCH)..."
pip install "git+$MLX_LM_FORK@${MLX_LM_BRANCH}"

# Verify installation
echo ""
echo "==> Verifying installation..."
mlx_lm.server --help > /dev/null 2>&1 && echo "    mlx_lm.server is available!" || echo "    WARNING: mlx_lm.server not found!"

echo ""
echo "==> Setup complete!"
echo "    To start the server, run: make -C \"$PROJECT_DIR\" start"
echo "    To stop the server, run:  make -C \"$PROJECT_DIR\" stop"
