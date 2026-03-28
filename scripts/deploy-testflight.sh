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
eas build --platform ios --profile production --non-interactive

# 3. Submit
echo ""
echo "▸ Submitting to TestFlight..."
eas submit --platform ios --latest --non-interactive

echo ""
echo "================================"
echo "✓ Deployed to TestFlight!"
