#!/usr/bin/env bash
# Deploy / update production stack on Ubuntu 24.04 LTS x64 VPS.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"

if [[ -f /etc/os-release ]]; then
  # shellcheck source=/dev/null
  source /etc/os-release
  if [[ "${ID:-}" == "ubuntu" ]] && [[ "${VERSION_ID:-}" == "24.04" ]]; then
    echo "==> Target: Ubuntu 24.04 LTS ($(uname -m))"
  else
    echo "==> Host: ${PRETTY_NAME:-unknown} ($(uname -m))"
    echo "    Stack is intended for Ubuntu 24.04 LTS x64."
  fi
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from .env.production.example and edit secrets."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin not found. Run: ./deploy/ubuntu-24.04-setup.sh"
  exit 1
fi

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

echo "==> Building and starting production stack ($COMPOSE_FILE)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

echo "==> Service status"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

HTTP_PORT="${HTTP_PORT:-80}"
API_HTTP_PORT="${API_HTTP_PORT:-8080}"

echo ""
echo "Done."
echo "  Web:  http://<VPS_IP>:${HTTP_PORT}/"
echo "  API:  http://<VPS_IP>:${API_HTTP_PORT}/  (hoặc subdomain api.* trên :80)"
echo ""
echo "Judge0 lần đầu có thể mất 2–5 phút. Theo dõi:"
echo "  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f judge0-server"
echo "  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f core-api"
