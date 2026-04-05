#!/bin/bash
set -e

echo "🎬 Faniverz → TestFlight Deploy"
echo "================================"

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

# 3. Build
echo ""
echo "▸ Building iOS production..."
# Builds locally — no EAS cloud credits needed
eas build --platform ios --profile production --local

# 4. Submit the most recent .ipa to TestFlight (without notifying testers)
IPA_FILE=$(ls -t build-*.ipa 2>/dev/null | head -1)
if [ -z "$IPA_FILE" ]; then
  echo "  ✗ No .ipa file found"
  exit 1
fi
echo ""
echo "▸ Submitting $IPA_FILE to TestFlight..."
eas submit --platform ios --profile production --path "$IPA_FILE" --non-interactive

echo ""
echo "================================"
echo "✓ Submitted to App Store Connect"
echo "  Internal testers: auto-distributed after Apple's processing (~5-15 min)."
echo "  External testers: manually distribute in App Store Connect → TestFlight."
