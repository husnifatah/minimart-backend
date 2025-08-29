# ---- deps
FROM oven/bun:1.1 AS deps
WORKDIR /app
COPY package.json ./
RUN bun install --frozen-lockfile || bun install

# ---- runtime
FROM oven/bun:1.1
WORKDIR /app
ENV NODE_ENV=production

# install openssl (dibutuhkan prisma binary)
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# generate prisma client
RUN bunx prisma generate

# Cloud Run / Railway inject $PORT (default 8080)
EXPOSE 8080

# start (pakai package.json "start" script)
CMD ["bun", "start"]
