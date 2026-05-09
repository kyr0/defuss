# MLX LM Server Management
#
# Targets:
#   setup   - Create Python venv and install forked mlx-lm
#   start   - Start the MLX LM server in the background
#   stop    - Stop the running MLX LM server
#   restart - Stop and start the server
#   status  - Check if the server is running
#   clean   - Remove the virtual environment and PID file
#   logs    - Tail the server output (if logging is enabled)

SHELL := /bin/bash
SCRIPTS_DIR := scripts
PID_FILE := .mlx-server.pid
LOG_FILE := .mlx-server.log
VENV_DIR := .venv

.PHONY: setup start stop restart status clean logs

setup:
	@bash "$(SCRIPTS_DIR)/setup.sh"

start:
	@bash "$(SCRIPTS_DIR)/start.sh"

stop:
	@bash "$(SCRIPTS_DIR)/stop.sh"

restart: stop start

status:
	@if [ -f "$(PID_FILE)" ]; then \
		PID=$$(cat "$(PID_FILE)"); \
		if kill -0 "$$PID" 2>/dev/null; then \
			echo "MLX LM server is running (PID $$PID)"; \
		else \
			echo "MLX LM server is not running (stale PID file)"; \
		fi; \
	else \
		echo "MLX LM server is not running (no PID file)"; \
	fi

clean: stop
	@rm -rf "$(VENV_DIR)"
	@echo "Cleaned up virtual environment."

logs:
	@if [ -f "$(LOG_FILE)" ]; then \
		tail -f "$(LOG_FILE)"; \
	else \
		echo "No log file found. Start the server first with 'make start'."; \
	fi
