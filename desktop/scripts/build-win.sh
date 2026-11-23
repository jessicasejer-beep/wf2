#!/usr/bin/env bash
# Fabrique l'installeur Windows depuis Linux, sans Wine.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./package.json').version")
node scripts/copy-page.js
rm -rf dist
npx electron-builder --win dir --x64
node scripts/set-exe-icon.js
(cd build && makensis -V2 -DVERSION="$VERSION" installer.nsi)
(cd dist/win-unpacked && zip -qr "../Kanban-Projets-Portable-$VERSION.zip" .)
ls -la dist/*.exe dist/*.zip
