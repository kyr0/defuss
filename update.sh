#!/bin/bash

# Update script - updates dependencies and installs packages
# Usage: ./update.sh

pnpm update
pnpm install
echo "🔄 Updating dependencies and installing packages..."