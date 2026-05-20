# Thư mục `src/lib` (Worker)

Các module dùng chung cho worker (không phụ thuộc NestJS).

## `constants.ts`

- **`JUDGE_SUBMISSIONS_QUEUE_NAME`**: tên queue BullMQ mà worker lắng nghe.
  - Phải khớp với Core API (`apps/core-api/src/common/constants/queue.constants.ts`).

## `env.ts`

- **`getRequiredEnv(name, value)`**: đọc biến bắt buộc; thiếu → throw.
- **`getOptionalEnv(value, defaultValue)`**: đọc biến tuỳ chọn, có default cho dev.

## `logger.ts`

- **`createWorkerLogger(scope)`**: tạo object `info/warn/error` có prefix `[scope]` để log đồng nhất.

## `sleep.ts`

- **`sleep(ms)`**: `Promise` chờ async; dùng trong stub judge hoặc backoff đơn giản.

## `storage.ts`

- MinIO/S3-compatible helper cho worker:
  - **`ensureBucketExists()`**: tự tạo bucket nếu chưa có.
  - **`putArtifactObject(objectKey, body, metadata?)`**: ghi artifact/testcase output.
- Biến môi trường liên quan:
  - `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`
  - `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
  - `MINIO_BUCKET`, `MINIO_REGION`
