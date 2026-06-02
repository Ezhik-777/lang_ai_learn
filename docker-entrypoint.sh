#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "FATAL: DATABASE_URL is not set" >&2
  exit 1
fi

# Migrator зависит от drizzle-orm/pg которые лежат в /app/migrator_modules — указываем NODE_PATH
NODE_PATH=/app/migrator_modules node ./scripts/migrate.mjs

echo "→ starting Next.js"
exec node server.js
