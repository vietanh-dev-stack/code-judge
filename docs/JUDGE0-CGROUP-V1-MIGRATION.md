# Chuyển Judge0 từ cgroup v2 (stub) sang cgroup v1 (isolate thật)

Tài liệu này dành cho **VPS Ubuntu 22.04/24.04** chạy production với [`docker-compose.production.yml`](../docker-compose.production.yml).

## Tóm tắt

| | Cách A (mặc định) | Cách B (sau khi migrate) |
|--|-------------------|---------------------------|
| Host cgroup | v2 (unified) | v1 (`systemd.unified_cgroup_hierarchy=0`) |
| Judge0 | `JUDGE0_USE_CGROUP=false` + `isolate_stub.sh` | `JUDGE0_USE_CGROUP=true` + isolate gốc trong image |
| Time limit | Có (`timeout`) | Có (isolate) |
| Memory limit | **Không enforce** | **Enforce** qua cgroup |
| MLE verdict | Không đáng tin | Có thể dùng |
| Sandbox | Yếu hơn | Mạnh hơn |

## Ảnh hưởng khi đổi

### Trên toàn VPS

- Thêm tham số kernel **GRUB** → **bắt buộc reboot** (~5–10 phút downtime).
- Docker, Postgres, Redis, MinIO, `core-api`, `web` **không cần** đổi code — chỉ kiểm tra sau reboot: `docker ps`.
- Một số distro/tool mới ưu tiên cgroup v2; rollback bằng cách gỡ flag GRUB nếu có vấn đề hiếm.

### Chỉ Judge0 + worker chấm bài

- Recreate container `judge0-server`, `judge0-worker`, `worker` (app).
- `memoryLimitMb` trên Problem bắt đầu có ý nghĩa thực tế (MLE).
- Calibrate limit từ golden: có thể tin số memory (đặt `JUDGE0_MEMORY_ENFORCED=true` trên worker).

### Không áp dụng

- Dev **Windows** / `docker-compose.yml` — giữ stub.
- Lambda path (`JUDGE_ENGINE=lambda`) — ngoài phạm vi Judge0.

---

## Điều kiện trước khi làm

1. Stack production **đang chấm được** (dù stub).
2. Có quyền `sudo` trên VPS, chấp nhận reboot.
3. Backup hoặc cửa sổ bảo trì (không submit contest quan trọng trong lúc reboot).

---

## Bước 1 — Bật cgroup v1 trên host

SSH vào VPS:

```bash
sudo cp /etc/default/grub /etc/default/grub.bak.$(date +%Y%m%d)
sudo nano /etc/default/grub
```

Trong `GRUB_CMDLINE_LINUX_DEFAULT`, thêm (giữ các tham số hiện có):

```text
systemd.unified_cgroup_hierarchy=0
```

**DigitalOcean / cloud image:** file `/etc/default/grub` thường **bị ghi đè** bởi `/etc/default/grub.d/50-cloudimg-settings.cfg` và `51-legacy-ifnames.cfg` — tham số trong `grub` gốc **không** vào kernel. Tạo file cuối cùng (ví dụ `99-cgroup-v1.cfg`):

```bash
sudo tee /etc/default/grub.d/99-cgroup-v1.cfg << 'EOF'
GRUB_CMDLINE_LINUX_DEFAULT="console=tty1 console=ttyS0 net.ifnames=0 biosdevname=0 quiet splash systemd.unified_cgroup_hierarchy=0"
EOF
```

Sau `update-grub`, kiểm tra: `grep unified_cgroup /boot/grub/grub.cfg` phải thấy dòng `linux ... systemd.unified_cgroup_hierarchy=0`.

Ví dụ (chỉ khi không dùng cloud grub.d):

```text
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash systemd.unified_cgroup_hierarchy=0"
```

Áp dụng và reboot:

```bash
sudo update-grub
sudo reboot
```

Sau khi SSH lại:

```bash
# Docker stack
docker ps

# Gợi ý kiểm tra cgroup (tùy bản Ubuntu)
test -d /sys/fs/cgroup/memory && echo "cgroup v1 memory controller path OK"
grep -q '^0$' /proc/sys/kernel/cgroup_memory_nosocket 2>/dev/null || true
```

Nếu `docker ps` trống, chạy lại từ thư mục project:

```bash
cd ~/code-judge
./deploy/production-up.sh
```

Tham chiếu: [Judge0 #543](https://github.com/judge0/judge0/issues/543), [`deploy/README.md`](../deploy/README.md) § Judge0 cgroup.

---

## Bước 2 — Cấu hình Judge0 (isolate thật)

### 2.1 `.env.production`

```bash
cd ~/code-judge
nano .env.production
```

Đặt:

```env
JUDGE0_USE_CGROUP=true
```

(Tuỳ chọn trên **worker** sau khi code calibrate được deploy:)

```env
JUDGE0_MEMORY_ENFORCED=true
LIMIT_TIME_SAFETY=2
LIMIT_MEM_SAFETY=1.5
```

### 2.2 Compose override (đã có trong repo)

File **[`docker-compose.production-judge0-isolate.yml`](../docker-compose.production-judge0-isolate.yml)** tự động được gắn khi `JUDGE0_USE_CGROUP=true` (xem `deploy/compose-production-args.sh`, `production-up.sh`, `redeploy-vps.sh`):

- Bỏ mount `isolate_stub.sh` / `sudo_stub.sh`
- Mount `/sys/fs/cgroup` cho isolate
- Worker: `JUDGE0_MEMORY_ENFORCED=true`

Không cần sửa tay từng dòng stub trong `docker-compose.production.yml`.

### 2.3 Recreate Judge0

```bash
cd ~/code-judge
chmod +x deploy/judge0-isolate-up.sh
./deploy/judge0-isolate-up.sh
```

Hoặc full redeploy: `./deploy/redeploy-vps.sh`

Kiểm tra binary (không còn là stub script):

```bash
docker exec cj-prod-judge0-worker head -n 3 /usr/local/bin/isolate
# Kỳ vọng: binary hoặc ELF — KHÔNG phải "#!/bin/bash" của isolate_stub.sh
```

---

## Bước 3 — Smoke test

### 3.1 API Judge0 trực tiếp

```bash
JUDGE0=http://localhost:2358   # hoặc URL nội bộ Docker network nếu test từ VPS host qua port publish

curl -s -X POST "$JUDGE0/submissions?base64_encoded=true&wait=true" \
  -H "Content-Type: application/json" \
  -d '{"source_code":"cHJpbnQoMSk=","language_id":71,"stdin":"","cpu_time_limit":2,"memory_limit":65536}' \
  | jq '.status,.stdout,.message'
```

Kỳ vọng: `status.description` = `Accepted` (hoặc tương đương id 3).

### 3.2 Qua ứng dụng

1. Submit bài ALGO đơn giản → **Accepted**.
2. (Tuỳ chọn) Bài cố tình `malloc` / list lớn vượt `memoryLimitMb` → **MemoryLimitExceeded** hoặc Runtime Error SIGKILL (tùy Judge0/isolate).

### 3.3 Phân biệt hai container “worker”

| Container | Vai trò | Liên quan cgroup |
|-----------|---------|------------------|
| `cj-prod-worker` | Node/BullMQ — gọi `http://judge0-server:2358` | **Không** mount cgroup |
| `cj-prod-judge0-worker` | Judge0 Rails — chạy `isolate` | **Cần** cgroup v1 + override compose |

Log `Judge0 error` / `Internal Error` trong `docker logs cj-prod-worker` thường là **Judge0 trả lỗi**, không phải Node worker crash.

### 3.4 Chẩn đoán nhanh trên VPS

```bash
cd ~/code-judge
set -a && source .env.production && set +a
source deploy/compose-production-args.sh

# 1) Host đã cgroup v1 chưa?
mount | grep -E 'cgroup.*memory|/sys/fs/cgroup/memory'
docker info 2>/dev/null | grep -i cgroup

# 2) Compose có bỏ stub và mount cgroup?
docker compose "${COMPOSE_PROD_ARGS[@]}" --env-file .env.production config \
  | grep -E 'isolate_stub|cgroup:rw|cgroupns'

# 3) Binary isolate trong judge0-worker (không phải bash stub)
docker exec cj-prod-judge0-worker head -n 1 /usr/local/bin/isolate

# 4) Kernel 6.11+ — file hierarchy memory (Judge0 #554)
test -f /sys/fs/cgroup/memory/memory.use_hierarchy && echo OK || echo "WARN: thiếu memory.use_hierarchy"

# 5) Log
docker logs cj-prod-judge0-worker --tail 80
docker logs cj-prod-worker --tail 40
```

Log khởi động `cj-prod-worker` kỳ vọng có **3 queue**: `judge-submissions,golden-verify,calibrate-limits`. Nếu chỉ thấy 2 queue → image worker **chưa build lại** sau sync code mới (`./deploy/redeploy-vps.sh`).

### 3.5 Log lỗi thường gặp

| Log | Nguyên nhân | Xử lý |
|-----|-------------|--------|
| `Cannot write /sys/fs/cgroup/memory/box-*` | Host vẫn cgroup v2, chưa reboot, hoặc container cgroup namespace riêng | Lặp Bước 1; dùng `docker-compose.production-judge0-isolate.yml` (có `cgroupns: host`); recreate judge0-* |
| `JUDGE0_USE_CGROUP=true` nhưng vẫn mount `isolate_stub.sh` | `up` thiếu file override `-f docker-compose.production-judge0-isolate.yml` | `./deploy/judge0-isolate-up.sh` hoặc `./deploy/redeploy-vps.sh` |
| `sudo: Permission denied` / `No such file - isolate` | Vẫn mount stub hoặc CRLF trên `.sh` | Bỏ mount stub; `sed -i 's/\r$//' scripts/*.sh` nếu cần quay lại stub |
| Internal Error, stdout null | isolate chưa init / quyền box / thiếu `memory.use_hierarchy` | `isolate --init`, `privileged: true`; xem [Judge0 #554](https://github.com/judge0/judge0/issues/554) |

---

## Rollback về stub (cgroup v2)

1. Khôi phục GRUB (bỏ `systemd.unified_cgroup_hierarchy=0`) → `sudo update-grub && sudo reboot`.
2. `.env.production`: `JUDGE0_USE_CGROUP=false`.
3. Thêm lại 3 volume mount `isolate_stub.sh` / `sudo_stub.sh` trong compose.
4. `force-recreate` judge0-server, judge0-worker, worker.

```bash
sed -i 's/\r$//' scripts/isolate_stub.sh scripts/sudo_stub.sh
chmod +x scripts/isolate_stub.sh scripts/sudo_stub.sh
docker compose -f docker-compose.production.yml --env-file .env.production up -d --force-recreate judge0-server judge0-worker worker
```

---

## Liên kết tính năng calibrate limit (code-judge)

Sau migrate Cách B:

- Admin dùng **Đo limit bằng golden** (API `POST /problems/:id/calibrate-limits`) — memory đo được có thể auto-apply.
- Worker: `JUDGE0_MEMORY_ENFORCED=true` để UI/API biết memory đang enforce.

Trước migrate (stub): vẫn calibrate **time**; memory chỉ là gợi ý trên đề.

Xem thêm: [`CHAM-BAI-THUAT-TOAN.html`](CHAM-BAI-THUAT-TOAN.html) mục 3.5, plan `cải_thiện_time_memory`.
