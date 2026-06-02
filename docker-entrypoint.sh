#!/bin/sh
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "FATAL: DATABASE_URL is not set" >&2
  exit 1
fi

echo "→ applying database migrations…"
npx drizzle-kit migrate

echo "→ starting Next.js"
exec node server.js
