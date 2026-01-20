#!/bin/bash

# Release script - publishes all packages
# This script walks through every packages/* subfolder and runs pnpm publish --access public
# Usage: ./release.sh

set -e  # Exit on any error

echo "🚀 Starting release process for all packages..."
echo ""

# Get the absolute path to the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGES_DIR="$SCRIPT_DIR/packages"

# Check if packages directory exists
if [ ! -d "$PACKAGES_DIR" ]; then
    echo "❌ Error: packages/ directory not found at $PACKAGES_DIR"
    exit 1
fi

# Counter for tracking progress
total_packages=0
processed_packages=0

# First, count total packages
for package_dir in "$PACKAGES_DIR"/*; do
    if [ -d "$package_dir" ] && [ "$(basename "$package_dir")" != ".DS_Store" ]; then
        total_packages=$((total_packages + 1))
    fi
done

echo "📦 Found $total_packages packages to process"
echo ""

# Process each package directory
for package_dir in "$PACKAGES_DIR"/*; do
    # Skip if not a directory or if it's .DS_Store
    if [ ! -d "$package_dir" ] || [ "$(basename "$package_dir")" = ".DS_Store" ]; then
        continue
    fi
    
    package_name=$(basename "$package_dir")
    processed_packages=$((processed_packages + 1))
    
    echo "[$processed_packages/$total_packages] 📝 Processing package: $package_name"
    
    # Check if package.json exists in the directory
    if [ ! -f "$package_dir/package.json" ]; then
        echo "   ⚠️  Warning: No package.json found in $package_name, skipping..."
        echo ""
        continue
    fi
    
    # Change to package directory and run publish
    echo "   🔄 Running: pnpm publish --access public"
    
    if cd "$package_dir" && pnpm publish --access public; then
        echo "   ✅ Successfully published $package_name"
    else
        echo "   ❌ Failed to publish $package_name"
        # Don't exit on publish failure, continue with other packages
        echo "   ⚠️  Continuing with next package..."
    fi
    
    # Return to script directory
    cd "$SCRIPT_DIR"
    echo ""
done

echo "🎉 Release process completed!"
echo "📋 Summary: Processed $processed_packages packages"
echo ""
echo "Next steps:"
echo "1. Check npm registry to verify packages were published"
echo "2. Update any dependent projects to use new versions"
