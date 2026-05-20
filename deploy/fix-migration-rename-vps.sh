#!/usr/bin/env bash
# Sửa conflict: DB đã apply migration cũ (migrate_v11), repo chỉ còn db_v1, migrate fail P3018 (Role already exists).
# Chạy trên VPS trong thư mục repo. Không xóa dữ liệu bảng — chỉ sửa _prisma_migrations + thư mục migrations.
#
#   chmod +x deploy/fix-migration-rename-vps.sh
#   ./deploy/fix-migration-rename-vps.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
COMPOSE=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

OLD_NAME="${OLD_MIGRATION_NAME:-20260519064259_migrate_v11}"
NEW_NAME="${NEW_MIGRATION_NAME:-20260520155227_db_v1}"

set -a && source "$ENV_FILE" && set +a

psql_exec() {
  "${COMPOSE[@]}" exec -T app-db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v ON_ERROR_STOP=1 "$@"
}

echo "==> Xóa thư mục migration cũ trên disk (nếu còn)"
rm -rf "apps/core-api/prisma/migrations/${OLD_NAME}"

echo "==> Trạng thái _prisma_migrations (trước)"
psql_exec -c "SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at;"

echo "==> Gỡ migration failed của tên mới (nếu có)"
"${COMPOSE[@]}" run --rm migrate npx prisma migrate resolve --rolled-back "$NEW_NAME" 2>/dev/null || true

echo "==> Gỡ migration failed của tên cũ (nếu có)"
"${COMPOSE[@]}" run --rm migrate npx prisma migrate resolve --rolled-back "$OLD_NAME" 2>/dev/null || true

echo "==> Dọn bản ghi: xóa mọi failed, đổi tên migration đã apply thành công"
psql_exec <<SQL
DELETE FROM "_prisma_migrations" WHERE finished_at IS NULL;
UPDATE "_prisma_migrations"
  SET migration_name = '${NEW_NAME}'
  WHERE migration_name = '${OLD_NAME}' AND finished_at IS NOT NULL;
SQL

if ! psql_exec -tAc "SELECT 1 FROM _prisma_migrations WHERE migration_name = '${NEW_NAME}' AND finished_at IS NOT NULL;" | grep -q 1; then
  echo "==> Đánh dấu ${NEW_NAME} đã apply (schema đã có sẵn)"
  "${COMPOSE[@]}" run --rm migrate npx prisma migrate resolve --applied "$NEW_NAME"
fi

echo "==> Trạng thái sau khi sửa"
psql_exec -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at;"

echo "==> Rebuild image migrate (chỉ còn migration mới trong context)"
"${COMPOSE[@]}" build migrate --no-cache

echo "==> prisma migrate deploy (phải báo không còn migration pending)"
"${COMPOSE[@]}" run --rm migrate npx prisma migrate deploy

echo "Done. Chạy tiếp: RUN_SEED=0 BUILD_WEB_NOCACHE=1 ./deploy/redeploy-vps.sh với SKIP_MIGRATE=1"
