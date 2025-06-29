#!/bin/bash
set -e

# Activate venv (assumes venv is in .venv in this directory)
source venv/bin/activate

# Default doc_count is 8300, can be overridden by first argument
DOC_COUNT=${1:-8300}

python flatten.py --doc_count "$DOC_COUNT"
