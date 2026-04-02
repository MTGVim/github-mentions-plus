#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "Usage: bash scripts/release-tag.sh <version>" >&2
  echo "Example: bash scripts/release-tag.sh 1.1.0" >&2
  exit 1
fi

if [[ ! "$VERSION" =~ ^[0-9]+(\.[0-9]+){1,2}$ ]]; then
  echo "Version must look like 1.1.0" >&2
  exit 1
fi

TAG="v$VERSION"
CURRENT_BRANCH="$(git branch --show-current)"

if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "Run releases from main. Current branch: $CURRENT_BRANCH" >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree is not clean. Commit or stash changes first." >&2
  exit 1
fi

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists locally." >&2
  exit 1
fi

if git ls-remote --tags origin "refs/tags/$TAG" | grep -q "$TAG"; then
  echo "Tag $TAG already exists on origin." >&2
  exit 1
fi

CURRENT_VERSION="$(sed -n 's/.*"version":[[:space:]]*"\([^"]*\)".*/\1/p' manifest.json | head -n 1)"
if [[ "$CURRENT_VERSION" == "$VERSION" ]]; then
  echo "manifest.json is already at version $VERSION"
else
  node -e '
    const fs = require("fs");
    const path = "manifest.json";
    const manifest = JSON.parse(fs.readFileSync(path, "utf8"));
    manifest.version = process.argv[1];
    fs.writeFileSync(path, `${JSON.stringify(manifest, null, "\t")}\n`);
  ' "$VERSION"
fi

git add manifest.json
git commit -m "Bump version to $VERSION"
git tag "$TAG"
git push origin main
git push origin "$TAG"

echo "Released version $VERSION with tag $TAG"
