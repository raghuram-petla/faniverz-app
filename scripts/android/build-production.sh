#!/bin/bash
set -e

echo "🎬 Faniverz → Android Production Build"
echo "========================================"

# 1. Install dependencies
echo ""
echo "▸ Installing dependencies..."
yarn install --frozen-lockfile --silent
echo "  ✓ Dependencies installed"

# 2. Quality gates
echo ""
echo "▸ Running quality gates..."
npx eslint . --quiet
npx tsc --noEmit
echo "  ✓ Lint & types passed"

# 3. Build production (Play Store distribution)
echo ""
echo "▸ Building Android production..."
echo "  Package:  com.faniverz.app"
echo "  App name: Faniverz"
# Builds locally — no EAS cloud credits needed
eas build --platform android --profile production --local

echo ""
echo "========================================"
echo "✓ Production build complete! .aab file saved in project root."
