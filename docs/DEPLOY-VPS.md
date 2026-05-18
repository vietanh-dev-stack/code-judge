# Triển khai Code Judge lên VPS (SSH)

Hướng dẫn từng bước: kết nối SSH từ Windows → đưa mã nguồn và file `.env` lên VPS → chạy hạ tầng Docker → build và chạy Core API, Worker, Web bằng PM2.

**Kiến trúc trên VPS**

| Thành phần | Cách chạy | Cổng mặc định |
|------------|-----------|----------------|
| Postgres (`app-db`), Redis (`app-redis`), MinIO, Judge0 | `docker compose` (thư mục gốc repo) | 5432, 6379, 9000/9001, 2358 |
| Core API (NestJS) | PM2 / Node | 3000 |
| Worker (BullMQ) | PM2 / Node | — |
| Web (Next.js) | PM2 / Node | 3001 |

**File `.env` cần có trên VPS** (copy từ máy dev, không nằm trong Git):

- `apps/core-api/.env`
- `apps/worker/.env`
- `apps/web/.env`

Tham chiếu mẫu: `apps/*/.env.example`, `.env.example` ở root.

---

## Mục lục

1. [Yêu cầu](#1-yêu-cầu)
2. [Kết nối SSH từ Windows](#2-kết-nối-ssh-từ-windows)
3. [Chuẩn bị VPS lần đầu](#3-chuẩn-bị-vps-lần-đầu)
4. [Đưa project và `.env` lên VPS](#4-đưa-project-và-env-lên-vps)
5. [Chỉnh biến môi trường cho production](#5-chỉnh-biến-môi-trường-cho-production)
6. [Chạy Docker (DB, Redis, MinIO, Judge0)](#6-chạy-docker-db-redis-minio-judge0)
7. [Cài dependency, migration, build](#7-cài-dependency-migration-build)
8. [Chạy ứng dụng với PM2](#8-chạy-ứng-dụng-với-pm2)
9. [Nginx reverse proxy + HTTPS (khuyến nghị)](#9-nginx-reverse-proxy--https-khuyến-nghị)
10. [Firewall](#10-firewall)
11. [Kiểm tra sau triển khai](#11-kiểm tra-sau-triển-khai)
12. [Cập nhật phiên bản](#12-cập-nhật-phiên-bản)
13. [Xử lý lỗi thường gặp](#13-xử-lý-lỗi-thường-gặp)
14. [Bảo mật](#14-bảo-mật)

---

## 1. Yêu cầu

### VPS

- **OS**: Ubuntu 22.04 LTS hoặc 24.04 LTS (khuyến nghị).
- **RAM**: tối thiểu **4 GB** (Judge0 + Postgres + Node; 8 GB ổn hơn).
- **Ổ đĩa**: ≥ 20 GB.
- Quyền `sudo`, IP public, mở port **22** (SSH). Production: **80**, **443** (sau khi cài Nginx).

### Máy Windows (máy bạn)

- Project đã chạy được local (hoặc ít nhất đã có 3 file `.env` đúng cấu trúc).
- Công cụ một trong các cách:
  - **OpenSSH** có sẵn trên Windows 10/11 (`ssh`, `scp` trong PowerShell).
  - Hoặc **PuTTY** + **WinSCP** (giao diện kéo thả file).

### Thông tin cần chuẩn bị

| Biến | Ví dụ | Ghi chú |
|------|--------|---------|
| `VPS_IP` | `203.0.113.10` | IP public VPS |
| `VPS_USER` | `ubuntu` | User SSH (DigitalOcean/Vultr thường là `root` hoặc `ubuntu`) |
| `SSH_PORT` | `22` | Đổi nếu VPS dùng port khác |
| `DOMAIN` | `codejudge.example.com` | Tuỳ chọn; có domain thì dùng HTTPS |
| `API_DOMAIN` | `api.codejudge.example.com` | Subdomain cho Core API |

---

## 2. Kết nối SSH từ Windows

### 2.1. Dùng OpenSSH (PowerShell / CMD)

**Lần đầu — tạo key (tuỳ chọn, khuyến nghị):**

```powershell
ssh-keygen -t ed25519 -C "your-email@example.com"
```

Key mặc định: `C:\Users\<TEN_BAN>\.ssh\id_ed25519` (private) và `id_ed25519.pub` (public).

**Copy public key lên VPS** (nếu VPS hỗ trợ password lần đầu):

```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh VPS_USER@VPS_IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

**Kết nối:**

```powershell
ssh VPS_USER@VPS_IP
```

Nếu port khác 22:

```powershell
ssh -p SSH_PORT VPS_USER@VPS_IP
```

Sau khi vào được, prompt dạng `ubuntu@ip-xxx:~$` — các lệnh tiếp theo trong doc chạy **trên VPS** trừ khi ghi rõ “trên Windows”.

### 2.2. Dùng PuTTY

1. Tải [PuTTY](https://www.putty.org/).
2. **Session** → Host Name: `VPS_IP`, Port: `22`, Connection type: SSH → **Open**.
3. Đăng nhập bằng password hoặc load private key (`.ppk`) trong **Connection → SSH → Auth**.

WinSCP dùng cùng thông tin để upload thư mục/file (phần 4).

### 2.3. File `~/.ssh/config` (tuỳ chọn)

Trên Windows, tạo/sửa `C:\Users\<TEN_BAN>\.ssh\config`:

```
Host codejudge-vps
    HostName VPS_IP
    User VPS_USER
    Port 22
    IdentityFile ~/.ssh/id_ed25519
```

Kết nối nhanh:

```powershell
ssh codejudge-vps
```

---

## 3. Chuẩn bị VPS lần đầu

Chạy trên VPS (đã SSH vào):

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ca-certificates gnupg ufw
```

### 3.1. Cài Docker + Docker Compose plugin

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

**Đăng xuất SSH và vào lại** để user được quyền chạy `docker` không cần `sudo` mỗi lần.

Kiểm tra:

```bash
docker --version
docker compose version
```

### 3.2. Cài Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
npm -v
```

### 3.3. Cài PM2

```bash
sudo npm install -g pm2
pm2 -v
```

### 3.4. Tạo thư mục project

```bash
mkdir -p ~/code-judge
```

---

## 4. Đưa project và `.env` lên VPS

Git **không** commit file `.env` (xem `.gitignore`). Bạn phải copy thủ công 3 file env sau khi đưa mã nguồn lên.

### 4.1. Cách 1 — Git clone (repo public/private)

**Trên VPS:**

```bash
cd ~
git clone https://github.com/<ORG_OR_USER>/code-judge.git
cd code-judge
```

Với repo private: dùng SSH key deploy trên VPS hoặc Personal Access Token.

### 4.2. Cách 2 — `scp` từ Windows (cả project)

**Trên Windows** (PowerShell), từ thư mục cha của repo:

```powershell
cd C:\Users\ADMIN\Documents\GitHub

# Upload cả thư mục (lần đầu có thể lâu; bỏ qua node_modules nếu đã có trên VPS)
scp -r code-judge VPS_USER@VPS_IP:/home/VPS_USER/
```

`node_modules` nặng — nên **không** upload: trên VPS chạy `npm install` (mục 7). Nếu đã lỡ copy `node_modules` từ Windows (sai OS), xóa trên VPS:

```bash
rm -rf ~/code-judge/node_modules ~/code-judge/apps/*/node_modules
```

### 4.3. Copy riêng 3 file `.env` (bắt buộc)

**Trên Windows:**

```powershell
scp C:\Users\ADMIN\Documents\GitHub\code-judge\apps\core-api\.env VPS_USER@VPS_IP:/home/VPS_USER/code-judge/apps/core-api/.env
scp C:\Users\ADMIN\Documents\GitHub\code-judge\apps\worker\.env  VPS_USER@VPS_IP:/home/VPS_USER/code-judge/apps/worker/.env
scp C:\Users\ADMIN\Documents\GitHub\code-judge\apps\web\.env      VPS_USER@VPS_IP:/home/VPS_USER/code-judge/apps/web/.env
```

**Trên VPS** — quyền đọc chỉ owner:

```bash
chmod 600 ~/code-judge/apps/core-api/.env
chmod 600 ~/code-judge/apps/worker/.env
chmod 600 ~/code-judge/apps/web/.env
```

### 4.4. WinSCP (giao diện)

1. Protocol: SFTP, host `VPS_IP`, user/password hoặc key.
2. Kéo thư mục `code-judge` vào `/home/VPS_USER/`.
3. Kéo riêng 3 file `.env` vào đúng `apps/core-api/`, `apps/worker/`, `apps/web/`.

---

## 5. Chỉnh biến môi trường cho production

Giữ **secret** (JWT, MinIO key, API key AI, AWS…) như bản local nếu đã ổn; **bắt buộc đổi URL** khi user truy cập qua domain/IP public.

### 5.1. `apps/core-api/.env`

| Biến | Trên VPS (app chạy ngoài Docker, DB trong Docker) | Ghi chú |
|------|-----------------------------------------------------|---------|
| `DATABASE_URL` | `postgresql://codejudge:codejudge@localhost:5432/codejudge` | Khớp `docker-compose.yml` service `app-db` |
| `REDIS_URL` | `redis://localhost:6379` | Service `app-redis` |
| `MINIO_ENDPOINT` | `localhost` | |
| `MINIO_PORT` | `9000` | |
| `MINIO_USE_SSL` | `false` | `true` nếu sau này proxy MinIO HTTPS |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | Giữ hoặc đổi mạnh hơn | Mặc định compose: `minioadmin` |
| `MINIO_BUCKET` | `codejudge` | Bucket tự tạo khi API/worker khởi động |
| `NODE_ENV` | `production` | Tắt Swagger UI |
| `PORT` | `3000` | |
| `JWT_SECRET` | Chuỗi dài, ngẫu nhiên | **Không** dùng `change-me-in-production` |
| `FRONTEND_URL` | `https://DOMAIN` hoặc `http://VPS_IP:3001` | CORS + redirect OAuth (xem `main.ts`) |

**Google OAuth** (nếu dùng):

```env
GOOGLE_CALLBACK_URL=https://api.your-domain.com/auth/google/callback
FRONTEND_URL=https://your-domain.com
```

Đăng ký đúng URL callback trên Google Cloud Console.

### 5.2. `apps/worker/.env`

| Biến | Giá trị VPS |
|------|-------------|
| `DATABASE_URL` | Cùng Core API |
| `REDIS_URL` | `redis://localhost:6379` |
| `MINIO_*` | Cùng Core API |
| `JUDGE0_URL` | `http://localhost:2358` |
| `JUDGE_ENGINE` | `judge0` (mặc định) |

### 5.3. `apps/web/.env`

| Biến | Giá trị |
|------|---------|
| `NEXT_PUBLIC_CORE_URL` | URL API mà **trình duyệt** gọi được |

Ví dụ có domain:

```env
NEXT_PUBLIC_CORE_URL=https://api.your-domain.com
```

Chỉ có IP (test):

```env
NEXT_PUBLIC_CORE_URL=http://VPS_IP:3000
```

**Lưu ý:** Sau khi đổi `NEXT_PUBLIC_*` phải `npm run build -w @code-judge/web` rồi restart PM2 app `web`.

Chi tiết MinIO: [MINIO.md](./MINIO.md). Seed dữ liệu test: [PRISMA-SEED.md](./PRISMA-SEED.md).

---

## 6. Chạy Docker (DB, Redis, MinIO, Judge0)

**Trên VPS:**

```bash
cd ~/code-judge
docker compose up -d
```

Theo dõi trạng thái:

```bash
docker compose ps
docker compose logs -f app-db
# Thoát log: Ctrl+C
```

Đợi các service **healthy** (đặc biệt `app-db`, `judge0-server`). Judge0 lần đầu có thể mất 2–5 phút.

Kiểm tra Judge0:

```bash
curl -s http://localhost:2358/about | head
```

Kiểm tra Postgres:

```bash
docker exec -it app-db pg_isready -U codejudge -d codejudge
```

MinIO Console (chỉ nên mở trong mạng tin cậy hoặc SSH tunnel): `http://VPS_IP:9001` — user/pass mặc định trong `docker-compose.yml` (`minioadmin` / `minioadmin`). Production nên đổi trong compose và đồng bộ `.env`.

---

## 7. Cài dependency, migration, build

**Trên VPS**, tại root repo:

```bash
cd ~/code-judge
npm install
```

### 7.1. Prisma (Core API)

```bash
npm run prisma:generate -w @code-judge/core-api
```

**Production — áp migration** (không dùng `migrate dev` trên VPS):

```bash
cd apps/core-api
npx prisma migrate deploy
cd ../..
```

### 7.2. Seed (tuỳ chọn, môi trường test/staging)

```bash
npm run prisma:seed -w @code-judge/core-api
```

Mật khẩu user seed mặc định: xem [PRISMA-SEED.md](./PRISMA-SEED.md). **Không** seed trên production thật nếu không cần.

### 7.3. Build cả 3 app

```bash
npm run build -w @code-judge/core-api
npm run build -w @code-judge/worker
npm run build -w @code-judge/web
```

Nếu build web lỗi thiếu biến `NEXT_PUBLIC_CORE_URL`, sửa `apps/web/.env` rồi build lại.

---

## 8. Chạy ứng dụng với PM2

### 8.1. Tạo file cấu hình PM2

Tại `~/code-judge/ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: 'core-api',
      cwd: './apps/core-api',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'worker',
      cwd: './apps/worker',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

File `.env` trong từng `cwd` được Nest/Next/dotenv load tự động (Core API, Worker đã dùng `dotenv`; Next đọc `.env` trong `apps/web`).

### 8.2. Khởi động

```bash
cd ~/code-judge
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs
```

Lưu cấu hình khởi động lại cùng OS:

```bash
pm2 save
pm2 startup
```

Chạy đúng **một dòng** lệnh `sudo env PATH=...` mà `pm2 startup` in ra, rồi:

```bash
pm2 save
```

### 8.3. Lệnh PM2 hữu ích

```bash
pm2 restart all
pm2 restart core-api
pm2 logs worker --lines 100
pm2 monit
```

---

## 9. Nginx reverse proxy + HTTPS (khuyến nghị)

Truy cập trực tiếp cổng `3000`/`3001` chỉ nên dùng để test. Production: Nginx + Let's Encrypt.

### 9.1. Cài Nginx và Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 9.2. Cấu hình mẫu

Tạo `/etc/nginx/sites-available/code-judge`:

```nginx
# Web — Next.js
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Core API + Socket.io
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket (Socket.io)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Kích hoạt:

```bash
sudo ln -s /etc/nginx/sites-available/code-judge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9.3. SSL

```bash
sudo certbot --nginx -d your-domain.com -d api.your-domain.com
```

Cập nhật lại `.env`:

- `FRONTEND_URL=https://your-domain.com`
- `NEXT_PUBLIC_CORE_URL=https://api.your-domain.com`
- `GOOGLE_CALLBACK_URL=https://api.your-domain.com/auth/google/callback` (nếu có OAuth)

Build lại web và restart:

```bash
cd ~/code-judge
npm run build -w @code-judge/web
pm2 restart web core-api
```

---

## 10. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# Chỉ khi test không qua Nginx:
# sudo ufw allow 3000/tcp
# sudo ufw allow 3001/tcp
sudo ufw enable
sudo ufw status
```

**Không** mở ra internet: `5432`, `6379`, `9000`, `9001`, `2358` (chỉ `localhost` / Docker network).

---

## 11. Kiểm tra sau triển khai

| Kiểm tra | Lệnh / Hành động |
|----------|------------------|
| Docker | `docker compose ps` — các service `running` / `healthy` |
| API | `curl -s http://127.0.0.1:3000` hoặc gọi `POST /auth/login` qua domain |
| Web | Mở `https://your-domain.com` |
| Worker | `pm2 logs worker` — không lỗi kết nối Redis/DB |
| Submit bài | Submit trên web → log worker có xử lý job → Judge0 (`JUDGE0_URL`) |
| Socket | Submit và xem realtime trên web (cần Nginx WebSocket nếu qua HTTPS) |

Postman: [postman-testapi.md](./postman-testapi.md) — đổi `baseUrl` sang `https://api.your-domain.com`.

---

## 12. Cập nhật phiên bản

**Trên VPS:**

```bash
cd ~/code-judge
git pull
# Hoặc scp/rsync lại từ Windows nếu không dùng Git

docker compose up -d
npm install
npm run prisma:generate -w @code-judge/core-api
cd apps/core-api && npx prisma migrate deploy && cd ../..
npm run build -w @code-judge/core-api
npm run build -w @code-judge/worker
npm run build -w @code-judge/web
pm2 restart all
```

Nếu đổi `.env` trên Windows, `scp` lại 3 file (mục 4.3) rồi `pm2 restart all`; với `apps/web/.env` nhớ build lại web.

---

## 13. Xử lý lỗi thường gặp

### Không SSH được

- Kiểm tra IP, port, security group (AWS/DigitalOcean/Vultr).
- Ping/ telnet port 22; thử password từ panel nhà cung cấp.

### `docker compose` lỗi permission

```bash
sudo usermod -aG docker $USER
# logout SSH, login lại
```

### Core API: `Can't reach database`

- `docker compose ps` → `app-db` healthy.
- `DATABASE_URL` host `localhost`, port `5432`, user/pass `codejudge`.

### Worker không chấm bài

- `pm2 logs worker`
- `curl http://localhost:2358/about`
- `docker logs judge0-server --tail 50`
- `JUDGE0_URL=http://localhost:2358` trong `apps/worker/.env`

### Web báo lỗi API / CORS

- `NEXT_PUBLIC_CORE_URL` phải là URL API **public** (không phải `localhost` nếu user mở web từ máy khác).
- `FRONTEND_URL` trên Core API khớp origin web (scheme + host + port).
- Build lại web sau khi sửa `NEXT_PUBLIC_*`.

### `prisma migrate deploy` lỗi

- DB đã chạy chưa?
- Chạy từ `apps/core-api` hoặc chỉ rõ schema: `npx prisma migrate deploy --schema=apps/core-api/prisma/schema.prisma` từ root.

### Judge0 crash / OOM

- Tăng RAM VPS; xem `docker logs judge0-worker`.
- Trên Linux VPS, Judge0 ổn định hơn so với Windows + WSL (xem [JUDGE0-WINDOWS-WSL.md](./JUDGE0-WINDOWS-WSL.md) nếu dev local Windows).

### Hết dung lượng ổ đĩa

```bash
docker system df
docker system prune -f   # cẩn thận: xóa image/container không dùng
```

---

## 14. Bảo mật

- **Không** commit `.env`; rotate `JWT_SECRET`, MinIO, API key nếu từng lộ.
- Đổi `POSTGRES_PASSWORD`, `MINIO_ROOT_*` trong `docker-compose.yml` trên VPS production (và cập nhật `DATABASE_URL`, `MINIO_*`).
- Chỉ expose 80/443 ra internet; DB/Redis/MinIO/Judge0 bind localhost hoặc firewall nội bộ.
- `NODE_ENV=production` trên API (Swagger tắt theo `main.ts`).
- Backup volume Docker định kỳ (`postgres_data`, `minio_data`).

---

## Phụ lục: Checklist nhanh

```
[ ] SSH vào VPS được
[ ] Docker, Node 20, PM2 đã cài
[ ] Code + 3 file .env đã trên VPS (chmod 600)
[ ] Đã sửa FRONTEND_URL, NEXT_PUBLIC_CORE_URL, JWT_SECRET
[ ] docker compose up -d — healthy
[ ] npm install → prisma generate → migrate deploy → build x3
[ ] pm2 start ecosystem.config.cjs → pm2 save → pm2 startup
[ ] (Tuỳ chọn) Nginx + certbot
[ ] ufw enable, không mở 5432/6379/9000 ra ngoài
[ ] Test login + submit + realtime
```

---

## Tài liệu liên quan

- [README.md](../README.md) — chạy local
- [MINIO.md](./MINIO.md)
- [PRISMA-SEED.md](./PRISMA-SEED.md)
- [JUDGE0-WINDOWS-WSL.md](./JUDGE0-WINDOWS-WSL.md)
