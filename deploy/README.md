# Deploy Code Judge lên VPS (SSH — không GitHub)

## Đánh giá sẵn sàng (DevOps)

| Hạng mục | Trạng thái | Ghi chú |
|----------|------------|---------|
| Build ứng dụng (CI) | Sẵn sàng | `lint`, `test`, `build` core-api / worker / web pass |
| Stack production | Sẵn sàng | `docker-compose.production.yml` — Postgres, Redis, MinIO, Judge0, API, worker, web, nginx |
| Judge0 trên Linux | Sẵn sàng | `privileged: true`, isolate thật (Ubuntu 24.04 x64) |
| Migration DB | Sẵn sàng | Service `migrate` chạy `prisma migrate deploy` rồi **`prisma db seed`** (tắt: `RUN_SEED=0` trong `.env.production`) trước `core-api` |
| Reverse proxy | Sẵn sàng | Nginx :80 (web), :8080 (API + Socket.io) |
| Đưa code lên VPS | SSH / SCP / rsync | **Không** dùng `git clone` / `git pull` từ GitHub |

**Kết luận:** Có thể deploy **để test trên VPS** ngay, nếu VPS đáp ứng:

- Ubuntu **24.04 LTS**, **x86_64**
- RAM **≥ 4 GB** (khuyến nghị 8 GB — Judge0 + Postgres)
- Disk **≥ 20 GB**
- Port mở: **22**, **80**, **8080** (và **443** sau khi gắn HTTPS)

Lần deploy đầu trên VPS thường mất **15–40 phút** (pull image Judge0 + `docker compose build` web/api/worker).

---

## Luồng triển khai (không GitHub)

### 1. Trên Windows — đẩy code lên VPS **trước**

**Phải chạy trong PowerShell** (hoặc Windows Terminal profile PowerShell). **Không** chạy file `.ps1` trong **Command Prompt (`cmd.exe`)** — `cmd` không thực thi PowerShell nên thường không có output và code không được sync.

```powershell
cd C:\Users\ADMIN\Documents\GitHub\code-judge
# Đăng nhập SSH bằng root (DigitalOcean):
.\deploy\sync-to-vps.ps1 -VpsHost VPS_IP -VpsUser root -RemoteDir /root/code-judge
# Hoặc user ubuntu:
# .\deploy\sync-to-vps.ps1 -VpsHost VPS_IP -VpsUser ubuntu
```

Nếu bạn chỉ có `cmd`, gọi PowerShell rõ ràng:

```cmd
cd C:\Users\ADMIN\Documents\GitHub\code-judge
powershell -NoProfile -ExecutionPolicy Bypass -File .\deploy\sync-to-vps.ps1 -VpsHost VPS_IP -VpsUser root -RemoteDir /root/code-judge
```

### 2. Trên VPS — cài Docker (sau khi đã có thư mục code)

```bash
ssh root@VPS_IP   # hoặc ubuntu@VPS_IP
cd /root/code-judge   # root — hoặc cd ~/code-judge nếu user ubuntu
ls deploy/ubuntu-24.04-setup.sh   # phải thấy file
chmod +x deploy/*.sh
./deploy/ubuntu-24.04-setup.sh
# Đăng xuất SSH và vào lại (nhóm docker)
```

**Cách A — script (khuyến nghị):** xem bước 1 ở trên.

**Cách B — WinSCP:** SFTP kéo thả thư mục `code-judge` → `/home/ubuntu/code-judge` (bỏ `node_modules`, `.next`, `.env`).

**Cách C — WSL rsync:**

```bash
rsync -avz --delete --exclude-from=deploy/rsync-exclude.txt \
  ./ ubuntu@VPS_IP:/home/ubuntu/code-judge/
```

### 3. Cấu hình env trên VPS

```bash
ssh ubuntu@VPS_IP
cd ~/code-judge
cp .env.production.example .env.production
nano .env.production
chmod 600 .env.production
```

Ví dụ test chỉ bằng IP:

```env
FRONTEND_URL=http://203.0.113.10
NEXT_PUBLIC_CORE_URL=http://203.0.113.10:8080
POSTGRES_PASSWORD=...
MINIO_ROOT_PASSWORD=...
JUDGE0_SECRET_KEY_BASE=...
JWT_SECRET=...
```

Sinh secret: `openssl rand -hex 32` (JWT), `openssl rand -hex 64` (Judge0).

### 4. Build và chạy

```bash
./deploy/production-up.sh
```

### 5. Kiểm tra

```bash
docker compose -f docker-compose.production.yml --env-file .env.production ps
curl -s http://127.0.0.1:8080/tags | head
```

Trình duyệt: `http://VPS_IP/` (web), API qua `http://VPS_IP:8080/`.

---

## Lỗi `bash\r` / `/usr/bin/env: 'bash\r': No such file`

**Nguyên nhân:** file `.sh` có kết thúc dòng **Windows (CRLF)**. Linux đọc shebang thành `bash\r`.

**Trên VPS (một lần):**

```bash
sed -i 's/\r$//' /root/code-judge/deploy/*.sh /root/code-judge/scripts/*.sh
chmod +x /root/code-judge/deploy/*.sh
./deploy/ubuntu-24.04-setup.sh
```

(Đổi `/root/code-judge` nếu bạn dùng user `ubuntu`.) Trong repo đã chuẩn hoá LF + `sync-to-vps.ps1` tự `sed` sau giải nén — có thể **sync lại** từ Windows.

---

## Cập nhật phiên bản (vẫn không GitHub)

1. Trên Windows: chạy lại `.\deploy\sync-to-vps.ps1`
2. Trên VPS: `cd ~/code-judge && ./deploy/production-up.sh`

Nếu chỉ đổi `.env.production` (không đổi code):

```bash
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```

Đổi `NEXT_PUBLIC_CORE_URL` → bắt buộc rebuild web (`production-up.sh` đã có `--build`).

---

## Lỗi Prisma `P3015` (thiếu `migration.sql`)

**Triệu chứng:** `migrate` thoát lỗi, log có *Could not find the migration file at migration.sql* và *N migrations found* trong khi một hoặc nhiều thư mục con **trống**.

**Cách xử lý:**

1. Trong repo, mở `apps/core-api/prisma/migrations/`.
2. Mỗi thư mục migration (tên dạng `20xxxxxxxx_yyy`) **bắt buộc** có file `migration.sql`. Xóa hẳn thư mục nào **không** có file đó (thường là thư mục tạo nhầm).
3. Sync lại code lên VPS / Windows, rồi rebuild service migrate:

   ```bash
   docker compose -f docker-compose.production.yml --env-file .env.production build migrate
   docker compose -f docker-compose.production.yml --env-file .env.production run --rm migrate
   ```

**Lưu ý:** Lần đầu `up`, container `migrate` chạy migration **và** seed (tài khoản seed trong `prisma/seed.ts`, mật khẩu mặc định trong file). Trên **production thật** có dữ liệu riêng, đặt `RUN_SEED=0` trong `.env.production` rồi `docker compose ... up -d` (hoặc chỉ chạy lại job migrate nếu cần).

---

## MinIO / upload từ trình duyệt

### `minio:9000`, `ERR_NAME_NOT_RESOLVED`

**Triệu chứng:** Console có `http://minio:9000/...` hoặc upload báo `Failed to fetch`.

**Cách xử lý:** Đặt `MINIO_PUBLIC_BASE_URL` thành URL host mà trình duyệt mở được (local: `http://localhost:9000`). `restart core-api` sau khi đổi env.

### Judge0: Internal Error, stdout null, cgroup `/sys/fs/cgroup/memory/box-*`

**Triệu chứng (log `worker`):** `status: Internal Error`, base64 decode → `Cannot write /sys/fs/cgroup/memory/box-N/tasks: No such file or directory` hoặc `Permission denied ... /box/script.py`.

**Nguyên nhân:** Ubuntu 22.04/24.04 host dùng **cgroup v2**; Judge0 `isolate` mặc định cần **cgroup v1**.

**Cách A (mặc định trong `docker-compose.production.yml`):** `JUDGE0_USE_CGROUP=false` + `scripts/isolate_stub.sh` (giống dev). Sau khi sync compose:

```bash
docker compose -f docker-compose.production.yml --env-file .env.production up -d --force-recreate judge0-server judge0-worker worker
```

**Log `sudo: Permission denied` / `No such file or directory - isolate`:** script stub từ Windows thiếu quyền thực thi hoặc CRLF. Trên VPS:

```bash
cd ~/code-judge
sed -i 's/\r$//' scripts/isolate_stub.sh scripts/sudo_stub.sh
chmod +x scripts/isolate_stub.sh scripts/sudo_stub.sh
docker compose -f docker-compose.production.yml --env-file .env.production up -d --force-recreate judge0-server judge0-worker
docker exec cj-prod-judge0-worker ls -la /usr/local/bin/isolate /usr/bin/isolate /usr/bin/sudo
```

**Cách B (isolate thật, sandbox mạnh hơn):** Trên VPS host bật cgroup v1 rồi reboot ([Judge0 #543](https://github.com/judge0/judge0/issues/543)):

```bash
# /etc/default/grub — thêm vào GRUB_CMDLINE_LINUX_DEFAULT:
# systemd.unified_cgroup_hierarchy=0
sudo update-grub && sudo reboot
```

Sau reboot: `.env.production` đặt `JUDGE0_USE_CGROUP=true`, bỏ volume mount `isolate_stub.sh` / `sudo_stub.sh` trong compose (hoặc dùng bản compose “isolate thật”), recreate judge0-*.

### Mixed Content (HTTPS site + `http://...:9000`)

**Triệu chứng:** Trang `https://code-judge.io.vn/...` chặn fetch tới `http://code-judge.io.vn:9000/codejudge/...`.

**Cách xử lý (VPS có HTTPS):**

1. Nginx: proxy `https://code-judge.io.vn/codejudge/` → MinIO (xem `deploy/nginx/conf.d/code-judge.conf`, path = `MINIO_BUCKET`).
2. `.env.production`: `MINIO_PUBLIC_BASE_URL=https://code-judge.io.vn` (**không** `:9000`, **không** `http://`).
3. `docker compose ... restart nginx core-api` (hoặc reload nginx + restart API).

---

## HTTPS (Let’s Encrypt + Nginx trong Docker)

**Điều kiện:** DNS **`code-judge.io.vn`**, **`api.code-judge.io.vn`** (hoặc `api.*` cùng VPS) đã trỏ A về IP VPS; DigitalOcean **Cloud Firewall** + **UFW** mở **80** và **443**.

### Bước A — Xin chứng chỉ trên VPS (một lần)

**Cách 1 — standalone** (tạm dừng container chiếm port 80):

```bash
cd ~/code-judge
docker compose -f docker-compose.production.yml --env-file .env.production stop nginx
sudo certbot certonly --standalone -d code-judge.io.vn -d www.code-judge.io.vn -d api.code-judge.io.vn --email YOU@EMAIL --agree-tos
docker compose -f docker-compose.production.yml --env-file .env.production start nginx
```

Thư mục cert thường là `/etc/letsencrypt/live/code-judge.io.vn/` (domain **đầu tiên** trong `-d`). Cấu hình nginx trong repo dùng đúng path đó; nếu certbot tạo tên thư mục khác, sửa hai dòng `ssl_certificate` trong `deploy/nginx/conf.d/code-judge.conf`.

**Cách 2 — webroot** (nginx vẫn chạy): tạo thư mục trống `deploy/nginx/certbot-webroot` trên VPS, rồi:

```bash
sudo certbot certonly --webroot -w /root/code-judge/deploy/nginx/certbot-webroot \
  -d code-judge.io.vn -d www.code-judge.io.vn -d api.code-judge.io.vn --email YOU@EMAIL --agree-tos
```

(Đổi `/root/code-judge` nếu repo nằm chỗ khác.)

### Bước B — `docker compose` đã mount cert và mở 443

File `docker-compose.production.yml` map `443:443` và mount `/etc/letsencrypt`. Đồng bộ code mới (có `code-judge.conf` SSL) lên VPS, sửa `.env.production`:

```env
FRONTEND_URL=https://code-judge.io.vn
NEXT_PUBLIC_CORE_URL=https://api.code-judge.io.vn
COOKIE_DOMAIN=.code-judge.io.vn
```

`COOKIE_DOMAIN` bắt buộc khi API ở subdomain `api.*`: cookie mặc định chỉ gắn host API, Next.js middleware trên web không thấy `refreshToken` → `/dashboard` redirect về `/login`.

Cookie auth dùng **`SameSite=Lax`** (không phải `None`) khi có `COOKIE_DOMAIN` — Chrome chặn `SameSite=None` giữa subdomain. Thêm `https://www.` vào `FRONTEND_URL` nếu site mở được bằng www (CORS sai → `Set-Cookie` không lưu).

Sau khi sửa: `docker compose ... up -d --build core-api`, xóa cookie cũ, đăng nhập lại. Kiểm tra DevTools → Application → Cookies: `refreshToken` có **Domain** `.code-judge.io.vn`, **SameSite** `Lax`.

(Google OAuth: `GOOGLE_CALLBACK_URL=https://api.code-judge.io.vn/auth/google/callback` — khớp Google Console.)

Rồi deploy lại (có rebuild web):

```bash
./deploy/production-up.sh
```

### Gia hạn

```bash
sudo certbot renew --dry-run
# Sau renew thật:
docker exec cj-prod-nginx nginx -s reload
```

**Lưu ý:** Nếu **chưa** có file `.pem` trong `/etc/letsencrypt/live/...`, nginx container sẽ **không start** được — phải làm **Bước A** trước, hoặc tạm comment các khối `listen 443` trong `code-judge.conf`.

---

## Gửi email (mời lớp, thông báo bài tập)

`core-api` đọc **`MAIL_ACCOUNT`** và **`MAIL_PASSWORD`** (Gmail + App Password). Đã truyền từ `.env.production` qua `docker-compose.production.yml`. Để trống hai biến = không gửi mail (API vẫn chạy). Sau khi sửa: `docker compose ... up -d core-api` hoặc `restart core-api`.

---

## Tài liệu chi tiết

- [LOCAL-PRODUCTION-WINDOWS.md](LOCAL-PRODUCTION-WINDOWS.md) — chạy stack `docker-compose.production.yml` trên **máy Windows** (Docker Desktop), A→Z
- [docs/DEPLOY-VPS.html](../docs/DEPLOY-VPS.html) — hướng dẫn đầy đủ (SSH, env từng biến, HTTPS, xử lý lỗi)
- [docs/UPDATE-DEPLOY.html](../docs/UPDATE-DEPLOY.html) — **cập nhật** sau khi đổi `.env.production`, code, hoặc thư mục `prisma/migrations`
- [docs/DEBUG-CONTAINERS.html](../docs/DEBUG-CONTAINERS.html) — **debug** xác định lỗi nằm ở container nào
- [.env.production.example](../.env.production.example) — mẫu biến môi trường

## Script trong thư mục này

| File | Mô tả |
|------|--------|
| `ubuntu-24.04-setup.sh` | Cài Docker + UFW (+ swap nếu RAM thấp) |
| `production-up.sh` | `docker compose up -d --build` |
| `production-down.sh` | Dừng stack |
| `sync-to-vps.ps1` | Đồng bộ code từ Windows → VPS (tar + scp) |
| `rsync-exclude.txt` | Danh sách loại trừ cho rsync |
| `nginx/conf.d/code-judge.conf` | Cấu hình nginx |
