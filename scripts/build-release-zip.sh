#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/release"
PACKAGE_NAME="github-mentions-plus"

if ! command -v zip >/dev/null 2>&1; then
  echo "zip command is required." >&2
  exit 1
fi

VERSION="$(sed -n 's/.*"version":[[:space:]]*"\([^"]*\)".*/\1/p' "$ROOT_DIR/manifest.json" | head -n 1)"
if [[ -z "$VERSION" ]]; then
  echo "Failed to read version from manifest.json." >&2
  exit 1
fi

npm run build

OUT_DIR="$RELEASE_DIR/$PACKAGE_NAME"
ZIP_PATH="$RELEASE_DIR/$PACKAGE_NAME-v$VERSION.zip"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
rm -f "$ZIP_PATH"

cp "$ROOT_DIR/manifest.json" "$OUT_DIR/"
cp "$ROOT_DIR/background.js" "$OUT_DIR/"
cp "$ROOT_DIR/content.bundle.js" "$OUT_DIR/"
mkdir -p "$OUT_DIR/browserAction"
cp "$ROOT_DIR/browserAction/index.html" "$OUT_DIR/browserAction/"
cp "$ROOT_DIR/browserAction/style.css" "$OUT_DIR/browserAction/"
cp "$ROOT_DIR/browserAction/popup.bundle.js" "$OUT_DIR/browserAction/"
cp -R "$ROOT_DIR/icons" "$OUT_DIR/"
mkdir -p "$OUT_DIR/utils"
cp "$ROOT_DIR/utils/lgtm.js" "$OUT_DIR/utils/"

(
  cd "$OUT_DIR"
  zip -qr "$ZIP_PATH" .
)

echo "Created: $ZIP_PATH"
