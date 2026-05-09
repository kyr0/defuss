#!/usr/bin/env bash
#
# start.sh — Start the MLX LM server in the background.
#
# Reads server configuration from .env file in the project root.
#
# Usage:
#   ./scripts/start.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_DIR="$PROJECT_DIR/.venv"
PID_FILE="$PROJECT_DIR/.mlx-server.pid"
ENV_FILE="$PROJECT_DIR/.env"
LOG_FILE="$PROJECT_DIR/.mlx-server.log"

# Defaults (overridden by .env values below)
MODEL="kyr0/zaya1-base-8b-4bit-MLX"
HOST="0.0.0.0"
PORT="8430"
TEMP="0.0"
TOP_P="1.0"
MAX_TOKENS="8192"
PREFILL_STEP_SIZE="512"
PROMPT_CACHE_SIZE="0"

# Load .env if it exists
if [ -f "$ENV_FILE" ]; then
  while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    case "$key" in
      MLX_MODEL) MODEL="$value" ;;
      MLX_HOST) HOST="$value" ;;
      MLX_PORT) PORT="$value" ;;
      MLX_TEMP) TEMP="$value" ;;
      MLX_TOP_P) TOP_P="$value" ;;
      MLX_MAX_TOKENS) MAX_TOKENS="$value" ;;
      MLX_PREFILL_STEP_SIZE) PREFILL_STEP_SIZE="$value" ;;
      MLX_PROMPT_CACHE_SIZE) PROMPT_CACHE_SIZE="$value" ;;
    esac
  done < "$ENV_FILE"
fi

# Check if server is already running
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Server is already running (PID $OLD_PID). Use 'make stop' first."
    exit 1
  else
    echo "Removing stale PID file..."
    rm -f "$PID_FILE"
  fi
fi

# Check venv exists
if [ ! -d "$VENV_DIR" ]; then
  echo "Error: Virtual environment not found at $VENV_DIR"
  echo "Run 'make setup' first."
  exit 1
fi

# Activate venv
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

echo "==> Starting MLX LM server..."
echo "    Model:              $MODEL"
echo "    Host:               $HOST"
echo "    Port:               $PORT"
echo "    Temp:               $TEMP"
echo "    Top_P:              $TOP_P"
echo "    Max_Tokens:         $MAX_TOKENS"
echo "    Prefill_Step_Size:  $PREFILL_STEP_SIZE"
echo "    Prompt_Cache_Size:  $PROMPT_CACHE_SIZE"

# Start server in background (redirect output to log file)
mlx_lm.server \
  --model "$MODEL" \
  --host "$HOST" \
  --port "$PORT" \
  --temp "$TEMP" \
  --top-p "$TOP_P" \
  --max-tokens "$MAX_TOKENS" \
  --prefill-step-size "$PREFILL_STEP_SIZE" \
  --prompt-cache-size "$PROMPT_CACHE_SIZE" >> "$LOG_FILE" 2>&1 &

SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

echo "==> Server started (PID $SERVER_PID)"
echo "    Logs: make -C \"$PROJECT_DIR\" logs"
echo "    Stop: make -C \"$PROJECT_DIR\" stop"
