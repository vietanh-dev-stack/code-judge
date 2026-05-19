# Build from monorepo root: docker build -f apps/core-api/Dockerfile .
# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS base

RUN apt-get update && apt-get install -y openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS builder

COPY package.json ./
COPY apps/core-api/package.json ./apps/core-api/

RUN npm install

COPY apps/core-api ./apps/core-api

WORKDIR /app/apps/core-api

RUN npx prisma generate
RUN npm run build

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app/apps/core-api

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/core-api/node_modules ./node_modules
COPY --from=builder /app/apps/core-api/dist ./dist
COPY --from=builder /app/apps/core-api/prisma ./prisma
COPY --from=builder /app/apps/core-api/package.json ./package.json
COPY --from=builder /app/package.json /app/package.json

EXPOSE 3000

CMD ["node", "dist/main.js"]

FROM builder AS migrate

WORKDIR /app/apps/core-api

CMD ["npx", "prisma", "migrate", "deploy"]
