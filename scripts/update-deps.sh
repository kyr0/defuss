#!/bin/bash

# Script to update defuss-* packages to either:
#   - workspace:* (for local development)
#   - latest npm versions (for publishing/testing)
#
# Usage:
#   ./scripts/update-deps-latest.sh workspace   # Set to workspace:*
#   ./scripts/update-deps-latest.sh latest      # Update to latest npm versions

set -e

cd "$(dirname "$0")/.."

MODE="${1:-workspace}"

echo "🔍 Discovering package names from packages/*..."

# Build the list of package names
PACKAGES=""
for d in packages/*/; do
  if [ -f "$d/package.json" ]; then
    NAME=$(cat "$d/package.json" | grep -o '"name": "[^"]*"' | head -1 | sed 's/"name": "//;s/"//')
    if [ -n "$NAME" ]; then
      PACKAGES="$PACKAGES $NAME"
      echo "  Found: $NAME"
    fi
  fi
done

if [ -z "$PACKAGES" ]; then
  echo "❌ No packages found!"
  exit 1
fi

echo ""

case "$MODE" in
  workspace|w)
    echo "📦 Setting workspace:* for all packages..."
    echo ""
    # Build args with @workspace:*
    ARGS=""
    for pkg in $PACKAGES; do
      ARGS="$ARGS ${pkg}@workspace:*"
    done
    pnpm add -r $ARGS --filter "./examples/*" --filter "./packages/*"
    echo ""
    echo "✅ Done! All defuss packages now use workspace:* references."
    ;;
  latest|l)
    echo "📦 Updating all packages to latest npm versions..."
    echo ""
    pnpm update -r --latest $PACKAGES
    echo ""
    echo "✅ Done! All defuss packages updated to latest npm versions."
    ;;
  *)
    echo "❌ Unknown mode: $MODE"
    echo ""
    echo "Usage:"
    echo "  $0 workspace   # Set to workspace:* (or 'w')"
    echo "  $0 latest      # Update to latest npm versions (or 'l')"
    exit 1
    ;;
esac
