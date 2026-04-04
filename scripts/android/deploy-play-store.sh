#!/bin/bash
set -e

echo "🎬 Faniverz → Play Store Deploy"
echo "================================="

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
echo "▸ Building Android production..."
# Builds locally — no EAS cloud credits needed
eas build --platform android --profile production --local

# 4. Submit the most recent .aab to Play Store
AAB_FILE=$(ls -t build-*.aab 2>/dev/null | head -1)
if [ -z "$AAB_FILE" ]; then
  echo "  ✗ No .aab file found"
  exit 1
fi
echo ""
echo "▸ Submitting $AAB_FILE to Play Store (internal track)..."
eas submit --platform android --path "$AAB_FILE" --non-interactive

echo ""
echo "================================="
echo "✓ Deployed to Play Store (internal track)!"
