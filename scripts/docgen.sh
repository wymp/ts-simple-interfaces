#!/bin/bash
set -e

if [ -d './docs' ]; then
  rm -Rf ./docs
fi
pnpm typedoc src/index.ts --out ./docs --sort visibility --sort source-order