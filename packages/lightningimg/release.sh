#!/bin/bash

# Release script for lightningimg
# This script handles the .gitignore files in WASM pkg directories to ensure
# all necessary files are included in the npm package

set -e  # Exit on any error

echo "🚀 Starting release process..."

# Function to backup .gitignore files
backup_gitignore() {
    local dir=$1
    if [ -f "$dir/.gitignore" ]; then
        echo "📦 Backing up $dir/.gitignore"
        mv "$dir/.gitignore" "$dir/_gitignore_bck"
    else
        echo "⚠️  No .gitignore found in $dir"
    fi
}

# Function to restore .gitignore files
restore_gitignore() {
    local dir=$1
    if [ -f "$dir/_gitignore_bck" ]; then
        echo "🔄 Restoring $dir/.gitignore"
        mv "$dir/_gitignore_bck" "$dir/.gitignore"
    else
        echo "⚠️  No backup .gitignore found in $dir"
    fi
}

# Function to cleanup on exit (success or failure)
cleanup() {
    echo "🧹 Cleaning up..."
    restore_gitignore "lightningimg-wasm/pkg"
    restore_gitignore "lightningimg-wasm/pkg-bundler"
    restore_gitignore "lightningimg-wasm/pkg-node"
    echo "✅ Cleanup completed"
}

# Set trap to ensure cleanup happens even if script fails
trap cleanup EXIT

echo "📋 Step 1: Backing up .gitignore files..."
backup_gitignore "lightningimg-wasm/pkg"
backup_gitignore "lightningimg-wasm/pkg-bundler"
backup_gitignore "lightningimg-wasm/pkg-node"

echo "📋 Step 2: Publishing to npm with git checks disabled..."
pnpm publish --no-git-checks

echo "🎉 Release completed successfully!"
echo "📝 Note: .gitignore files will be automatically restored by the cleanup function"