# Chạy stack production trên máy Windows (Docker Desktop) — A → Z

**Mục tiêu:** Dùng `docker-compose.production.yml` giống VPS để thử trước khi deploy.

**Khác VPS:** File compose gốc nhắm **Ubuntu + Judge0 isolate thật** (`privileged`, `linux/amd64`). Trên **Docker Desktop Windows** Judge0 **có thể không khởi động được** (cgroup/isolate). Nếu Judge0 lỗi, bạn vẫn có thể kiểm tra **web + API + DB**; phần **chấm bài ALGO** cần VPS Linux hoặc xem bản dev `docker-compose.yml` (Judge0 stub).

---

## A. Điều kiện trước khi chạy

| Hạng mục | Yêu cầu |
|----------|---------|
| **OS** | Windows 10/11 |
| **Docker** | [Docker Desktop](https://www.docker.com/products/docker-desktop/) đã cài, **đang chạy** (icon cá voi). **WSL 2 backend** được khuyến nghị. |
| **RAM** | Tối thiểu ~8 GB khả dụng cho máy (pull image + build song song rất tốn RAM). |
| **Ổ đĩa** | Vài chục GB trống (image Judge0 ~3 GB + build). |
| **Cổng** | Mặc định **80** (web) và **8080** (API). Nếu bị chiếm (IIS, Skype, v.v.) → dùng cổng khác (mục D). |
| **Kiến trúc** | PC **Intel/AMD 64-bit**: `linux/amd64` khớp. **Apple Silicon (ARM):** có thể chậm do emulation. |

---

## B. Môi trường chạy lệnh

| Lệnh | Ở đâu chạy |
|------|------------|
| `docker`, `docker compose` | **PowerShell** hoặc **CMD** (Docker Desktop đã thêm vào PATH). |
| **Không** cần SSH. | |
| **Quyền** | User Windows thường đủ; **không** cần Administrator trừ khi Docker Desktop yêu cầu. |

---

## C. Thư mục làm việc

Luôn ở **thư mục gốc monorepo** (cùng cấp `docker-compose.production.yml`):

```text
C:\Users\ADMIN\Documents\GitHub\code-judge
```

PowerShell:

```powershell
cd C:\Users\ADMIN\Documents\GitHub\code-judge
```

---

## D. Tạo `.env.production` cho chạy local

**Điều kiện:** Chưa có file `.env.production` trong gốc repo **hoặc** tạo bản **riêng cho local** (đừng ghi đè bản VPS nếu bạn muốn giữ IP VPS).

### Cổng mặc định (80 + 8080)

```powershell
Copy-Item .env.production.example .env.production -Force
notepad .env.production
```

Sửa tối thiểu:

- `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD`, `JUDGE0_DB_PASSWORD` — mật khẩu bất kỳ (test local).
- `JUDGE0_SECRET_KEY_BASE` — chuỗi **≥ 64 ký tự** (vd. chạy trong PowerShell):

  ```powershell
  -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
  ```

- `JWT_SECRET` — **≥ 32 ký tự** (vd.):

  ```powershell
  -join ((1..32) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
  ```

- **Local:**

  ```env
  FRONTEND_URL=http://localhost
  NEXT_PUBLIC_CORE_URL=http://localhost:8080
  MINIO_PUBLIC_BASE_URL=http://localhost:9000
  ```

- **Email (tuỳ chọn):** `MAIL_ACCOUNT`, `MAIL_PASSWORD` (Gmail App Password) — xem `.env.production.example`. Không cần nếu bỏ qua mời lớp qua mail.

**Upload source / presigned MinIO:** Trình duyệt phải mở được `MINIO_PUBLIC_BASE_URL` (mặc định `http://localhost:9000` — compose publish cổng `MINIO_HOST_PORT`, mặc định 9000). Nếu để trống `MINIO_PUBLIC_BASE_URL`, API sẽ ký URL dạng `http://minio:9000/...` → lỗi **`ERR_NAME_NOT_RESOLVED`** vì `minio` chỉ tồn tại trong mạng Docker.

Lưu file.

### Nếu cổng 80 hoặc 8080 bị chiếm

Trong `.env.production` thêm/vì dụ:

```env
HTTP_PORT=3000
API_HTTP_PORT=3001
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_CORE_URL=http://localhost:3001
```

Trình duyệt mở: web = URL `FRONTEND_URL`, API = `NEXT_PUBLIC_CORE_URL`. **MinIO** cho presigned browser: vẫn dùng `http://localhost:9000` trừ khi bạn đổi `MINIO_HOST_PORT` / `MINIO_PUBLIC_BASE_URL`.

---

## E. Kiểm tra cú pháp compose (tuỳ chọn)

**Điều kiện:** Đang ở gốc repo; có `.env.production`.

```powershell
docker compose -f docker-compose.production.yml --env-file .env.production config --quiet
```

**Kết quả mong đợi:** Không in lỗi (exit 0).

---

## F. Build và chạy stack

**Điều kiện:** Docker Desktop đang chạy; đủ RAM/disk.

**Trong lúc chạy:** Lần đầu **15–40+ phút** (pull Judge0, build `core-api` / `worker` / `web`). **Giữ máy không sleep**; có thể uống cà phê.

```powershell
cd C:\Users\ADMIN\Documents\GitHub\code-judge
docker compose -f docker-compose.production.yml --env-file .env.production up -d --build
```

**Kết quả mong đợi:** Cuối lệnh không báo `error`; các container tạo xong.

Nếu máy **4 GB RAM** hoặc hay bị kill khi build: thử build tuần tự (ít song song hơn — có thể chậm hơn nhưng ổn định hơn):

```powershell
$env:COMPOSE_PARALLEL_LIMIT = "1"
docker compose -f docker-compose.production.yml --env-file .env.production up -d --build
```

---

## G. Kiểm tra sau khi chạy

```powershell
docker compose -f docker-compose.production.yml --env-file .env.production ps
```

**Kỳ vọng:** Nhiều service `running` / `healthy`. `judge0-server` có thể `starting` vài phút hoặc **unhealthy** trên Windows.

API (theo `NEXT_PUBLIC_CORE_URL` — mặc định):

```powershell
curl.exe -s http://127.0.0.1:8080/tags | more
```

Web: mở trình duyệt → `http://localhost` (hoặc cổng bạn đặt trong `HTTP_PORT`).

**CORS:** Nếu console báo `Access-Control-Allow-Origin` không khớp `supplied origin`, chỉnh `FRONTEND_URL` trong `.env.production` **trùng** URL web trên thanh địa chỉ (vd. `http://localhost`, không để `http://localhost:3000` khi bạn đang vào cổng 80). Có thể dùng nhiều origin: `FRONTEND_URL=http://localhost,http://localhost:3000`. Sau đó: `docker compose ... up -d core-api` (hoặc `restart core-api`).

**Seed:** Lần đầu stack chạy, service `migrate` sẽ `prisma migrate deploy` rồi **`prisma db seed`** (user/password xem `apps/core-api/prisma/seed.ts`). Tắt trên DB production: `RUN_SEED=0` trong `.env.production`. Chạy lại migrate+seed sau khi đổi code: `docker compose ... build migrate` rồi `docker compose ... run --rm migrate`.

**MinIO / nộp bài:** Nếu lỗi **`minio:9000`** hoặc `ERR_NAME_NOT_RESOLVED` khi upload, đặt `MINIO_PUBLIC_BASE_URL=http://localhost:9000` trong `.env.production`, mở cổng MinIO trên host (compose mặc định publish `:9000`), rồi `docker compose ... up -d` lại (và `restart core-api` nếu chỉ đổi env).

**Console 404 `/hybridaction/zybTrackerStatisticsAction`:** Không phải API Code Judge — thường do **extension** trình duyệt; bỏ qua hoặc thử cửa sổ ẩn danh không extension.

---

## H. Xem log khi lỗi

```powershell
docker compose -f docker-compose.production.yml --env-file .env.production logs migrate --tail 50
docker compose -f docker-compose.production.yml --env-file .env.production logs core-api --tail 50
docker compose -f docker-compose.production.yml --env-file .env.production logs judge0-server --tail 50
```

---

## I. Dừng và gỡ (tuỳ chọn)

Chỉ **dừng** stack (giữ volume / DB):

```powershell
docker compose -f docker-compose.production.yml --env-file .env.production down
```

Hoặc dùng script (Git Bash / WSL nếu có `bash`):

```bash
./deploy/production-down.sh
```

**Xoá cả dữ liệu volume** (mất DB): chỉ khi bạn chắc chắn:

```powershell
docker compose -f docker-compose.production.yml --env-file .env.production down -v
```

---

## J. So sánh nhanh

| Mục đích | File compose |
|----------|----------------|
| Dev trên Windows (Judge0 stub, đơn giản) | `docker-compose.yml` |
| Giống production nhất trên máy | `docker-compose.production.yml` (file này) |
| Môi trường thật chấm bài ALGO | **VPS Ubuntu** |

---

## K. Checklist nhanh

- [ ] Docker Desktop đang chạy  
- [ ] `cd` đúng gốc repo  
- [ ] `.env.production` đủ biến bắt buộc + `FRONTEND_URL` / `NEXT_PUBLIC_CORE_URL` khớp cổng + **`MINIO_PUBLIC_BASE_URL`** (local: `http://localhost:9000`) + **`MAIL_*`** nếu cần gửi email  
- [ ] `docker compose ... up -d --build` xong không lỗi  
- [ ] `curl` `/tags` hoặc mở web được  

---

Chi tiết deploy VPS: [README.md](README.md) · [docs/DEPLOY-VPS.html](../docs/DEPLOY-VPS.html)
