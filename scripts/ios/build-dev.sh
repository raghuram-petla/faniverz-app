#!/bin/bash
set -e

echo "🎬 Faniverz → iOS Dev Build"
echo "============================"

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

# 3. Build dev client (internal distribution, separate bundle ID)
echo ""
echo "▸ Building iOS development client..."
echo "  Bundle ID: com.faniverz.app.dev"
echo "  App name:  Faniverz Dev"
# Builds locally — no EAS cloud credits needed
eas build --platform ios --profile development --local

echo ""
echo "============================"
echo "✓ Dev build complete! .ipa file saved in project root."
