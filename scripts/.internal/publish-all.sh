#!/bin/bash
set -e

if ! command -v jq &> /dev/null; then
  >&2 echo "E: jq not found. You must install jq to use this script"
  exit 1
fi

ROOT="$(dirname "$0")/../.."

for pkg in "$ROOT/libs"/*; do
  (
    cd "$pkg"
    PKG_NAME="$(jq -r .name package.json)"
    NEW_VERSION="$(jq -r .version package.json)"
    PUBLISHED_VERSION="$(pnpm view "$PKG_NAME" version 2>/dev/null || echo "0.0.0")"
    if [ "$NEW_VERSION" != "$PUBLISHED_VERSION" ]; then
      echo "Publishing $PKG_NAME@$NEW_VERSION"
      pnpm publish $@
    else
      echo "$PKG_NAME@$NEW_VERSION already published"
    fi
  )
done