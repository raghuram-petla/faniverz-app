#!/bin/bash
set -e

echo "Faniverz -> iOS Preview Build"
echo "=============================="
echo ""
echo "  Bundle ID : com.faniverz.app.preview"
echo "  App name  : Faniverz Preview"
echo "  Purpose   : Production JS bundle, internal distribution."
echo "              Installs alongside Dev and Production. Use this"
echo "              to verify production behaviour before TestFlight."
echo ""

# Quality gates
echo "Running quality gates..."
npx eslint . --quiet
npx tsc --noEmit
echo "  Lint & types passed"
echo ""

# Build
echo "Building iOS preview..."
eas build --platform ios --profile preview --local

echo ""
echo "=============================="
echo "Preview build complete. Install the .ipa on your device via:"
echo ""
echo "  xcrun devicectl device install app --device <UDID> <path>.ipa"
echo ""
echo "Or drag the .ipa into Apple Configurator 2."
