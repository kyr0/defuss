#!/bin/bash

# Release script - patches version for all packages
# This script walks through every packages/* subfolder and runs pnpm version patch

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
    
    # Use pnpm --filter to run version patch from the workspace root
    echo "   🔄 Running: pnpm --filter $package_name version patch"
    
    if pnpm --filter "$package_name" version patch; then
        echo "   ✅ Successfully patched version for $package_name"
    else
        echo "   ❌ Failed to patch version for $package_name"
        exit 1
    fi
    
    echo ""
done

echo "🎉 Release process completed successfully!"
echo "📋 Summary: Processed $processed_packages packages"
echo ""
echo "Next steps:"
echo "1. Review the version changes"
echo "2. Commit the changes: git add . && git commit -m 'chore: bump patch versions'"
echo "3. Push to repository: git push"