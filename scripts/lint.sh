#!/bin/bash
set -e

ROOT="$(dirname "$0")/.."
PROJECT="$PWD"

FILES=("$PROJECT/src/**/*.{ts,tsx,js,jsx}")
if [ -d ./tests ]; then
  FILES+=("$PROJECT/tests/**/*.{ts,tsx,js,jsx}")
fi

cd "$ROOT"
ESLINT_USE_FLAT_CONFIG=1 eslint -c eslint.config.js --cache --cache-location "$PROJECT/node_modules/.cache/eslint-cache" "$@" "${FILES[@]}"
