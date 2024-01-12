#!/bin/bash
set -e

PKG="$1"

if [ -z "$PKG" ] || ! [ -d "libs/$PKG" ]; then
  >&2 echo "E: First argument must be a directory under libs/ for which to view docs"
  exit 1
fi

if ! [ -d "libs/$PKG/docs" ]; then
  pnpm --filter "./libs/$PKG" docgen
fi

pnpm http-server -o -p 3333 "./libs/$PKG/docs"