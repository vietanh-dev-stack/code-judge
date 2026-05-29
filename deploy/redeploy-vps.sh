#!/usr/bin/env bash
# Redeploy production sau sync code / sửa migration / sửa env.
# Chạy trên VPS Ubuntu, trong thư mục gốc repo (cùng cấp docker-compose.production.yml).
#
#   chmod +x deploy/redeploy-vps.sh
#   ./deploy/redeploy-vps.sh
#
# Tuỳ chọn:
#   RUN_SEED=0 ./deploy/redeploy-vps.sh          # không seed sau migrate
#   SKIP_MIGRATE=1 ./deploy/redeploy-vps.sh      # bỏ bước migrate (đã chạy tay)
#   BUILD_WEB_NOCACHE=1 ./deploy/redeploy-vps.sh # rebuild web không cache (đổi NEXT_PUBLIC_*)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — tạo từ .env.production.example và sửa secret."
  exit 1
fi

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

# shellcheck source=compose-production-args.sh
source "$ROOT_DIR/deploy/compose-production-args.sh"
COMPOSE=(docker compose "${COMPOSE_PROD_ARGS[@]}" --env-file "$ENV_FILE")

if [[ "${JUDGE0_USE_CGROUP:-false}" == "true" ]]; then
  echo "==> Judge0 mode: isolate thật (không dùng isolate_stub mount)"
else
  echo "==> [1/7] Chuẩn hoá script Judge0 stub (CRLF + quyền thực thi)"
  if [[ -f scripts/isolate_stub.sh ]]; then
    sed -i 's/\r$//' scripts/isolate_stub.sh scripts/sudo_stub.sh 2>/dev/null || true
    chmod +x scripts/isolate_stub.sh scripts/sudo_stub.sh
  fi
fi
chmod +x deploy/*.sh 2>/dev/null || true

echo "==> [2/7] Kiểm tra thư mục prisma/migrations (tránh P3015)"
MIG_DIR="apps/core-api/prisma/migrations"
shopt -s nullglob
for d in "$MIG_DIR"/20*; do
  if [[ -d "$d" ]] && [[ ! -f "$d/migration.sql" ]]; then
    echo "    Xóa thư mục thiếu migration.sql: $d"
    rm -rf "$d"
  fi
done
shopt -u nullglob

echo "    Các migration hợp lệ:"
find "$MIG_DIR" -name migration.sql -print | sort

echo "==> [3/7] Trạng thái migration trong DB (nếu app-db đang chạy)"
if "${COMPOSE[@]}" ps -q app-db 2>/dev/null | grep -q .; then
  "${COMPOSE[@]}" exec -T app-db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c \
    'SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at;' 2>/dev/null || \
    echo "    (không đọc được _prisma_migrations — có thể DB mới hoặc sai mật khẩu)"
else
  echo "    app-db chưa chạy — bỏ qua"
fi

if [[ "${SKIP_MIGRATE:-}" != "1" ]]; then
  echo "==> [4/7] Build image migrate"
  "${COMPOSE[@]}" build migrate

  echo "==> [5/7] Chạy migrate (deploy + seed nếu không RUN_SEED=0)"
  if ! "${COMPOSE[@]}" run --rm migrate; then
    echo ""
    echo "!!! migrate THẤT BẠI — xem log phía trên."
    echo "    P1000: POSTGRES_PASSWORD trong $ENV_FILE không khớp volume DB → ALTER USER hoặc khớp mật khẩu cũ."
    echo "    P3015: thư mục migration thiếu migration.sql → bước [2] hoặc sync lại code từ Windows."
    echo "    Schema đã tồn tại / conflict tên migration: xem deploy/README.md § Redeploy migration."
    exit 1
  fi
else
  echo "==> [4-5/7] Bỏ qua migrate (SKIP_MIGRATE=1)"
fi

echo "==> [6/7] Build và khởi động stack"
if [[ "${BUILD_WEB_NOCACHE:-}" == "1" ]]; then
  "${COMPOSE[@]}" build web --no-cache
fi
"${COMPOSE[@]}" up -d --build

echo "==> [7/7] Trạng thái service"
"${COMPOSE[@]}" ps

if [[ "${JUDGE0_USE_CGROUP:-false}" == "true" ]]; then
  echo "==> Judge0 isolate --init"
  "${COMPOSE[@]}" exec -T judge0-worker /usr/local/bin/isolate --init 2>/dev/null || true
fi

echo ""
echo "Done. Kiểm tra:"
echo "  curl -sI https://api.code-judge.io.vn/tags | head -3   # đổi domain nếu cần"
echo "  ${COMPOSE[*]} logs worker --tail 30"
echo "  Trình duyệt: API phải là https://api... (rebuild web nếu vẫn thấy :8080)"
