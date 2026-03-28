#!/bin/bash
set -e

echo "🎬 Faniverz → TestFlight Deploy"
echo "================================"

# 1. Quality gates
echo ""
echo "▸ Running quality gates..."
npx eslint . --quiet
npx tsc --noEmit
echo "  ✓ Lint & types passed"

# 2. Build
echo ""
echo "▸ Building iOS production..."
# Builds locally — no EAS cloud credits needed
eas build --platform ios --profile production --local

# 3. Submit the local .ipa to TestFlight
echo ""
echo "▸ Submitting to TestFlight..."
eas submit --platform ios --path build-*.ipa --non-interactive

echo ""
echo "================================"
echo "✓ Deployed to TestFlight!"
