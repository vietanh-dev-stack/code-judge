# Postman — Core API

- **`Code-Judge-Core-API.postman_collection.json`** — import một lần vào Postman (**Import → Upload**). Gồm đủ endpoint, body mẫu, biến collection (`baseUrl`, `accessToken`, `uploadUrl`, `objectKey`, …) và script test tự lưu token / presign.
- **`import.txt`** — từng lệnh `curl` để import dạng Raw text (khi cần tách request).

Hướng dẫn chi tiết: [docs/postman-testapi.md](../../../docs/postman-testapi.md).

Trước khi chạy collection: `npm run prisma:seed -w @code-judge/core-api`. Login mặc định trong biến collection: `instructor@seed.local` / `Secret12!` — xem [docs/PRISMA-SEED.md](../../../docs/PRISMA-SEED.md).
