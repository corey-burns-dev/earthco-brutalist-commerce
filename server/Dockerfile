# ── deps ──────────────────────────────────────────────────────────────────────
FROM oven/bun:1.3.9-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY server/package.json ./server/
RUN bun install --frozen-lockfile

# ── build ─────────────────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app
COPY server/ ./server/
RUN DATABASE_URL="postgresql://x:x@localhost/x" bun run --cwd server prisma:generate
RUN bun run --cwd server build

# ── release ───────────────────────────────────────────────────────────────────
FROM oven/bun:1.3.9-alpine AS release
WORKDIR /app

# Production deps only (using root lockfile)
COPY package.json bun.lock ./
COPY server/package.json ./server/
RUN bun install --frozen-lockfile --production

# Prisma needs the generated client and schema at runtime
# We place these in server/ to match the build stage structure
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/node_modules/.prisma ./server/node_modules/.prisma
COPY --from=build /app/server/node_modules/@prisma ./server/node_modules/@prisma
COPY server/prisma/schema.prisma ./server/prisma/schema.prisma

EXPOSE 3000
ENV NODE_ENV=production

# Run from the server directory or point to it
CMD ["bun", "server/dist/index.js"]
