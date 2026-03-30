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

OUT_DIR="$RELEASE_DIR/$PACKAGE_NAME"
ZIP_PATH="$RELEASE_DIR/$PACKAGE_NAME-v$VERSION.zip"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
rm -f "$ZIP_PATH"

cp "$ROOT_DIR/manifest.json" "$OUT_DIR/"
cp "$ROOT_DIR/background.js" "$OUT_DIR/"
cp "$ROOT_DIR/content_script.js" "$OUT_DIR/"
cp -R "$ROOT_DIR/browserAction" "$OUT_DIR/"
cp -R "$ROOT_DIR/content" "$OUT_DIR/"
cp -R "$ROOT_DIR/icons" "$OUT_DIR/"
cp -R "$ROOT_DIR/utils" "$OUT_DIR/"

(
  cd "$OUT_DIR"
  zip -qr "$ZIP_PATH" .
)

echo "Created: $ZIP_PATH"
