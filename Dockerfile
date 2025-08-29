# ---- deps
FROM oven/bun:1.1 AS deps
WORKDIR /app

# HANYA copy package.json (tanpa bun.lockb)
COPY package.json ./
RUN bun install --frozen-lockfile || bun install

# ---- app (runtime)
FROM oven/bun:1.1
WORKDIR /app
ENV NODE_ENV=production

# Prisma butuh libssl3 (untuk engine debian-openssl-3.0.x)
RUN apt-get update \
  && apt-get install -y --no-install-recommends libssl3 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# (Opsional, tapi bagus): generate prisma client di image
RUN bunx prisma generate

EXPOSE 3001
# Jalankan migrasi & start
CMD sh -c "bunx prisma migrate deploy && bun src/index.ts"
