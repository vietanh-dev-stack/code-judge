# Lộ trình triển khai theo feature — Code Judge

Checklist theo **thứ tự nên làm** (base → cấu hình → schema → API/worker/FE). Cột **Trạng thái**: `Đã` = đáp ứng đủ mục tiêu checklist; `Một phần` = đã có code nhưng còn gap so với mô tả; `Chưa` = chưa có hoặc chưa đạt. Tham chiếu schema: `apps/core-api/prisma/schema.prisma`, tài liệu: `apps/core-api/prisma/schema.md`.

**Kiểm tra codebase lần cuối:** 2026-05-12 (so khớp `apps/core-api`, `apps/worker`, `apps/web`).

**Phạm vi sản phẩm (cập nhật):** **Không** triển khai **Organization / đa tenant** (không API `Organization`, `OrganizationMembership`, import org, hay policy đề `ORG_INTERNAL` theo org). Các mục lịch sử Phần F được ghi là *ngoài phạm vi*; trường nullable trên Prisma (nếu có) không có luồng nghiệp vụ.

---

## Phần A — Nền tảng dự án (Project base)

| # | Việc | Trạng thái | Ghi chú |
|---|------|------------|---------|
| A.1 | Cấu trúc monorepo `apps/core-api`, `apps/worker`, `apps/web` | Đã | npm workspaces; thêm `apps/lambda` (judge) |
| A.2 | `package.json` root: script `dev`/`build`/`lint` gọi từng app | Đã | `dev`/`build` dùng `-ws`; `test` = smoke `ci/smoke.test.mjs` |
| A.3 | Docker Compose: Postgres, Redis, (MinIO nếu cần upload) | Đã | `docker-compose.yml` |
| A.4 | `.env.example` cho từng app + root | Đã | Bổ sung khi thêm service |
| A.5 | README hướng dẫn chạy local (DB, migrate, 3 process) | Đã | `README.md`; một số dòng về `/submissions` public còn lệ thời — nên sửa doc riêng |

---

## Phần B — Cấu hình kỹ thuật (Setup config)

| # | Việc | Trạng thái | Ghi chú |
|---|------|------------|---------|
| B.1 | `prisma.config.ts` + `DATABASE_URL` | Đã | Prisma 7 + adapter pg |
| B.2 | NestJS `ConfigModule` (`.env`, `.env.local`) | Đã | `AppModule` |
| B.3 | ESLint + Prettier cho repo | Đã | |
| B.4 | CI: lint + build `core-api`, `worker`, `web` | Đã | `.github/workflows/ci.yml` (+ build image Lambda, validate compose) |
| B.5 | Health endpoint (`/health`: DB, Redis) | Chưa | Không thấy `HealthController` / route `/health` trong `core-api` |
| B.6 | Swagger/OpenAPI (`/api-docs`) khi không production | Đã | `main.ts` |

---

## Phần C — Cơ sở dữ liệu (Schema & migration)

| # | Việc | Trạng thái | Ghi chú |
|---|------|------------|---------|
| C.1 | Hoàn thiện `schema.prisma` (User, Class, Problem, Contest, Submission, …) | Đã | Theo RFP; role thực tế chủ yếu `ADMIN` / `CLIENT` (khác tài liệu INSTRUCTOR/STUDENT); **không** làm module Organization |
| C.2 | Sinh migration + `migrate deploy` trên DB sạch | Đã | `prisma/migrations/` |
| C.3 | `prisma generate` trong pipeline / sau pull | Đã | Bước CI |
| C.4 | Seed tối thiểu: admin/instructor/student, problem `PUBLIC` + `TestCase`, tag mẫu | Một phần | Có `prisma/seed.ts`: user + lớp + enrollment + **Tag**; **chưa** seed `Problem`/`TestCase` |
| C.5 | Tài liệu DBML / giải thích trường | Đã | `prisma/schema.md` |

---

## Phần D — Core API — khung ứng dụng

| # | Việc | Trạng thái | Ghi chú |
|---|------|------------|---------|
| D.1 | `PrismaModule` + `PrismaService` (adapter pg) | Đã | |
| D.2 | Envelope response + exception filter thống nhất | Đã | |
| D.3 | `ValidationPipe` global (whitelist DTO) | Đã | `main.ts` |
| D.4 | CORS, port `PORT` | Đã | |
| D.5 | Module realtime (Socket.io) + gateway mẫu submission | Đã | `RealtimeModule` / `SubmissionGateway` |

---

## Phần E — Authentication & phân quyền

| # | Việc | Trạng thái | Ghi chú |
|---|------|------------|---------|
| E.1 | Đăng ký / đăng nhập email + `passwordHash` (bcrypt) | Đã | `AuthService.register` / `login` |
| E.2 | JWT access token; `JwtStrategy` + `JwtAuthGuard` global | Đã | Có thêm refresh cookie + `POST /auth/refresh` |
| E.3 | `@Public()` cho route không cần token | Đã | |
| E.4 | `@Roles()` + `RolesGuard` (Role: ADMIN, INSTRUCTOR, STUDENT) | Một phần | Có `@Roles('ADMIN')`…; schema dùng `CLIENT` thay vì INSTRUCTOR/STUDENT |
| E.5 | `GET /auth/me` trả user đầy đủ | Một phần | Có `GET /auth/me` và `GET /users/me`; **không** mở rộng membership tổ chức (ngoài phạm vi Organization) |
| E.6 | `User.isActive` — chặn login khi false | Đã | `AuthService.login` |
| E.7 | `InstructorVerificationStatus` — flow duyệt GV | Chưa | |
| E.8 | OAuth Google — model `OAuthAccount`, callback | Đã | `AuthService` + route Google trong README |
| E.9 | Socket: handshake JWT (bỏ query `userId` thô) | Chưa | `SubmissionGateway` vẫn ưu tiên `handshake.query.userId` / `auth.userId` |

---

## Phần F — ~~Organization & membership~~ *(ngoài phạm vi — đã bỏ)*

> **Quyết định:** Không làm đa tenant / `Organization` / `OrganizationMembership` / import email theo org / policy đề theo org. Không lên task F.1–F.4.

| # | Việc | Trạng thái | Ghi chú |
|---|------|------------|---------|
| F.* | *(đã gỡ khỏi roadmap)* | — | Nếu cần **khoá tài khoản** (`User.isActive`), làm qua luồng **ADMIN** (không cần ORG_ADMIN). |

---

## Phần G — Lớp học (Class CRUD)

| # | Việc | Trạng thái | Ghi chú |
|---|------|------------|---------|
| G.1 | CRUD `ClassRoom` (`classCode` unique, `ownerId`) | Đã | API `classrooms`; không yêu cầu nghiệp vụ gắn tổ chức |
| G.2 | `ClassEnrollment`: join bằng `classCode`, trạng thái PENDING/ACTIVE/REMOVED | Một phần | Join tạo `ACTIVE` trực tiếp; chưa flow PENDING/duyệt |
| G.3 | `ClassInvite`: tạo token, hết hạn, đánh dấu `usedAt` | Đã | Module `invites` |
| G.4 | GV gỡ học viên khỏi lớp | Chưa | Chưa thấy endpoint enrollment remove / REMOVED |
| G.5 | `ClassAssignment`: gắn `problemId` hoặc `contestId` + `dueAt` | Chưa | FE có khái niệm classwork; chưa API backend rõ ràng trong `classrooms` |
| G.6 | FE: màn hình lớp (tạo, copy mã, danh sách SV, bài tập) | Một phần | `apps/web` dashboard lớp, tabs; phụ thuộc API G.4/G.5 |

---

## Phần H — Problem, Tag, TestCase

| # | Việc | Trạng thái | Ghi chú |
|---|------|------------|---------|
| H.1 | CRUD Problem (slug, visibility, limits, mode) | Một phần | CRUD qua `ProblemsModule`; **chỉ `@Roles('ADMIN')`**, chưa INSTRUCTOR như spec |
| H.2 | Gắn `Tag` / `ProblemTag` | Một phần | `TagsModule` + `tagIds` trên create/update + filter list; chưa CRUD Tag đầy đủ cho role non-admin nếu spec cần |
| H.3 | CRUD `TestCase` (order, hidden, weight); validate ≤ `maxTestCases` | Một phần | Nhúng trong create/update `Problem` + AI module; không CRUD test case độc lập |
| H.4 | API list/filter practice: `PUBLIC` + published (+ tag / difficulty / mode) | Một phần | `findAll`: published + `visibility` không `PRIVATE` + filter `tagSlug`/`tagId`; **không** có đa tenant / ORG_INTERNAL |
| H.5 | Ẩn input/output test `isHidden` với thí sinh | Chưa | `GET /problems/:id` public trả **toàn bộ** `testCases` kèm input/output |

---

## Phần I — Submission & hàng đợi (Core API + BullMQ)

| # | Việc | Trạng thái | Ghi chú |
|---|------|------------|---------|
| I.1 | `BullMqModule`: Redis `maxRetriesPerRequest: null`, `Queue` + `QueueEvents` | Đã | |
| I.2 | `POST /submissions`: tạo `Submission` + add job (metadata `submissionId`, priority) | Đã | |
| I.3 | Set `context`, `contestId`, `classRoomId`, `judgePriority` đúng nghiệp vụ | Một phần | Có `context`/`contestId` khi body có contest; `classRoomId`/`judgePriority` contest chưa đầy đủ |
| I.4 | `BullMqEventsService`: progress / completed / failed → cập nhật realtime | Đã | |
| I.5 | Retry/backoff job; dead-letter hoặc requeue | Chưa | `judgeQueue.add` chưa cấu hình `attempts`/`backoff` |
| I.6 | Auth: `userId` lấy từ JWT, không tin body | Chưa | `SubmissionsController` vẫn `@Public()`; DTO bắt buộc `userId`; `upsert` user/problem demo trong service |

---

## Phần J — Worker module (Judge)

| # | Việc | Trạng thái | Ghi chú |
|---|------|------------|---------|
| J.1 | Worker BullMQ consume queue trùng tên với API | Đã | `apps/worker` |
| J.2 | Đọc `Submission` + `TestCase`; chạy sandbox (Docker) | Một phần | Đọc DB + gọi **AWS Lambda** khi cấu hình; không Docker sandbox cục bộ trong worker |
| J.3 | Giới hạn CPU/RAM/time theo Problem / ContestProblem override | Một phần | Truyền `timeLimitMs`/`memoryLimitMb` problem vào payload Lambda; override contest chưa xử lý trong worker |
| J.4 | Ghi `Submission.status`, `caseResults` (JSON), `testsPassed`/`testsTotal`, logs | Một phần | Có `caseResults` + log object khi Lambda; fallback stub ghi `Accepted` + `caseResults` rỗng |
| J.5 | Ưu tiên job: đọc `judgePriority` / `context === CONTEST` | Chưa | Chưa priority trên `Queue.add` |
| J.6 | Tách module judge (runner, compile, compare output) cho dễ test | Một phần | Logic tập trung `worker/src/index.ts` + `apps/lambda` |

---

## Phần K — Contest

| # | Việc | Trạng thái | Ghi chú |
|---|------|------------|---------|
| K.1 | CRUD `Contest` (slug, time window, password hash, policy, max submissions) | Một phần | `ContestsService`: create/update + `passwordHash`, policy, max submissions; CRUD **ADMIN-only** |
| K.2 | `ContestProblem` (điểm, override time/memory) | Đã | Trong create/update contest |
| K.3 | `ContestParticipant` + vào phòng (verify password) | Chưa | Không có API join/register participant |
| K.4 | Enforcement: chỉ submit trong [startAt, endAt]; check attempt vs max | Chưa | Submission chỉ kiểm tra problem thuộc contest |
| K.5 | Trả kết quả theo `ContestTestFeedbackPolicy` (SUMMARY vs VERBOSE) | Chưa | `GET /submissions/:id` trả nguyên `caseResults` |
| K.6 | FE: tạo contest, join, countdown, IDE submit | Một phần | Có trang contest/dashboard; thiếu API K.3–K.5 nên luồng đầy đủ chưa khép |

---

## Phần L — AI & Golden solution

| # | Việc | Trạng thái | Ghi chú |
|---|------|------------|---------|
| L.1 | Lưu `GoldenSolution` (language, code, isPrimary) | Một phần | Có model Prisma + presign trong `storage-access`; chưa module/quy trình “golden” đầy đủ như spec |
| L.2 | Upload đề → `AiGenerationJob` + storage file (`inputDocUrl`) | Một phần | Module `ai-testcase` + storage |
| L.3 | Service gọi LLM → parse test đề xuất → lưu `structuredOutput` | Một phần | `AiTestcaseService` |
| L.4 | Pipeline: chạy golden trên input → điền `expectedOutput` vào `TestCase` | Chưa | |
| L.5 | API duyệt / sửa / xóa test trước khi publish | Một phần | Có generate/save AI testcase; chưa đủ “workflow duyệt” như spec |
| L.6 | Rate limit / quota AI | Chưa | |

---

## Phần M — Báo cáo & toàn vẹn

| # | Việc | Trạng thái | Ghi chú |
|---|------|------------|---------|
| M.1 | Aggregate pass rate, ranking (theo contest / lớp) từ `Submission` | Chưa | Không có `leaderboard` API |
| M.2 | `ReportExport`: job async XLSX/PDF + `fileUrl` | Chưa | Có `excel-report` util + storage assert `ReportExport` — chưa luồng hoàn chỉnh |
| M.3 | `CodeSimilarityFinding`: job so cặp submission (AST/heuristic) | Chưa | |
| M.4 | `Certificate`: phát hành sau contest/lớp | Chưa | |

---

## Phần N — Frontend tổng hợp (Next.js)

| # | Việc | Trạng thái | Ghi chú |
|---|------|------------|---------|
| N.1 | Cấu hình `NEXT_PUBLIC_CORE_URL`, client gọi API có cookie/token | Đã | `api-client.ts`: Bearer + refresh cookie |
| N.2 | Trang đăng nhập / đăng ký | Đã | `(auth)/login`, `register` |
| N.3 | Layout dashboard theo role (SV / GV / Admin) | Một phần | Dashboard, admin routes; role thực tế `CLIENT`/`ADMIN` |
| N.4 | Practice: list problem, detail, editor, submit, lịch sử | Một phần | `problems`, `problem/[id]`; phụ thuộc bảo mật submission/I.6 |
| N.5 | Lớp + contest UI (gắn API phần G, K) | Một phần | Có màn hình; API contest/lớp còn thiếu phần enforcement/participant |
| N.6 | Socket client: subscribe kết quả chấm | Một phần | Cần token/userId handshake — server chưa bắt buộc JWT |

---

## Phần O — Vận hành & chất lượng

| # | Việc | Trạng thái | Ghi chú |
|---|------|------------|---------|
| O.1 | Logging có cấu trúc (request id, submission id) | Một phần | `morgan` + file log; chưa request id chuẩn |
| O.2 | Metrics queue (độ dài, latency) | Chưa | |
| O.3 | Test tích hợp API chính (auth, submit happy path) | Một phần | `npm test` = smoke nhẹ (`ci/smoke.test.mjs`) |
| O.4 | E2E một luồng: đăng nhập → nộp → worker → kết quả | Một phần | Có thể chạy manual; chưa E2E tự động trong CI |

---

## Thứ tự gợi ý (tóm tắt)

1. **A → B → C** — base, config, DB.  
2. **D → E** — khung Nest + auth ổn định.  
3. **I + J** — nộp bài + worker chấm (MVP “có ý nghĩa”).  
4. **H + N (practice)** — đề + UI luyện.  
5. **G** — lớp (không org).  
6. **K** — contest.  
7. **L, M** — AI, báo cáo, export, plagiarism.  
8. **O** — polish vận hành.

---

## Liên kết tài liệu khác

- User story chi tiết + sprint: [`USER-STORIES-TASKLIST.md`](./USER-STORIES-TASKLIST.md)  
- Schema & DBML: `apps/core-api/prisma/schema.md`

---

## Kế hoạch 3 sprint (3 tuần — mỗi sprint **1 tuần**, **4 dev**)

**Giả định**

- **4 dev** ký hiệu: **D1** (BE core), **D2** (BE queue/worker), **D3** (FE), **D4** (FS / hỗ trợ BE+FE / DevOps nhẹ).
- Mỗi sprint **5 ngày làm việc**; ưu tiên **MVP luồng: đăng nhập → đề → nộp → chấm → lớp → thi**.
- **Đẩy sau** (không nằm trong 3 sprint này): đăng nhập **OAuth / bên thứ 3**, **chống gian lận** (so sánh hai code / `CodeSimilarityFinding`), **achievement / chứng chỉ** (`Certificate`). Các mục đó chuyển xuống **Backlog sau sprint 3**.

**Thang ưu tiên trong mỗi sprint** (áp dụng cho tất cả task S1–S3):

| Mức | Ý nghĩa |
|-----|---------|
| **High** | Chặn mục tiêu cuối sprint; ưu tiên làm trước, ít được cắt bỏ. |
| **Medium** | Quan trọng nhưng có thể thu hẹp phạm vi hoặc làm song song sau các task High. |
| **Low** | Polish, hoặc có thể chuyển sang sprint sau nếu hết capacity. |

### Capacity gợi ý (mỗi tuần)

| Dev | Trọng tâm tuần |
|-----|----------------|
| D1 | API Nest, Prisma, auth, contest, class |
| D2 | BullMQ, worker, judge sandbox, `caseResults` |
| D3 | Next.js, form, editor, socket client |
| D4 | Nối FE–BE, seed/migrate, CI, health, QA smoke |

---

### Trạng thái codebase (để không lặp task) — cập nhật 2026-05-12

| Lớp | Đã có | Ghi chú / còn thiếu |
|-----|--------|----------------------|
| **Core API — HTTP** | CORS, cookie parser, `ValidationPipe`, envelope, Swagger | **Chưa** `/health` |
| **Core API — Auth** | Register/login bcrypt, `isActive`, refresh cookie, Google OAuth, JWT global + `@Public()` | Profile: `GET /users/me`; role thực tế `ADMIN`/`CLIENT` |
| **Core API — Modules** | `Users`, `Problems`, `Tags`, `Contests`, `Classrooms` + `Invites`, `Storage`, `AiTestcase`, `Mail` | **Không** làm Organization; contest **chưa** participant/enforcement |
| **Core API — Queue** | BullMQ + `BullMqEventsService` → Socket | **Chưa** retry/priority trên `add` |
| **Core API — Submissions** | `POST/GET /submissions`, enqueue | Vẫn **`@Public()`**, `userId` body + **upsert** user/problem demo |
| **Core API — Realtime** | `SubmissionGateway`, rooms, events | Handshake **chưa** bắt buộc JWT (query `userId`) |
| **Worker** | Đọc submission + test cases; Lambda judge hoặc **stub** | Stub khi không có Lambda; **chưa** override `ContestProblem` limits; **chưa** job priority |
| **Prisma** | Schema + migrations | **Seed**: user + lớp + tag; **không** problem/test trong seed |
| **Web** | `api-client` (Bearer + refresh), login/register, dashboard lớp/contest/admin, practice UI | Socket/ submit cần khớp I.6 + E.9 |

**Ưu tiên nợ kỹ thuật (ngắn gọn):** khóa `POST /submissions` + bỏ upsert; ẩn test hidden ở API public; Socket JWT; seed thêm problem + test; `/health`; API contest participant + enforcement + policy feedback; BullMQ retry/priority.

---

### Sprint 1 — Tuần 1: Seed + auth thật + submission an toàn + worker có kết quả có ý nghĩa

**Mục tiêu cuối tuần**: DB có **seed** ổn định; **đăng ký + đăng nhập có mật khẩu**; **`POST /submissions` bắt buộc JWT**, không upsert demo; worker **ghi `caseResults`** (chấm thật tối thiểu hoặc stub có phân nhánh trạng thái); **health**; FE **login + submit có token**.

#### S1-1 — Seed Prisma và quy trình khởi tạo dữ liệu local
- **Trạng thái (2026-05-12):** **Một phần** — có `prisma/seed.ts` (admin + user CLIENT + 2 lớp + enrollment); **chưa** seed Problem/TestCase; instructor trong seed dùng role `CLIENT`.
- **Đã có**: migration SQL đầy đủ.
- **Việc làm**: Thêm `prisma/seed.ts`: tạo vài user (ADMIN/INSTRUCTOR/STUDENT) với `passwordHash` bcrypt khớp flow login mới; ít nhất một `Problem` PUBLIC `isPublished` + vài `TestCase` (có hidden/public); khai báo `prisma.seed` trong `apps/core-api/package.json`; cập nhật README: `migrate deploy` → `db seed`.
- **Tiêu chí xong**: Máy mới clone chỉ cần migrate + seed là có user đăng nhập được và problem để nộp **không** nhờ upsert trong `SubmissionsService`.
- **Ưu tiên**: **High**
- **Owner**: D1 / D4 · **Checklist**: C.4

#### S1-2 — GET /health (Postgres + Redis)
- **Trạng thái (2026-05-12):** **Chưa**
- **Đã có**: chưa có route health.
- **Việc làm**: Module/controller `HealthController` (hoặc tương đương): ping Prisma/`SELECT 1`, ping Redis (dùng connection BullMQ hoặc client riêng); trả JSON `{ ok, db, redis }` và HTTP 503 nếu thành phần quan trọng fail.
- **Tiêu chí xong**: Có thể dùng cho Docker/K8s readiness; tài liệu env tối thiểu.
- **Ưu tiên**: **Medium**
- **Owner**: D1 · **Checklist**: B.5

#### S1-3 — Đăng ký và đăng nhập có mật khẩu (bcrypt)
- **Trạng thái (2026-05-12):** **Đã làm**
- **Đã có (lịch sử task)**: từng chỉ login theo email; hiện có `POST /auth/register` + login verify bcrypt.
- **Việc làm**: `POST /auth/register` (DTO: email, password, name — validate độ mạnh tối thiểu); hash bcrypt ghi `passwordHash`; mở rộng `LoginDto` thêm `password`; trong `AuthService.loginByEmail` (hoặc đổi tên) verify hash, sai thì `UnauthorizedException` giống user không tồn tại; `@Public()` cho register + login; cập nhật Swagger.
- **Tiêu chí xong**: Không thể lấy JWT chỉ bằng email hợp lệ mà không có mật khẩu đúng.
- **Ưu tiên**: **High**
- **Owner**: D1 · **Checklist**: E.1–E.3

#### S1-4 — Chặn đăng nhập khi `User.isActive === false`
- **Trạng thái (2026-05-12):** **Đã làm**
- **Đã có**: field `isActive` trên model; `AuthService.login` từ chối khi `!user.isActive`.
- **Việc làm**: Trước khi ký JWT, nếu `!user.isActive` → 403 hoặc 401 với message thống nhất envelope.
- **Tiêu chí xong**: User bị vô hiệu hoá không nhận token.
- **Ưu tiên**: **Medium**
- **Owner**: D1 · **Checklist**: E.6

#### S1-5 — Siết `POST /submissions`: JWT, bỏ `userId` body, bỏ upsert demo
- **Trạng thái (2026-05-12):** **Chưa** — controller vẫn `@Public()`, DTO vẫn có `userId`, service vẫn `upsert` user/problem.
- **Đã có**: luồng tạo `Submission` + enqueue + `submission:created`.
- **Việc làm**: Gỡ `@Public()` khỏi `SubmissionsController`; `userId` lấy từ `@CurrentUser()`; `CreateSubmissionDto` bỏ `userId`, thêm rule `problemId` trỏ tới Problem đã publish; xóa toàn bộ `prisma.user.upsert` / `problem.upsert` trong `SubmissionsService`; `context` giữ `PRACTICE` trừ khi đã có contest; đảm bảo lỗi 404/400 rõ ràng.
- **Tiêu chí xong**: Không thể tạo submission hộ user khác; không tự sinh user/problem ảo khi nộp bài.
- **Ưu tiên**: **High**
- **Owner**: D1 · **Checklist**: I.2, I.6

#### S1-6 — Worker: đọc test từ DB và ghi `caseResults` + trạng thái thực tế
- **Trạng thái (2026-05-12):** **Một phần** — đọc `testCases`, ghi `caseResults` khi có Lambda; không cấu hình Lambda → stub AC + `caseResults` rỗng.
- **Đã có**: stub sleep + luôn `Accepted`, cập nhật `score`/`runtimeMs` tĩnh.
- **Việc làm**: Load `Submission` kèm `problem.testCases` (hoặc query riêng), sort theo `order`; ít nhất **một** ngôn ngữ chấm thật (vd. Python) hoặc tạm so khớp output text nếu chưa có sandbox; điền `testsPassed`/`testsTotal`, `status` cuối (AC/WA/…), `caseResults` JSON **có cấu trúc cố định** (vd. mảng `{ index, verdict, timeMs?, memoryMb?, actual?, expected? }` — ẩn field nhạy cảm theo policy sau); vẫn gọi `job.updateProgress` để FE nhận event.
- **Tiêu chí xong**: Một submission có thể kết thúc **không** phải AC nếu sai test; DB có `caseResults` không null trên happy path.
- **Ưu tiên**: **High**
- **Owner**: D2 · **Checklist**: J.1, J.2, J.4

#### S1-7 — FE: trang `/login`, `/register` và client API có Bearer
- **Trạng thái (2026-05-12):** **Đã làm**
- **Đã có (lịch sử task)**: trước đây chưa auth UI; hiện có `(auth)/login`, `register` và `apiFetch`.
- **Việc làm**: Form đăng ký/đăng nhập gọi API; lưu `accessToken` (memory + `sessionStorage` hoặc cookie httpOnly nếu đã chuẩn bị — ghi rõ choice trong code); helper `apiFetch` tự gắn `Authorization`; xử lý envelope `{ success, result }` từ interceptor.
- **Tiêu chí xong**: User có thể tạo tài khoản và đăng nhập chỉ qua UI.
- **Ưu tiên**: **High**
- **Owner**: D3 · **Checklist**: N.1, N.2

#### S1-8 — FE: chỉnh trang nộp bài (`/`) theo user đã đăng nhập
- **Trạng thái (2026-05-12):** **Một phần** — có luồng practice/submit qua các trang mới + `apiFetch`; API submit vẫn public + `userId` body nên chưa đạt tiêu chí bảo mật.
- **Đã có**: form submit + Socket với `userId` tự nhập.
- **Việc làm**: Redirect tới `/login` nếu chưa token; `POST /submissions` không gửi `userId`; `problemId` mặc định từ seed hoặc dropdown gọi API list (nếu S1 chưa có list API thì hardcode id từ seed + comment); hiển thị lỗi 401/validation từ API.
- **Tiêu chí xong**: Luồng: register → login → nộp bài **một user** không nhập tay `userId`.
- **Ưu tiên**: **High**
- **Owner**: D3 / D4 · **Checklist**: N.4

#### S1-9 — CI: lint + build (GitHub Actions hoặc tương đương)
- **Trạng thái (2026-05-12):** **Đã làm** — `.github/workflows/ci.yml`
- **Đã có**: script `lint`/`build` ở root workspaces + workflow CI (lint, smoke test, build apps).
- **Việc làm**: Pipeline cài dependency, chạy `npm run lint` và `npm run build` cho `apps/core-api`, `apps/worker`, `apps/web` (có thể matrix hoặc một job sequential); fail PR nếu đỏ.
- **Tiêu chí xong**: Mỗi PR có kiểm tra tự động tối thiểu.
- **Ưu tiên**: **Medium**
- **Owner**: D4 · **Checklist**: B.4

#### S1-10 — Socket.io: xác thực JWT, bỏ `?userId=` trên production path
- **Trạng thái (2026-05-12):** **Chưa** — gateway vẫn đọc `query.userId` / `auth.userId`.
- **Đã có**: join room từ query; server emit đúng user từ DB trong `BullMqEventsService`.
- **Việc làm**: Trong `handleConnection`, parse JWT từ `handshake.auth.token` (hoặc header tương thích client); verify cùng secret/exp với API; `sub` → join `user:<sub>`; từ chối connection nếu token sai; FE `io(url, { auth: { token } })`.
- **Tiêu chí xong**: Không thể subscribe kết quả của user khác chỉ bằng query string.
- **Ưu tiên**: **Medium**
- **Owner**: D2 / D3 · **Checklist**: E.9, N.6

**Không làm trong S1**: OAuth (E.8), **Organization** (đã bỏ phạm vi), Class, Contest, AI, export file, plagiarism, certificate. **Không** lên task riêng cho: Swagger, envelope, BullMQ wiring, JwtAuthGuard global (đã có).

---

### Sprint 2 — Tuần 2: Problem + Tag + TestCase + Class + Practice UI

**Mục tiêu cuối tuần**: **Module REST** cho Problem/TestCase/Tag; **ClassRoom + enrollment**; worker chấm **đủ** test với TLE/MLE/CE nếu sandbox cho phép; FE **practice** và **lớp** nối API thật.

**Lưu ý**: Trong `apps/core-api/src` **chưa** có controller/service Problem hay Class — toàn bộ S2-1…S2-6 là phát triển mới, có thể chia module theo `problems/`, `classes/`.

#### S2-1 — Module Problem: CRUD + quyền INSTRUCTOR/ADMIN
- **Trạng thái (2026-05-12):** **Một phần** — có HTTP CRUD; **chỉ** `@Roles('ADMIN')`, chưa INSTRUCTOR.
- **Đã có (lịch sử task)**: khi viết plan ban đầu chưa có HTTP API; hiện có `ProblemsModule`.
- **Việc làm**: `ProblemsModule`: tạo/sửa/xóa (soft delete nếu schema hỗ trợ) với `@Roles(INSTRUCTOR|ADMIN)`; field `slug` unique, `visibility`, `difficulty`, `mode`, giới hạn time/memory, `maxTestCases`, `supportedLanguages`; validate slug; DTO + Swagger.
- **Tiêu chí xong**: GV tạo đề mới qua API; student không gọi được CRUD (chỉ xem list public ở S2-2).
- **Ưu tiên**: **High**
- **Owner**: D1 · **Checklist**: H.1

#### S2-2 — GET list/filter Problem cho practice (PUBLIC + published)
- **Trạng thái (2026-05-12):** **Một phần** — có list published + search/paging + filter tag; detail public vẫn lộ test ẩn (xem H.5).
- **Việc làm**: Endpoint list phân trang, filter `difficulty`/`mode`/`tagSlug`; `isPublished=true`; optional search `title`/`slug`; response list/detail **không** chứa test hidden cho viewer không quyền (redact H.5).
- **Tiêu chí xong**: FE có thể gọi một API thay vì hardcode `problemId`.
- **Ưu tiên**: **High**
- **Owner**: D1 · **Checklist**: H.4

#### S2-3 — Tag + `ProblemTag` + filter theo tag
- **Trạng thái (2026-05-14):** **Một phần** — đã có `GET/POST /tags`, `tagIds` trên problem, `tagId`/`tagSlug` trên list + FE filter.
- **Việc làm** *(còn lại)*: Hoàn thiện CRUD/tag theo role nếu cần; đồng bộ tài liệu/README.
- **Tiêu chí xong**: Lọc đề theo ít nhất một tag trên UI.
- **Ưu tiên**: **Medium**
- **Owner**: D1 · **Checklist**: H.2, H.4

#### S2-4 — CRUD TestCase (GV) + API “student view”
- **Trạng thái (2026-05-12):** **Một phần** — test case qua body create/update Problem + AI; **không** tách endpoint; public detail **chưa** redact hidden.
- **Việc làm**: CRUD test case theo `problemId`, validate `order`, `isHidden`, đếm `≤ maxTestCases`; endpoint **public/student** khi xem đề chỉ trả test không hidden (hoặc chỉ meta số test); instructor thấy đủ.
- **Tiêu chí xong**: Không lộ input/output test ẩn qua API public.
- **Ưu tiên**: **High**
- **Owner**: D1 · **Checklist**: H.3, H.5

#### S2-5 — ClassRoom CRUD + `classCode`
- **Trạng thái (2026-05-12):** **Đã làm** (API `classrooms`)
- **Việc làm**: Module `ClassRoom`: tạo lớp (owner = instructor đang login), sinh `classCode` unique (format rõ ràng), update tên/mô tả, archive nếu có field (**không** yêu cầu gắn tổ chức).
- **Tiêu chí xong**: GV có API tạo lớp và đọc chi tiết lớp của mình.
- **Ưu tiên**: **High**
- **Owner**: D1 · **Checklist**: G.1

#### S2-6 — ClassEnrollment: join bằng mã, duyệt, gỡ
- **Trạng thái (2026-05-12):** **Một phần** — join + list people; **chưa** duyệt PENDING; **chưa** gỡ học viên.
- **Việc làm**: SV gửi mã → tạo/kích hoạt enrollment (PENDING → ACTIVE tùy policy: auto-approve MVP); GV list học viên, PATCH trạng thái, DELETE/REMOVED; chặn join lớp không tồn tại.
- **Tiêu chí xong**: Hai user: GV tạo lớp, SV join bằng mã qua API.
- **Ưu tiên**: **High**
- **Owner**: D1 · **Checklist**: G.2, G.4

#### S2-7 — ClassInvite MVP (token + hết hạn)
- **Trạng thái (2026-05-12):** **Đã làm** (`invites` module)
- **Việc làm**: Tạo invite record, `expiresAt`, one-time `usedAt`; endpoint “consume” khi mở link; log URL ra console thay email nếu chưa SMTP.
- **Tiêu chí xong**: Một link mời chỉ dùng được trong TTL và không tái sử dụng sau `usedAt`.
- **Ưu tiên**: **Medium**
- **Owner**: D1 · **Checklist**: G.3

#### S2-8 — Worker: sandbox đầy đủ trạng thái (AC/WA/TLE/MLE/CE/RE)
- **Trạng thái (2026-05-12):** **Một phần** — phụ thuộc Lambda; stub local không phân nhánh WA/TLE/MLE/CE đầy đủ.
- **Đã có**: pipeline stub đã được thay ở S1 bằng bước đầu có `caseResults`.
- **Việc làm**: Áp dụng `timeLimitMs`/`memoryLimitMb` của Problem; biên dịch/chạy (nếu đa ngôn ngữ thì ưu tiên 1–2 ngôn ngữ trước); map lỗi runtime → status; ghi log compile vào `logs`; cập nhật từng phần `caseResults`.
- **Tiêu chí xong**: Có thể demo WA và TLE cố ý bằng đề có test tương ứng.
- **Ưu tiên**: **High**
- **Owner**: D2 · **Checklist**: J.2–J.4

#### S2-9 — BullMQ: retry, backoff, `judgePriority` khi có `contestId`
- **Trạng thái (2026-05-12):** **Chưa**
- **Việc làm**: Cấu hình `attempts`/`backoff` trên `add`; khi enqueue submission có `contestId` (chuẩn bị S3) set priority cao hơn practice; document hành vi.
- **Tiêu chí xong**: Job fail tạm thời được retry giới hạn; contest job không bị nghẽn sau practice trong test tải giả lập.
- **Ưu tiên**: **Medium**
- **Owner**: D2 · **Checklist**: I.5, J.5

#### S2-10 — FE Practice: danh sách, chi tiết đề, editor, lịch sử submission
- **Trạng thái (2026-05-12):** **Một phần** — có `problems`, `problem/[id]` workspace; lịch sử tuỳ tích hợp `GET /submissions`.
- **Việc làm**: Trang `/problems`, `/problems/[slug]`; gọi list + detail API; editor (có thể textarea trước, Monaco sau); `POST /submissions`; trang hoặc panel “lịch sử” gọi `GET` submissions (nếu chưa có API thì **bổ sung** `GET /submissions/me` hoặc filter query — ghi vào task D1 phụ).
- **Tiêu chí xong**: User đăng nhập luyện tập end-to-end không dùng trang `/` demo cũ.
- **Ưu tiên**: **High**
- **Owner**: D3 · **Checklist**: N.4

#### S2-11 — FE Lớp: tạo lớp, copy mã, join, danh sách
- **Trạng thái (2026-05-12):** **Một phần** — dashboard lớp + invite modal; API gỡ SV chưa có.
- **Việc làm**: Màn GV: tạo lớp, hiển thị `classCode`, list SV; màn SV: nhập mã join; dùng layout theo role (MVP).
- **Tiêu chí xong**: Hai role thấy đúng dữ liệu từ API S2-5/S2-6.
- **Ưu tiên**: **High**
- **Owner**: D3 / D4 · **Checklist**: G.6, N.5

#### S2-12 — Bổ sung GET submissions (nếu S2-10 cần)
- **Trạng thái (2026-05-12):** **Một phần** — có `GET /submissions` + query nhưng endpoint **public**; chưa scope JWT-only.
- **Việc làm**: `GET /submissions` scoped theo user hiện tại + optional `problemId`, phân trang; ẩn field nhạy cảm nếu contest (chưa có thì chỉ practice).
- **Tiêu chí xong**: FE hiển thị lịch sử không hack id.
- **Ưu tiên**: **Medium**
- **Owner**: D1 · **Checklist**: Phần I (mở rộng list submissions)

#### S2-13 — Smoke E2E: GV tạo đề + SV nộp trong lớp (hoặc practice)
- **Trạng thái (2026-05-12):** **Một phần** — CI có smoke nhẹ; chưa kịch bản E2E đầy đủ trong repo.
- **Việc làm**: Kịch bản manual/script: register 2 acc → instructor tạo problem + test → student list → submit → thấy WA/AC.
- **Tiêu chí xong**: Checklist QA trong README hoặc `docs/`.
- **Ưu tiên**: **Medium**
- **Owner**: D4 · **Checklist**: O.4

**Không làm trong S2**: OAuth, AI sinh test (L), `ReportExport`, plagiarism, certificate, **Organization** (đã bỏ phạm vi). **Đã làm ở S1**: Socket JWT — không lặp task trừ khi còn nợ kỹ thuật.

---

### Sprint 3 — Tuần 3: Contest + enforcement + báo cáo nhẹ + polish

**Mục tiêu cuối tuần**: **Contest** đầy đời trên API + FE: tạo kỳ thi, vào phòng, nộp trong khung giờ, giới hạn attempt, **feedback policy**, worker đọc override limit; **stats/ranking** đơn giản (không export).

**Lưu ý**: Contest hiện chỉ có trên Prisma — cần module `contests/` (hoặc tương đương) và mở rộng `POST /submissions` / `CreateSubmissionDto` đã có.

#### S3-1 — CRUD Contest + gán `ContestProblem` (điểm, override limit)
- **Trạng thái (2026-05-12):** **Một phần** — có create/update/delete + `ContestProblem`; **ADMIN-only**; slug sinh từ title.
- **Việc làm**: Tạo/sửa contest: `slug`, `startAt`/`endAt`, `maxSubmissionsPerProblem`, `testFeedbackPolicy`, `passwordHash` nullable (bcrypt nếu có mật khẩu phòng); CRUD `ContestProblem` liên kết `problemId`, `maxScore`, override `timeLimitMs`/`memoryLimitMb`; validate thời gian và đề đã publish.
- **Tiêu chí xong**: Instructor tạo contest và gán ít nhất một đề qua API.
- **Ưu tiên**: **High**
- **Owner**: D1 · **Checklist**: K.1, K.2

#### S3-2 — ContestParticipant: join, verify password, trạng thái
- **Trạng thái (2026-05-12):** **Chưa**
- **Việc làm**: Endpoint “register participant” (user đã JWT); nếu contest có password thì body gửi plaintext so bcrypt; lưu `ContestParticipant`; chặn join khi quá hạn đăng ký nếu có rule (hoặc chỉ check vào lúc submit — ghi rõ).
- **Tiêu chí xong**: User không join được contest private khi sai mật khẩu.
- **Ưu tiên**: **High**
- **Owner**: D1 · **Checklist**: K.3

#### S3-3 — Enforcement: thời gian + số lần nộp + đề thuộc contest
- **Trạng thái (2026-05-12):** **Chưa** — chỉ kiểm tra problem thuộc contest.
- **Việc làm**: Trong service tạo submission: bắt buộc `contestId` + `problemId` thuộc contest; `now` ∈ `[startAt,endAt]` (timezone UTC hoặc config); đếm submission trước đó của user cho cặp (contest, problem) so với `maxSubmissionsPerProblem`; từ chối nếu chưa là participant ACTIVE.
- **Tiêu chí xong**: Nộp ngoài giờ hoặc quá số lần → 409/400 với message cố định.
- **Ưu tiên**: **High**
- **Owner**: D1 · **Checklist**: K.4

#### S3-4 — `POST /submissions` mở rộng: `context=CONTEST`, `contestId`, `judgePriority`
- **Trạng thái (2026-05-12):** **Một phần** — có `contestId` → `context` CONTEST; `judgePriority` cố định 0.
- **Việc làm**: DTO nhận optional `contestId`; khi có thì set `context` CONTEST, tăng `judgePriority` (khớp S2-9); đảm bảo worker nhận đủ metadata trong job data nếu cần.
- **Tiêu chí xong**: Submission contest và practice phân biệt được trong DB và queue.
- **Ưu tiên**: **High**
- **Owner**: D1 · **Checklist**: I.3

#### S3-5 — API trả kết quả theo `ContestTestFeedbackPolicy`
- **Trạng thái (2026-05-12):** **Chưa**
- **Việc làm**: Serializer layer cho `GET /submissions/:id` (và payload realtime nếu cần): SUMMARY chỉ tổng điểm/trạng thái; VERBOSE cho phép `caseResults` chi tiết hơn cho role instructor/admin; thí sinh không thấy test hidden details.
- **Tiêu chí xong**: Hai contest cùng submission logic nhưng policy khác → JSON khác nhau đúng spec.
- **Ưu tiên**: **High**
- **Owner**: D1 · **Checklist**: K.5

#### S3-6 — Worker: áp `ContestProblem` override khi chấm
- **Trạng thái (2026-05-12):** **Chưa**
- **Việc làm**: Nếu job/submission có `contestId`, resolve `ContestProblem` và ưu tiên limit override so với Problem gốc khi spawn sandbox.
- **Tiêu chí xong**: Đề trong contest có time limit khác practice trên cùng Problem.
- **Ưu tiên**: **Medium**
- **Owner**: D2 · **Checklist**: J.3

#### S3-7 — ClassAssignment MVP + list bài theo lớp
- **Trạng thái (2026-05-12):** **Chưa** (FE có classwork UI; backend chưa khớp spec)
- **Việc làm**: Model `ClassAssignment`: gắn `classRoomId`, `problemId` hoặc `contestId`, `dueAt`; API GV tạo/gỡ; API SV list assignment của lớp đã join.
- **Tiêu chí xong**: Từ FE lớp, SV thấy bài được giao dẫn tới problem/contest.
- **Ưu tiên**: **Medium**
- **Owner**: D1 · **Checklist**: G.5

#### S3-8 — FE: màn tạo/sửa contest (MVP) + join + countdown
- **Trạng thái (2026-05-12):** **Một phần** — có trang contest/dashboard; thiếu join + enforcement API.
- **Việc làm**: Form tạo contest + chọn đề; trang public/private link join; input password; component countdown `startAt`/`endAt` (client sync clock hoặc hiển thị server time một lần).
- **Tiêu chí xong**: GV và SV hoàn tất join trước khi mở đề.
- **Ưu tiên**: **High**
- **Owner**: D3 · **Checklist**: K.6

#### S3-9 — FE: IDE nộp bài trong contest + realtime + respect policy
- **Trạng thái (2026-05-12):** **Một phần** — phụ thuộc S3-3, S3-5, socket JWT.
- **Việc làm**: Reuse editor practice; gọi `POST /submissions` kèm `contestId`; hiển thị kết quả/socket theo mức detail API cho phép (ẩn chi tiết case khi SUMMARY); handle lỗi enforcement (quá giờ, hết lượt).
- **Tiêu chí xong**: Thí sinh không “lộ” đáp án test qua UI khi policy cấm.
- **Ưu tiên**: **High**
- **Owner**: D3 / D4 · **Checklist**: N.5

#### S3-10 — API stats: pass rate + ranking (in-memory hoặc query SQL)
- **Trạng thái (2026-05-12):** **Chưa**
- **Việc làm**: Endpoint `GET /contests/:id/leaderboard` hoặc tương đương: tổng điểm theo rule contest (AC full điểm partial nếu có), tie-break thời gian nộp bài cuối cùng đạt điểm; optional pass rate theo problem; **không** tạo file export.
- **Tiêu chí xong**: Leaderboard đúng với vài submission mẫu trong seed hoặc manual test.
- **Ưu tiên**: **Medium**
- **Owner**: D1 · **Checklist**: M.1

#### S3-11 — Hardening & tài liệu demo contest E2E
- **Trạng thái (2026-05-12):** **Chưa** (README chưa mô tả đủ luồng contest E2E như tiêu chí)
- **Việc làm**: Rà soát lỗi nhỏ; cập nhật README: tạo contest → 2 user → nộp → xem rank; ghi env cần cho demo.
- **Tiêu chí xong**: Người mới làm theo doc chạy được demo trong < 30 phút (máy đã có Docker DB/Redis).
- **Ưu tiên**: **Low**
- **Owner**: D4 · **Checklist**: A.5, O.3

**Không làm trong S3**: OAuth (E.8), **CodeSimilarityFinding** (M.3), **Certificate** (M.4), **ReportExport** (M.2) — nằm **Backlog sau sprint 3**. AI đầy đủ (L) chỉ **spike** nếu còn giờ.

---

### Backlog sau sprint 3 (ưu tiên thấp hơn — theo yêu cầu “đẩy sau”)

| Thứ tự gợi ý | Hạng mục | Ghi chú |
|---------------|----------|---------|
| B1 | **Đăng nhập bên thứ 3 (OAuth / Google)** | `OAuthAccount`, E.8 |
| B2 | **Chống gian lận — so khớp hai mã nguồn** | `CodeSimilarityFinding`, job AST/hash, UI % giống |
| B3 | **Achievement / chứng chỉ** | `Certificate`, phát hành sau contest/lớp |
| B4 | **Export báo cáo file** | `ReportExport` XLSX/PDF |
| B5 | **AI sinh test + Golden** đầy đủ | Phần L |
| ~~B6~~ | ~~**Organization**~~ | **Đã bỏ** — không nằm trong phạm vi sản phẩm |
| B7 | **InstructorVerification** workflow + admin duyệt | E.7 |

---

### Tổng hợp theo dev (gợi ý phân bổ tuần)

| Dev | Sprint 1 | Sprint 2 | Sprint 3 |
|-----|----------|----------|----------|
| **D1** | Seed, health, register/login bcrypt, siết submissions, auth edge cases | ProblemsModule + tests + classes + list API + GET submissions | ContestsModule, enforcement, policy serializer, stats |
| **D2** | Worker `caseResults` + judge thật tối thiểu, socket JWT | Sandbox đủ verdict, retry/priority | Worker đọc override `ContestProblem` |
| **D3** | `/login`, `/register`, refactor `/` submit + socket token | Practice pages, class UI | Contest create/join/countdown, submit trong contest |
| **D4** | Seed hỗ trợ, CI workflow, nối FE submit | QA smoke GV/SV | Demo doc E2E contest |

---

*File này: **thứ tự feature** ở các phần A–O; **3 sprint** lọc theo **trạng thái codebase** (mục “Trạng thái codebase”), task gồm **đã có / việc làm / tiêu chí xong / ưu tiên**. Chi tiết story point có thể bổ sung trong `USER-STORIES-TASKLIST.md`.*
