# code-judge

## Kiến trúc base (Hybrid)
- `apps/core-api` (NestJS): tạo `Submission`, enqueue job BullMQ, emit realtime trạng thái qua Socket.io.
- `apps/worker` (Node.js): worker BullMQ xử lý job (base: stub “chấm”).
- `apps/web` (Next.js): form submit + lắng nghe realtime theo `userId`.

## Cấu hình chạy local (khuyến nghị dùng Docker Desktop)
1. Bật Docker Desktop và chạy:
   - `cd c:\Users\ADMIN\Documents\GitHub\code-judge`
   - `docker compose up -d`
   - Service gồm: `app-db` (Postgres + pgvector), `app-redis`, `minio`, Judge0 (`judge0-server`, `judge0-worker`, `db`, `redis` riêng cho Judge0).
   - Chạy Judge0 trên Windows / WSL: [docs/JUDGE0-WINDOWS-WSL.md](docs/JUDGE0-WINDOWS-WSL.md)
2. Generate Prisma client và migration:
   - `npm run prisma:generate -w @code-judge/core-api`
   - `npm run prisma:migrate -w @code-judge/core-api`
3. (Tuỳ chọn — khuyến nghị trước khi test API/Postman) Nạp dữ liệu seed:
   - `npm run prisma:seed -w @code-judge/core-api`
   - Chi tiết: [docs/PRISMA-SEED.md](docs/PRISMA-SEED.md)
4. Chạy các app:
   - Core API: `npm run dev -w @code-judge/core-api` (port `3000`)
   - Worker: `npm run dev -w @code-judge/worker`
   - Web: `npm run dev -w @code-judge/web` (port `3001`)

## Core API: định dạng JSON thống nhất
Mọi endpoint HTTP trả về (hoặc lỗi) cùng một **envelope**:

```json
{
  "code": 200,
  "success": true,
  "message": "OK",
  "result": { }
}
```

- **`code`**: trùng HTTP status (200, 400, 401, …).
- **`success`**: `true` khi thành công (thường `code` từ 200–299).
- **`message`**: mô tả ngắn; lỗi validate có thể gộp nhiều dòng.
- **`result`**: payload nghiệp vụ khi thành công; lỗi có thể là `null` hoặc có thêm chi tiết (ví dụ `{ "errors": ["..."] }`).

**Luồng xử lý**: controller trả object “thô” → interceptor bọc envelope → exception filter trả lỗi cùng dạng. Chi tiết code: `apps/core-api/src/main.ts`, `common/interceptors/transform-response.interceptor.ts`, `common/filters/all-exceptions.filter.ts`.

## Core API: JWT & phân quyền (NestJS)
- **Mặc định** mọi route cần header `Authorization: Bearer <accessToken>`, trừ chỗ gắn `@Public()` (ví dụ `POST /auth/login`, hiện tại cả `POST /submissions` vẫn public để demo).
- **`@Roles(Role.ADMIN, …)`**: chỉ user có một trong các role (Prisma) mới được truy cập; kết hợp với `RolesGuard` đã đăng ký toàn app.
- **`@CurrentUser()`**: lấy `userId`, `email`, `role` sau khi JWT hợp lệ (`common/interfaces/request-user.interface.ts`).

**Endpoint auth** (dữ liệu thực tế nằm trong `result` sau envelope):

| Method | Path | Ghi chú |
|--------|------|---------|
| `POST` | `/auth/register` | Body `{ "name", "email", "password" }` — tạo account và trả access token. |
| `POST` | `/auth/login` | Body `{ "email", "password" }` — xác thực và trả access token. |
| `POST` | `/auth/refresh` | Đổi refresh cookie lấy access token mới. |
| `POST` | `/auth/logout` | Xoá refresh cookie. |
| `GET` | `/auth/google` | Redirect Google OAuth (nếu đã cấu hình env). |
| `GET` | `/auth/google/callback` | Callback OAuth, redirect về `FRONTEND_URL`. |

## Core API: Users module (tách khỏi auth)

| Method | Path | Ghi chú |
|--------|------|---------|
| `GET` | `/users/me` | Thông tin user hiện tại (JWT). |
| `POST` | `/users/me/avatar/upload-url` | Lấy presigned URL upload avatar. |
| `POST` | `/users/me/avatar/confirm` | Xác nhận `objectKey` avatar sau upload. |
| `POST` | `/users` | Tạo user mới (CRUD cơ bản). |
| `GET` | `/users` | List user có paging (`page`, `limit`) + `search`. |
| `GET` | `/users/:id` | Lấy chi tiết user theo id. |
| `PATCH` | `/users/:id` | Cập nhật user cơ bản. |
| `DELETE` | `/users/:id` | Xóa user. |

**Biến môi trường** (xem `apps/core-api/.env.example`): `JWT_SECRET` bắt buộc; `JWT_EXPIRES_IN` mặc định 900 giây; refresh token mặc định 604800 giây.

**Mã nguồn chính**: `apps/core-api/src/auth/`, decorators trong `apps/core-api/src/common/decorators/`.

## API (tập trung Submission)
- `POST /submissions` (public tạm thời)
  - Body:
    - `userId: string`
    - `problemId: string`
    - `mode: "ALGO" | "PROJECT"`
    - `sourceCode?: string` (nếu lớn có thể externalize sang MinIO)
    - `sourceCodeObjectKey?: string` (nếu đã upload trước lên MinIO)
  - Response (trong `result` của envelope):
    - `{ submissionId, status }`

## Socket.io realtime (room theo userId)
- Room: `user:<userId>`
- Client truyền `userId` trong query khi connect.
- Event contract (server emit):
  - `submission:created` `{ submissionId, status }`
  - `submission:progress` `{ submissionId, status, progressPct, logChunk }`
  - `submission:finished` `{ submissionId, status, score, runtimeMs, memoryMb }`
  - `submission:failed` `{ submissionId, status, error }`

## Web demo
- Mở: `http://localhost:3001`
- Nhập `userId/problemId/mode`, bấm `Submit` và xem realtime logs.

## Triển khai lên VPS (Ubuntu 24.04 LTS x64)
1. Trên VPS: `./deploy/ubuntu-24.04-setup.sh` (Docker, UFW, swap tuỳ RAM).
2. `cp .env.production.example .env.production` — sửa mật khẩu và URL.
3. `./deploy/production-up.sh`
- Stack: `docker-compose.production.yml` (Judge0 isolate thật trên Linux; dev Windows dùng `docker-compose.yml` + stub).
- Hướng dẫn SSH/PM2 thay thế: [docs/DEPLOY-VPS.html](docs/DEPLOY-VPS.html).

## Tài liệu cấu hình & utils
- Xem: [docs/CAU-HINH-VA-UTILS.md](docs/CAU-HINH-VA-UTILS.md) (ESLint/Prettier, `common/`, `lib/`, cách import).
- Phần **JWT / envelope JSON** ở trên bổ sung cho Core API; có thể đọc kèm comment trong `apps/core-api/src/auth/` và `apps/core-api/src/common/`.
- MinIO (setup, env, taxonomy, luồng API/worker): [docs/MINIO.md](docs/MINIO.md).
- Test API với Postman: [docs/postman-testapi.md](docs/postman-testapi.md), collection [apps/core-api/postman/Code-Judge-Core-API.postman_collection.json](apps/core-api/postman/Code-Judge-Core-API.postman_collection.json), curl [apps/core-api/postman/import.txt](apps/core-api/postman/import.txt).
- Seed DB (test): [docs/PRISMA-SEED.md](docs/PRISMA-SEED.md).

## Lint & format (root)
- `npm run lint` — kiểm tra ESLint.
- `npm run format` — chạy Prettier ghi file.