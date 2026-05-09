#!/usr/bin/env bash
#
# stop.sh — Stop the MLX LM server.
#
# Usage:
#   ./scripts/stop.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PID_FILE="$PROJECT_DIR/.mlx-server.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "No PID file found. Server may not be running."
  exit 0
fi

PID=$(cat "$PID_FILE")

if kill -0 "$PID" 2>/dev/null; then
  echo "Stopping MLX LM server (PID $PID)..."
  kill "$PID"
  # Wait up to 10 seconds for graceful shutdown
  for i in $(seq 1 10); do
    if ! kill -0 "$PID" 2>/dev/null; then
      break
    fi
    sleep 1
  done
  # Force kill if still running
  if kill -0 "$PID" 2>/dev/null; then
    echo "Server didn't stop gracefully. Force killing..."
    kill -9 "$PID"
  fi
  echo "Server stopped."
else
  echo "Server (PID $PID) is not running. Cleaning up PID file."
fi

rm -f "$PID_FILE"
