#!/bin/bash
set -e

echo "🎬 Faniverz → iOS Production Build"
echo "===================================="

# 1. Quality gates
echo ""
echo "▸ Running quality gates..."
npx eslint . --quiet
npx tsc --noEmit
echo "  ✓ Lint & types passed"

# 2. Build production (App Store distribution)
echo ""
echo "▸ Building iOS production..."
echo "  Bundle ID: com.faniverz.app"
echo "  App name:  Faniverz"
# Builds locally — no EAS cloud credits needed
eas build --platform ios --profile production --local

echo ""
echo "===================================="
echo "✓ Production build complete!"
