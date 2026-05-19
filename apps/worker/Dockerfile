# Build from monorepo root: docker build -f apps/worker/Dockerfile .
# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS base

RUN apt-get update && apt-get install -y python3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS builder

COPY package.json ./
COPY apps/worker/package.json ./apps/worker/
COPY apps/core-api/package.json ./apps/core-api/

RUN npm install

COPY apps/core-api/prisma ./apps/core-api/prisma
COPY apps/worker ./apps/worker

WORKDIR /app/apps/worker

RUN npx prisma generate --schema ../core-api/prisma/schema.prisma
RUN npm run build

FROM base AS runner

ENV NODE_ENV=production

WORKDIR /app/apps/worker

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/worker/node_modules ./node_modules
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/package.json ./package.json
COPY --from=builder /app/package.json /app/package.json

CMD ["node", "dist/index.js"]
