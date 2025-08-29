# ---- deps
FROM oven/bun:1.1 AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# ---- app (runtime)
FROM oven/bun:1.1
WORKDIR /app
ENV NODE_ENV=production

# Pastikan libssl3 tersedia untuk Prisma engine
RUN apt-get update \
  && apt-get install -y --no-install-recommends libssl3 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma client for production
RUN bunx prisma generate

EXPOSE 3001
CMD sh -c "bunx prisma migrate deploy && bun src/index.ts"
