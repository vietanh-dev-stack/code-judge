# Prisma seed — dữ liệu mẫu cho dev & test

Script seed tạo lại một bộ bản ghi **cố định** (id/ràng buộc seed) để bạn test API, Postman và worker mà không cần nhập tay.

## Yêu cầu

- Postgres đã chạy (ví dụ `docker compose up -d` ở root repo).
- Đã chạy migration: `npm run prisma:migrate -w @code-judge/core-api`
- Biến `DATABASE_URL` trong `apps/core-api/.env` trỏ đúng DB.

## Lệnh

Từ root monorepo:

```powershell
npm run prisma:seed -w @code-judge/core-api
```

Hoặc trong `apps/core-api`:

```powershell
npx prisma db seed
```

Cấu hình seed nằm trong [`apps/core-api/prisma.config.ts`](../apps/core-api/prisma.config.ts) (`migrations.seed`).

## Hành vi

- **Idempotent theo bộ seed**: trước khi tạo, script **xoá** các bản ghi gắn `seed-*` (users, lớp, enrollment, …) rồi tạo lại. **Không** seed Organization (ngoài phạm vi sản phẩm).
- **Mật khẩu** mặc định cho mọi user seed (bcrypt): `Secret12!`

## Tài khoản

| Email | Role | User id |
|-------|------|---------|
| `admin@seed.local` | ADMIN | `seed-user-admin` |
| `instructor@seed.local` | INSTRUCTOR | `seed-user-instructor` |
| `student@seed.local` | STUDENT | `seed-user-student` |

## Thực thể chính (id cố định)

| Mô tả | Id |
|-------|-----|
| *(Không seed `Organization` — đã bỏ chức năng đa tenant.)* | — |
| Problem ALGO | `seed-problem-algo` (slug `two-sum-seed`) |
| Problem PROJECT | `seed-problem-project` (slug `hello-cli-seed`) |
| Contest | `seed-contest-winter` (slug `winter-seed-2026`) |
| Lớp | `seed-class-cpp` — mã join `SEEDCPP2026` |
| Golden solution | `seed-golden-001` |
| AI generation job | `seed-ai-job-001` |
| Report export job | `seed-export-001` |

Hai tag mẫu: `seed-tag-dp`, `seed-tag-array` (gắn đề ALGO).

## Gợi ý test nhanh

1. Seed DB → Login Postman với `instructor@seed.local` / `Secret12!` (collection đã cấu hình sẵn).
2. `POST /submissions` với `userId=seed-user-student`, `problemId=seed-problem-algo`.
3. Storage `bind-object-key` / presign: dùng biến `seed-ai-job-001`, `seed-export-001`, `seed-golden-001` trong [`apps/core-api/postman/Code-Judge-Core-API.postman_collection.json`](../apps/core-api/postman/Code-Judge-Core-API.postman_collection.json).

## Mã nguồn

- [`apps/core-api/prisma/seed.ts`](../apps/core-api/prisma/seed.ts)
