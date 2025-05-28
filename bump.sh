#!/bin/bash

# Bump script - patches version for all packages
# This script walks through every packages/* subfolder and runs pnpm version patch
# Usage: ./bump.sh patch|minor|major

set -e  # Exit on any error

echo "🚀 Starting bump process for all packages..."
echo ""

BUMP_TYPE="patch"  # Default bump type

# Check if a bump type is provided
if [ $# -gt 0 ]; then
    case "$1" in
        patch|minor|major)
            BUMP_TYPE="$1"
            ;;
        *)
            echo "❌ Error: Invalid bump type '$1'. Use 'patch', 'minor', or 'major'."
            exit 1
            ;;
    esac
fi

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
    
    folder_name=$(basename "$package_dir")
    processed_packages=$((processed_packages + 1))
    
    echo "[$processed_packages/$total_packages] 📝 Processing package: $folder_name"
    
    # Check if package.json exists in the directory
    if [ ! -f "$package_dir/package.json" ]; then
        echo "   ⚠️  Warning: No package.json found in $folder_name, skipping..."
        echo ""
        continue
    fi
    
    # Extract the actual package name from package.json for display
    package_name=$(node -p "require('$package_dir/package.json').name" 2>/dev/null || echo "$folder_name")
    
    # Change to package directory and run version command
    echo "   🔄 Running: pnpm version $BUMP_TYPE (in $folder_name)"
    
    # Store current directory and change to package directory
    pushd "$package_dir" > /dev/null
    
    # Run version command and capture output
    if version_output=$(pnpm version "$BUMP_TYPE" --no-git-tag-version 2>&1); then
        echo "   ✅ Successfully bumped $BUMP_TYPE version for $package_name ($folder_name)"
        # Extract the new version from output if available
        new_version=$(echo "$version_output" | grep -E "^v[0-9]" | head -1)
        if [ -n "$new_version" ]; then
            echo "   📌 New version: $new_version"
        fi
    else
        # Check if version was actually bumped despite the error
        if echo "$version_output" | grep -q "^v[0-9]"; then
            echo "   ✅ Successfully bumped $BUMP_TYPE version for $package_name ($folder_name)"
            new_version=$(echo "$version_output" | grep -E "^v[0-9]" | head -1)
            if [ -n "$new_version" ]; then
                echo "   📌 New version: $new_version"
            fi
            echo "   ⚠️  Note: Some warnings occurred but version was bumped successfully"
        else
            echo "   ❌ Failed to bump $BUMP_TYPE version for $package_name ($folder_name)"
            echo "   Error output: $version_output"
            popd > /dev/null
            exit 1
        fi
    fi
    
    # Return to original directory
    popd > /dev/null
    
    echo ""
done

pnpm update
pnpm install
echo "🔄 Updating dependencies and installing packages..."

echo "🎉 Bump process completed successfully!"
echo "📋 Summary: Processed $processed_packages packages"
echo ""
echo "Next steps:"
echo "1. Review the version changes"
echo "2. Commit the changes: git add . && git commit -m 'chore: bump patch versions'"
echo "3. Push to repository: git push"