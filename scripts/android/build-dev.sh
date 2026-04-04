#!/bin/bash
set -e

echo "🎬 Faniverz → Android Dev Build"
echo "================================="

# 1. Install dependencies
echo ""
echo "▸ Installing dependencies..."
npm install --silent
echo "  ✓ Dependencies installed"

# 2. Quality gates
echo ""
echo "▸ Running quality gates..."
npx eslint . --quiet
npx tsc --noEmit
echo "  ✓ Lint & types passed"

# 3. Build dev client (internal distribution, separate package)
echo ""
echo "▸ Building Android development client..."
echo "  Package:  com.faniverz.app.dev"
echo "  App name: Faniverz Dev"
# Builds locally — no EAS cloud credits needed
eas build --platform android --profile development --local

echo ""
echo "================================="
echo "✓ Dev build complete! .apk file saved in project root."
echo ""
echo "Install on a connected device via:"
echo "  adb install <path>.apk"
