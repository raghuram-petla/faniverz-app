#!/bin/bash
set -e

echo "🎬 Faniverz → Android Production Build"
echo "========================================"

# 1. Quality gates
echo ""
echo "▸ Running quality gates..."
npx eslint . --quiet
npx tsc --noEmit
echo "  ✓ Lint & types passed"

# 2. Build production (Play Store distribution)
echo ""
echo "▸ Building Android production..."
echo "  Package:  com.faniverz.app"
echo "  App name: Faniverz"
# Builds locally — no EAS cloud credits needed
eas build --platform android --profile production --local

echo ""
echo "========================================"
echo "✓ Production build complete! .aab file saved in project root."
