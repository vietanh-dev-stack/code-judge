# Build from monorepo root: docker build -f apps/web/Dockerfile .
# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json ./
COPY apps/web/package.json ./apps/web/

RUN npm install

COPY apps/web ./apps/web
# Repo may omit `public/` (no static assets yet); COPY in runner stage requires this path to exist.
RUN mkdir -p /app/apps/web/public

ARG NEXT_PUBLIC_CORE_URL=http://localhost:3000
ENV NEXT_PUBLIC_CORE_URL=${NEXT_PUBLIC_CORE_URL}

RUN npm run build -w @code-judge/web

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

# Standalone output: `server.js` at `.next/standalone` root (outputFileTracingRoot = apps/web).
# Tracing omits hoisted workspace deps under `/app/node_modules` — copy them so `require('next')` works.
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/static ./.next/static
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/public ./public

USER nodejs

EXPOSE 3001

CMD ["node", "server.js"]
