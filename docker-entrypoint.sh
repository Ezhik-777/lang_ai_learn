#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "FATAL: DATABASE_URL is not set" >&2
  exit 1
fi

node ./scripts/migrate.mjs

echo "→ starting Next.js"
exec node server.js
