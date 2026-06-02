# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone Next.js output (включает только то что нужно для server.js)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Programmatic Drizzle migrator: явно подкладываем drizzle-orm + pg в top-level node_modules,
# потому что Next standalone их не трейсит (migrator не импортируется server-кодом).
COPY --from=builder --chown=nextjs:nodejs /app/lib/db/migrations ./lib/db/migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./migrator_modules/drizzle-orm
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg ./migrator_modules/pg
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg-pool ./migrator_modules/pg-pool
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg-types ./migrator_modules/pg-types
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg-connection-string ./migrator_modules/pg-connection-string
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg-protocol ./migrator_modules/pg-protocol
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg-cloudflare ./migrator_modules/pg-cloudflare
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/postgres-array ./migrator_modules/postgres-array
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/postgres-bytea ./migrator_modules/postgres-bytea
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/postgres-date ./migrator_modules/postgres-date
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/postgres-interval ./migrator_modules/postgres-interval
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/split2 ./migrator_modules/split2
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/xtend ./migrator_modules/xtend

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

USER nextjs
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
