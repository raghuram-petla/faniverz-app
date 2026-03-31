#!/bin/bash
set -e

echo "Faniverz -> Android Preview Build"
echo "==================================="
echo ""
echo "  Package : com.faniverz.app.preview"
echo "  App name: Faniverz Preview"
echo "  Purpose : Production JS bundle, internal distribution."
echo "            Installs alongside Dev and Production. Use this"
echo "            to verify production behaviour before Play Store."
echo ""

# Quality gates
echo "Running quality gates..."
npx eslint . --quiet
npx tsc --noEmit
echo "  Lint & types passed"
echo ""

# Build
echo "Building Android preview..."
eas build --platform android --profile preview --local

echo ""
echo "==================================="
echo "Preview build complete. Install the .apk on your device via:"
echo ""
echo "  adb install <path>.apk"
