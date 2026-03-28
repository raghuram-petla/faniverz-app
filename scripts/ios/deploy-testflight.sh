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

# 3. Submit the most recent .ipa to TestFlight
IPA_FILE=$(ls -t build-*.ipa 2>/dev/null | head -1)
if [ -z "$IPA_FILE" ]; then
  echo "  ✗ No .ipa file found"
  exit 1
fi
echo ""
echo "▸ Submitting $IPA_FILE to TestFlight..."
eas submit --platform ios --path "$IPA_FILE" --non-interactive

echo ""
echo "================================"
echo "✓ Deployed to TestFlight!"
