#!/usr/bin/env bash
# Source từ deploy scripts sau khi `source .env.production`.
# Thêm file override isolate khi JUDGE0_USE_CGROUP=true.
#
#   source deploy/compose-production-args.sh
#   docker compose "${COMPOSE_PROD_ARGS[@]}" --env-file .env.production up -d

COMPOSE_PROD_BASE="${COMPOSE_PROD_BASE:-docker-compose.production.yml}"
COMPOSE_PROD_ISOLATE="${COMPOSE_PROD_ISOLATE:-docker-compose.production-judge0-isolate.yml}"

COMPOSE_PROD_ARGS=(-f "$COMPOSE_PROD_BASE")
if [[ "${JUDGE0_USE_CGROUP:-false}" == "true" ]]; then
  COMPOSE_PROD_ARGS+=(-f "$COMPOSE_PROD_ISOLATE")
fi
