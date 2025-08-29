# ---- deps (install node_modules)
FROM oven/bun:1.1 AS deps
WORKDIR /app
# kalau kamu TIDAK punya bun.lockb di repo:
COPY package.json ./
RUN bun install --frozen-lockfile || bun install
# kalau kamu PUNYA bun.lockb, lebih bagus:
# COPY package.json bun.lockb ./
# RUN bun install --frozen-lockfile

# ---- runtime app
FROM oven/bun:1.1
WORKDIR /app
ENV NODE_ENV=production

# Debian 11 (bullseye) -> OpenSSL 1.1
RUN apt-get update \
  && apt-get install -y --no-install-recommends libssl1.1 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma client generate dengan binaryTargets di schema.prisma
RUN bunx prisma generate

# Gunakan PORT dari environment (Railway/Render sering set ke 8080)
EXPOSE 3001
CMD sh -c "bunx prisma migrate deploy && bun src/index.ts"
