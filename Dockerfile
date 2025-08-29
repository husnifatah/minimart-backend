# ---- deps
FROM oven/bun:1.1 AS deps
WORKDIR /app
COPY package.json ./
RUN bun install --frozen-lockfile || bun install

# ---- runtime
FROM oven/bun:1.1
WORKDIR /app
ENV NODE_ENV=production

# (Kita sudah pakai Debian bullseye & prisma binary 1.1.x)
RUN apt-get update \
  && apt-get install -y --no-install-recommends libssl1.1 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma client (schema sudah pakai binaryTargets = ["native", "debian-openssl-1.1.x"])
RUN bunx prisma generate

# Cloud Run default: 8080
EXPOSE 8080

# Migrasi + start (Cloud Run akan inject $PORT)
CMD sh -c "bunx prisma migrate deploy && bun src/index.ts"
