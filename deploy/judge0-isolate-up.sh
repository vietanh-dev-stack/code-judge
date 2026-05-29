#!/usr/bin/env bash
# Bật Judge0 isolate thật (cgroup v1 trên host). Chạy trên VPS sau khi đã reboot với
# systemd.unified_cgroup_hierarchy=0 — xem docs/JUDGE0-CGROUP-V1-MIGRATION.md
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
BASE_COMPOSE="docker-compose.production.yml"
ISOLATE_COMPOSE="docker-compose.production-judge0-isolate.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

if [[ "${JUDGE0_USE_CGROUP:-false}" != "true" ]]; then
  echo "==> Setting JUDGE0_USE_CGROUP=true in $ENV_FILE"
  if grep -q '^JUDGE0_USE_CGROUP=' "$ENV_FILE" 2>/dev/null; then
    sed -i 's/^JUDGE0_USE_CGROUP=.*/JUDGE0_USE_CGROUP=true/' "$ENV_FILE"
  else
    echo "" >> "$ENV_FILE"
    echo "# Judge0 isolate thật (cgroup v1 host)" >> "$ENV_FILE"
    echo "JUDGE0_USE_CGROUP=true" >> "$ENV_FILE"
  fi
  set -a && source "$ENV_FILE" && set +a
fi

if [[ ! -d /sys/fs/cgroup/memory ]] && [[ ! -f /sys/fs/cgroup/cgroup.controllers ]]; then
  echo "WARN: cgroup layout không giống v1/v2 quen thuộc — đảm bảo đã reboot sau GRUB."
fi

echo "==> Recreate Judge0 + worker (isolate thật, không stub)"
docker compose \
  -f "$BASE_COMPOSE" \
  -f "$ISOLATE_COMPOSE" \
  --env-file "$ENV_FILE" \
  up -d --force-recreate judge0-server judge0-worker worker

echo "==> isolate --init (judge0-worker)"
docker compose \
  -f "$BASE_COMPOSE" \
  -f "$ISOLATE_COMPOSE" \
  --env-file "$ENV_FILE" \
  exec -T judge0-worker /usr/local/bin/isolate --init || true

echo "==> Kiểm tra binary isolate (không phải bash stub)"
docker exec cj-prod-judge0-worker head -n 1 /usr/local/bin/isolate || true

echo "==> Smoke: Judge0 languages"
docker compose \
  -f "$BASE_COMPOSE" \
  -f "$ISOLATE_COMPOSE" \
  --env-file "$ENV_FILE" \
  exec -T judge0-server curl -sf http://127.0.0.1:2358/languages >/dev/null \
  && echo "Judge0 API OK" \
  || echo "WARN: Judge0 /languages failed — xem logs: docker logs cj-prod-judge0-worker --tail 80"

echo "Done. Nếu Internal Error: host chưa cgroup v1 — xem docs/JUDGE0-CGROUP-V1-MIGRATION.md"
