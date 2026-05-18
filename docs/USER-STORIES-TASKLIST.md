# Task list — User stories & schema RFP (`code-judge`)

Tài liệu bám **user story RFP** (user & tài khoản, lớp học, đề + AI + visibility, contest, judge, luyện tập, báo cáo & gian lận, realtime) và **schema Prisma hiện tại**: `apps/core-api/prisma/schema.prisma` (chi tiết field/comment) và `apps/core-api/prisma/schema.md` (DBML + tra cứu).

**Thời gian**: ước lượng làm việc thuần (1 dev full-time ~8h/ngày), giả định team đã nắm stack (NestJS, Next.js, Prisma 7, BullMQ, Redis, Docker).

**Phạm vi (cập nhật):** **Không** triển khai **Organization / đa tenant** (không API `Organization`, không policy đề theo org / `ORG_INTERNAL`). Task **O-1, O-2, O-4** đã **loại** khỏi backlog; khoá user → **U-0** (ADMIN). Chi tiết checklist: `FEATURE-IMPLEMENTATION-TASKLIST.md` (Phần F).

**Cách đọc**

- **Owner gợi ý**: BE, FE, FS, DevOps, ML/AI.
- **Sprint**: **1 / 2 / 3** hoặc **2–3** (ưu tiên sprint 2, polish sang 3).
- **Phụ thuộc**: task tiên quyết.
- **Ước lượng**: giờ (h) hoặc ngày (d).

---

## Ánh xạ RFP → model Prisma (tham chiếu nhanh)

| EPIC / Story (RFP) | Nội dung | Model / enum chính trong DB |
|--------------------|----------|-----------------------------|
| EPIC 1 — Story 1 | ~~Org Admin…~~ **(đã bỏ phạm vi)** — chỉ giữ ý tưởng: khoá user, visibility đề | `User.isActive`, `Problem.visibility` (**không** `Organization` / membership) |
| EPIC 1 — Story 2 | Đăng ký Email/Google, duyệt Instructor, hồ sơ, chứng chỉ | `User`, `OAuthAccount`, `InstructorVerificationStatus`, `Certificate` |
| EPIC 2 — Story 3–4 | Lớp: mã join, mời email, SV join, bài sắp tới | `ClassRoom`, `ClassEnrollment`, `ClassInvite`, `ClassAssignment` |
| EPIC 3 — Story 5–6 | AI sinh test, golden solution, visibility đề | `AiGenerationJob`, `GoldenSolution`, `TestCase`, `Problem.maxTestCases`, `ProblemVisibility` |
| EPIC 4 — Story 7–8 | Contest: mật khẩu, thời gian, policy feedback, giới hạn nộp | `Contest`, `ContestProblem`, `ContestParticipant`, `ContestTestFeedbackPolicy`, `Submission.contestId`, `attemptNumber`, `judgePriority` |
| EPIC 5 — Story 9–10 | Sandbox, queue, priority contest | Worker + Docker; `Submission.judgePriority`, `Submission.context` |
| EPIC 6 — Story 11 | Luyện tập, filter, leaderboard | `Problem` + `Tag` / `ProblemTag`; bảng tổng hợp hoặc query (chưa có `ProblemBestSubmission` trong schema — có thể bổ sung sau) |
| EPIC 7 — Story 12–13 | Báo cáo contest, export, đạo mã | `ReportExport`, aggregate từ `Submission`; `CodeSimilarityFinding` |
| EPIC 8 — Story 14 | Realtime chấm bài | Socket (đã có gateway); có thể bổ sung `Notification` sau |

**Lưu ý schema**: Kết quả từng test lưu tại **`Submission.caseResults` (Json)** + `testsPassed` / `testsTotal` — **không** có bảng `SubmissionTestResult` riêng; task implement cần chuẩn hoá JSON ở worker.

---

## Kế hoạch 3 Sprint (Agile Scrum)

| Thành phần | Gợi ý |
|-------------|--------|
| **Độ dài sprint** | 2 tuần lịch / sprint. |
| **Ceremonies** | Planning, Daily ~15’, Review, Retrospective. |
| **Artefacts** | Product Backlog (dưới đây), Sprint Backlog, Increment. |

**Capacity tham chiếu**: ~4 dev × 10 ngày × ~6h focus ≈ **240h focus / sprint**.

### Definition of Done (chung)

- Merge `main`, **build + lint** pass.
- API có mô tả (OpenAPI/Swagger đã setup tại `/api-docs` khi bật).
- Happy path đã thử hoặc test tối thiểu.
- Không commit secret; cập nhật `apps/*/ .env.example` khi thêm biến.

---

### Sprint 1 — *Nền tảng: judge thật + luyện tập + schema RFP*

| | |
|--|--|
| **Sprint Goal** | Migration **`20260505120000_rfp_full_schema`** (hoặc migrate tương đương) + seed; auth/socket an toàn hơn; **sandbox** tối thiểu (1 ngôn ngữ); cập nhật **`Submission.caseResults`**; **browse + submit** bài `PUBLIC`; queue cơ bản + **priority** theo `Submission.context`. |
| **User story chính** | EPIC 5 (9–10) MVP, EPIC 6 (11) MVP, EPIC 3 (6) visibility tối thiểu trên API. |

**Sprint Backlog (ưu tiên)**

| Sprint | ID | Ghi chú |
|:------:|----|--------|
| **1** | G0-1 … G0-5 | Redis/BullMQ, health, **migrate + seed** theo schema mới, JWT REST + socket, CI. |
| **1** | O-3 | API policy **`ProblemVisibility`**: list đề public đúng `isPublished`/`visibility`; không lộ `PRIVATE`; `CONTEST_ONLY` khỏi practice (**không** logic org / ORG_INTERNAL) |
| **1** | C-1 | Ràng buộc số `TestCase` ≤ `Problem.maxTestCases` (API/worker). |
| **1** | F-0 | Chuẩn hoá **JSON `caseResults`** + ghi `testsPassed`/`testsTotal` từ worker (thay cho bảng riêng). |
| **1** | H-1 … H-4 | Docker judge + so output + cập nhật `Submission` + `caseResults`. |
| **1** | I-1 | Retry/backoff; set **`judgePriority`** cao hơn khi `context = CONTEST` (khi đã có luồng contest tối thiểu). |
| **1** | G-1, G-2 | API filter problem (tag, `Difficulty`, `mode`) + FE list/detail/submit practice. |
| **1** | F-3 | API list `Submission` theo user/problem + đọc chi tiết từ `caseResults`. |

**Increment demo**: Seed user → đăng nhập → mở problem `PUBLIC` → nộp → worker sandbox → xem AC/WA qua API/UI; DB có đủ cột RFP cho bước sau.

---

### Sprint 2 — *Lớp, contest, realtime*

| | |
|--|--|
| **Sprint Goal** | **ClassRoom** (`classCode`, invite); **Contest** (slug, thời gian, `passwordHash`, `ContestParticipant`); SV join & nộp trong cửa sổ; socket JWT/progress; **ADMIN** khoá user (`isActive`) nếu làm U-0. |
| **User story chính** | EPIC 1 (1–2) MVP, EPIC 2 (3–4), EPIC 4 (7–8), EPIC 8 (14). |

**Sprint Backlog (ưu tiên)**

| Sprint | ID | Ghi chú |
|:------:|----|--------|
| **2** | U-0 | API **`User.isActive`** (ADMIN khoá/mở tài khoản; **không** ORG_ADMIN / org) | BE | G0-4 | 6–10h |
| **2** | U-1, U-2 | Đăng ký email/password; **OAuth Google** (`OAuthAccount`); **`InstructorVerificationStatus`**. |
| **2** | A-1 → A-4 | `ClassRoom`, `ClassEnrollment`, `ClassInvite`; join `classCode`; email invite. |
| **2** | A-5, A-6 | FE quản lý lớp + danh sách SV. |
| **2** | E-1, E-2, E-3 | Join lớp FE; **`ClassAssignment`** + tab bài tập. |
| **2** | B-1 → B-4 | `Contest`, `ContestProblem`, `ContestParticipant`; enforce `startAt`/`endAt`; **`maxSubmissionsPerProblem`** + **`attemptNumber`**. |
| **2** | B-5, B-6 | FE tạo contest; trang join + **password** + countdown. |
| **2** | B-8 | Áp dụng **`Contest.testFeedbackPolicy`** (SUMMARY vs VERBOSE) khi trả kết quả cho client. |
| **2** | F-2, J-1, J-2 | Realtime progress; contract event + FE subscribe an toàn. |
| **2** | F-4, F-5 | Submit trong contest; lịch sử + drill-down từ `caseResults`. |
| **2–3** | B-7 | QA timezone. |
| **2–3** | A-7 | E2E lớp + contest. |

**Increment demo**: Lớp có mã join; contest có mật khẩu; SV nộp trong giờ; sau `endAt` bị chặn; feedback test theo policy; (tuỳ chọn) admin khoá user qua U-0.

---

### Sprint 3 — *AI đề, báo cáo, export, plagiarism, hardening*

| | |
|--|--|
| **Sprint Goal** | **`AiGenerationJob`** + **`GoldenSolution`** workflow; duyệt/publish test; **dashboard** + **`ReportExport`** (XLSX/PDF); **`CodeSimilarityFinding`** MVP; leaderboard/giới hạn judge. |
| **User story chính** | EPIC 3 (5), EPIC 7 (12–13), EPIC 6 (11 leaderboard), bổ sung EPIC 5 polish. |

**Sprint Backlog (ưu tiên)**

| Sprint | ID | Ghi chú |
|:------:|----|--------|
| **3** | C-2, C-3, C-4 | Upload đề (storage); pipeline AI → parse test; ghi **`AiGenerationJob`**. |
| **3** | C-5 | Chạy **golden** sinh `expectedOutput`; FE duyệt/sửa `TestCase` trước publish. |
| **3** | C-6 | Rate limit / quota / kích thước file. |
| **3** | U-3 | **`Certificate`** phát hành sau contest/lớp (metadata JSON). |
| **3** | D-1 → D-4 | Aggregate pass rate, rank (penalty tuỳ rule); **`ReportExport`** job + file URL. |
| **3** | D-5 | **`CodeSimilarityFinding`**: job so khớp cặp submission (AST/heuristic). |
| **3** | G-3 | Leaderboard (query hoặc bảng phụ — có thể thêm model sau nếu cần). |
| **3** | H-5 | Giới hạn size code, dọn container. |
| **3** | I-2, I-3 | Metrics queue, scale worker, tài liệu. |
| **3** | J-3 | Load test nhẹ realtime. |
| **2–3** | B-7, A-7 | Hoàn thiện QA/E2E. |

**Increment demo**: Upload đề → AI + golden → GV duyệt test → contest dùng đề; export kết quả; báo cáo % giống mã (MVP).

---

### Tổng quan 3 sprint

| Sprint | Trọng tâm | Một câu goal |
|--------|-----------|----------------|
| **1** | Platform + judge + practice | Schema RFP, chấm thật, `caseResults`, list/submit `PUBLIC`. |
| **2** | Lớp, contest, realtime | `ClassRoom`, `Contest` + participant, policy feedback, socket. |
| **3** | AI, báo cáo, export, plagiarism | `AiGenerationJob`, golden, dashboard, `ReportExport`, similarity. |

### Tra cứu nhanh: ID task → Sprint

| Sprint | Task ID |
|:------:|---------|
| **1** | G0-1 … G0-5, O-3, C-1, F-0, F-3, G-1, G-2, H-1 … H-4, I-1 |
| **2** | U-0, U-1, U-2, A-1 … A-6, E-1 … E-3, B-1 … B-6, B-8, F-2, F-4, F-5, J-1, J-2 |
| **3** | C-2 … C-6, U-3, D-1 … D-5, G-3, H-5, I-2, I-3, J-3 |
| **2–3** | A-7, B-7 |

---

## Giai đoạn 0 — Nền tảng kỹ thuật

| ID | Sprint | Task | Owner | Phụ thuộc | Ước lượng |
|----|:------:|------|-------|-----------|-----------|
| G0-1 | **1** | Chuẩn hoá Redis/BullMQ (`maxRetriesPerRequest: null`, QueueEvents, shutdown) | BE | — | 4–8h |
| G0-2 | **1** | Health API (`/health`: DB, Redis) + tài liệu local | BE | — | 4–6h |
| G0-3 | **1** | Prisma: áp migration **`rfp_full_schema`**, seed (`User`, `Problem` `PUBLIC`, `TestCase`, `Tag` — **không** seed Organization) | BE | — | 8–16h |
| G0-4 | **1** | Auth: `POST /submissions` lấy user từ JWT; Socket handshake JWT (bỏ `userId` query thô) | BE | G0-3 | 8–16h |
| G0-5 | **1** | CI: lint + build `core-api`, `worker`, `web` | DevOps | — | 4–8h |

---

## Epic O — Policy `ProblemVisibility` *(không Organization)*

**Mục tiêu**: List/detail practice đúng `ProblemVisibility` + `isPublished`; không lộ đề private; **không** đa tenant.

| ID | Sprint | Task | Owner | Phụ thuộc | Ước lượng |
|----|:------:|------|-------|-----------|-----------|
| O-3 | **1** | Query list/detail `Problem` theo **`ProblemVisibility`** (PUBLIC / PRIVATE / CONTEST_ONLY, v.v.); filter practice; **không** membership org | BE | G0-3 | 12–16h |

*Đã loại khỏi roadmap:* ~~O-1~~ (CRUD Organization), ~~O-2~~ (→ **U-0** trong Epic U), ~~O-4~~ (FE Org Admin).

---

## Epic U — EPIC 1 Story 2: Đăng ký & hồ sơ

**Mục tiêu**: Email/password + Google; duyệt Instructor; chứng chỉ hiển thị; **ADMIN** khoá/mở user (**không** org).

| ID | Sprint | Task | Owner | Phụ thuộc | Ước lượng |
|----|:------:|------|-------|-----------|-----------|
| U-0 | **2** | API PATCH **`User.isActive`** (chỉ **ADMIN**; khoá/mở đăng nhập) | BE | G0-4 | 6–10h |
| U-1 | **2** | Đăng ký email + hash password; đồng bộ **`InstructorVerificationStatus`** | BE | G0-3 | 12–16h |
| U-2 | **2** | OAuth **`OAuthAccount`** (Google); liên kết / tách tài khoản | BE | U-1 | 16–24h |
| U-3 | **3** | Phát hành **`Certificate`** (sau contest/lớp); API list theo `userId` | BE | B-*, Contest end | 8–12h |
| U-4 | **2** | FE: profile, lịch sử học tập (submission), tab chứng chỉ | FE | U-3, F-3 | 16–20h |

---

## Epic A — EPIC 2 Story 3–4: `ClassRoom` & enrollment

**Mục tiêu**: GV tạo lớp (`classCode` unique), mời email (`ClassInvite`); SV join; quản lý danh sách.

| ID | Sprint | Task | Owner | Phụ thuộc | Ước lượng |
|----|:------:|------|-------|-----------|-----------|
| A-1 | **2** | API CRUD `ClassRoom` (`ownerId`, `academicYear`, `classCode` unique) | BE | G0-4 | 12–16h |
| A-2 | **2** | `ClassEnrollment` + trạng thái `ClassEnrollmentStatus`; join bằng `classCode` | BE | A-1 | 12–16h |
| A-3 | **2** | `ClassInvite` token + `expiresAt` / `usedAt`; gửi email (MVP: log link) | BE | A-1 | 8–12h |
| A-4 | **2** | GV gỡ SV (`REMOVED`) | BE | A-2 | 4–6h |
| A-5 | **2** | FE: tạo lớp, copy mã, danh sách SV | FE | A-2 | 16–24h |
| A-6 | **2** | FE: quản lý SV (xoá/gỡ, tìm kiếm) | FE | A-4 | 12–16h |
| A-7 | **2–3** | E2E: tạo lớp → join → danh sách | FS | A-5, A-6 | 8–12h |

---

## Epic B — EPIC 4 Story 7–8: `Contest` & làm bài

**Mục tiêu**: `Contest` + `ContestProblem` + `ContestParticipant`; mật khẩu; thời gian; **`testFeedbackPolicy`**; **`Submission.contestId`**, **`attemptNumber`**, **`judgePriority`**.

| ID | Sprint | Task | Owner | Phụ thuộc | Ước lượng |
|----|:------:|------|-------|-----------|-----------|
| B-1 | **2** | API CRUD `Contest` (`slug`, `startAt`, `endAt`, `status`, `passwordHash`, `maxSubmissionsPerProblem`) | BE | G0-3 | 16–20h |
| B-2 | **2** | Gán `ContestProblem` (order, `points`, override time/memory) | BE | B-1 | 12–16h |
| B-3 | **2** | `ContestParticipant` + API đăng ký / vào phòng (check password bcrypt) | BE | B-1 | 8–12h |
| B-4 | **2** | Enforcement submit: trong [startAt, endAt]; check participant; **`attemptNumber`** vs max | BE | B-3, submission | 12–16h |
| B-5 | **2** | FE: form/wizard tạo contest | FE | B-2 | 20–28h |
| B-6 | **2** | FE: trang contest theo `slug` + countdown + password | FE | B-3, B-4 | 12–16h |
| B-7 | **2–3** | QA timezone / DST | FS | B-4 | 6–8h |
| B-8 | **2** | Trả kết quả client theo **`Contest.testFeedbackPolicy`** (ẩn chi tiết test khi SUMMARY) | BE | B-4, F-0 | 8–12h |

---

## Epic C — EPIC 3 Story 5–6: AI + golden + visibility

**Mục tiêu**: `AiGenerationJob`, `GoldenSolution`, `TestCase`; **`ProblemVisibility`** (Private / Public / Contest-only, v.v.); **`maxTestCases`**.

| ID | Sprint | Task | Owner | Phụ thuộc | Ước lượng |
|----|:------:|------|-------|-----------|-----------|
| C-1 | **1** | Validate số `TestCase` ≤ **`Problem.maxTestCases`** (100 mặc định) | BE | — | 4–8h |
| C-2 | **3** | Lưu file đề (MinIO/S3) + `inputDocUrl` / metadata | BE | docker | 12–16h |
| C-3 | **3** | Pipeline AI: prompt → JSON test → lưu `AiGenerationJob.structuredOutput` | ML/AI + BE | C-2 | 24–40h |
| C-4 | **3** | API chuyển job `SUCCEEDED` → tạo/cập nhật `TestCase`; publish `Problem` | BE | C-3 | 12–16h |
| C-5 | **3** | Chạy **`GoldenSolution`** với input → điền `expectedOutput`; FE duyệt từng test | BE + FE | C-4 | 24–32h |
| C-6 | **3** | Rate limit, size file, quota AI | BE | C-2 | 8–12h |
| C-7 | **2** | API đặt **`Problem.visibility`** theo enum (PUBLIC / PRIVATE / CONTEST_ONLY, …); **không** rule `organizationId` / org | BE | G0-3 | 6–10h |

---

## Epic D — EPIC 7 Story 12–13: Báo cáo, export, plagiarism

**Mục tiêu**: Rank, pass rate; **`ReportExport`**; **`CodeSimilarityFinding`**.

| ID | Sprint | Task | Owner | Phụ thuộc | Ước lượng |
|----|:------:|------|-------|-----------|-----------|
| D-1 | **3** | Aggregate từ `Submission` + `caseResults` (pass rate theo problem/contest) | BE | F-0 | 12–16h |
| D-2 | **3** | API ranking (điểm + penalty thời gian — rule product) | BE | D-1 | 16–24h |
| D-3 | **3** | Nhóm lỗi phổ biến (theo `Submission.status` / snippet trong `caseResults`) | BE | D-1 | 12–16h |
| D-4 | **3** | FE dashboard + kích hoạt **`ReportExport`** (XLSX/PDF) + poll `status`/`fileUrl` | FE | D-2 | 20–28h |
| D-5 | **3** | Job so khớp: ghi **`CodeSimilarityFinding`** (submissionIdA/B, `similarityPct`, `algorithm`) | BE | B-* | 16–24h |

---

## Epic E — Story 4 (học viên): Bài tập lớp

**Mục tiêu**: **`ClassAssignment`** (problem/contest + `dueAt`); tab bài sắp tới.

| ID | Sprint | Task | Owner | Phụ thuộc | Ước lượng |
|----|:------:|------|-------|-----------|-----------|
| E-1 | **2** | FE+BE: join lớp nhập `classCode` | FS | A-2 | 8–12h |
| E-2 | **2** | API CRUD `ClassAssignment`; enforce ít nhất một `problemId` hoặc `contestId` | BE | A-1 | 12–16h |
| E-3 | **2** | FE: tab bài tập + trạng thái nộp (query `Submission` + `classAssignmentId`) | FE | E-2 | 16–20h |

---

## Epic F — Submission, lịch sử & chi tiết test (`caseResults`)

**Mục tiêu**: **`Submission.context`**, realtime; list/detail; không dùng bảng `SubmissionTestResult`.

| ID | Sprint | Task | Owner | Phụ thuộc | Ước lượng |
|----|:------:|------|-------|-----------|-----------|
| F-0 | **1** | Chuẩn hoá schema JSON **`caseResults`** (version field trong JSON); worker ghi đủ từng test | BE | H-* | 12–16h |
| F-2 | **2** | Emit socket progress/ delta (map từ `caseResults` hoặc event từng test) | BE | F-0 | 12–20h |
| F-3 | **1** | API list `Submission` filter `userId` / `problemId` / `contestId`; đọc chi tiết từ `caseResults` | BE | F-0 | 12–16h |
| F-4 | **2** | FE: submit contest + panel realtime | FE | F-2, B-4 | 24–32h |
| F-5 | **2** | FE: lịch sử + drill-down fail (theo policy contest) | FE | F-3, B-8 | 12–16h |

---

## Epic G — EPIC 6 Story 11: Luyện tập (LeetCode-style)

**Mục tiêu**: Filter `Difficulty`, `Tag`; leaderboard (optional); lịch sử cá nhân.

| ID | Sprint | Task | Owner | Phụ thuộc | Ước lượng |
|----|:------:|------|-------|-----------|-----------|
| G-1 | **1** | API list/filter `Problem` (`PUBLIC`, tag, difficulty); detail ẩn test hidden | BE | O-3 | 12–16h |
| G-2 | **1** | FE: danh sách + trang đề + submit practice (`context=PRACTICE`) | FE | G-1 | 20–28h |
| G-3 | **3** | Leaderboard: query best theo problem (time/memory) hoặc thêm bảng snapshot sau | BE + FE | G-1 | 16–24h |

---

## Epic H — EPIC 5 Story 9–10: Judge sandbox

**Mục tiêu**: Docker cô lập; giới hạn CPU/RAM/time; khớp output; cập nhật `Submission` + `SubmissionStatus`.

| ID | Sprint | Task | Owner | Phụ thuộc | Ước lượng |
|----|:------:|------|-------|-----------|-----------|
| H-1 | **1** | Image judge v1 (vd Python); network off; FS read-only | DevOps + BE | — | 16–24h |
| H-2 | **1** | Worker chạy container với limit; timeout | BE | H-1 | 24–40h |
| H-3 | **1** | So output; điền `caseResults` + điểm | BE | H-2, F-0 | 16–24h |
| H-4 | **1** | Map WA/TLE/MLE/CE/AC → **`SubmissionStatus`** | BE | H-3 | 12–16h |
| H-5 | **3** | Giới hạn size `sourceCode`; dọn container leak | BE + DevOps | H-2 | 8–16h |

---

## Epic I — Queue & scale

**Mục tiêu**: BullMQ retry; **`judgePriority`**; quan sát queue.

| ID | Sprint | Task | Owner | Phụ thuộc | Ước lượng |
|----|:------:|------|-------|-----------|-----------|
| I-1 | **1** | Retry/backoff; dead-letter / requeue | BE | G0-1 | 6–10h |
| I-2 | **3** | Metrics độ dài queue, latency | DevOps + BE | I-1 | 8–16h |
| I-3 | **3** | Nhiều replica worker + tài liệu | DevOps | H-2 | 8–12h |

---

## Epic J — EPIC 8 Story 14: Realtime

**Mục tiêu**: WebSocket JWT; event chuẩn; dashboard GV khi có nộp mới.

| ID | Sprint | Task | Owner | Phụ thuộc | Ước lượng |
|----|:------:|------|-------|-----------|-----------|
| J-1 | **2** | Contract event versioned (progress, finished, fail) | BE | F-2 | 4–8h |
| J-2 | **2** | FE subscribe theo room an toàn (JWT) | FE | J-1, G0-4 | 12–16h |
| J-3 | **3** | Load test nhẹ | FS | J-2 | 4–8h |

---

## Lộ trình gợi ý

1. **MVP chấm + luyện**: G0 → O-3 → F-0 → H → G → I → J (phần practice).  
2. **MVP trường + thi**: U-0 → A → B → E → F (contest) → B-8.  
3. **AI đề**: C sau khi `Problem`/`TestCase` ổn.  
4. **Báo cáo & export**: D sau khi có dữ liệu contest.

---

## Tổng hợp ước lượng (tham chiếu)

| Epic | Khoảng (ngày người) |
|------|---------------------|
| G0 | ~1,5–3,5 |
| O | ~1,5–2 |
| U | ~9–13 |
| A | ~10–15 |
| B | ~12–18 |
| C | ~15–24 |
| D | ~12–18 |
| E | ~5–7 |
| F | ~8–12 |
| G | ~6–10 |
| H | ~12–20 |
| I | ~3–5 |
| J | ~3–4 |

**Tổng gói đầy đủ**: ~**100–150 ngày người** (trùng lặp đã gộp một phần trong sprint); lịch **~4–8 tháng** với 4–5 dev song song (tham chiếu, không cam kết).

---

## Ghi chú cho team lead

- Schema đã có **`Submission.classRoomId`**, **`classAssignmentId`**, **`contestId`** — FE/BE cần set đúng khi nộp để báo cáo & giới hạn attempt.  
- **`CONTEST_ONLY`**: API list practice phải loại đề chỉ hiện trong contest.  
- Cập nhật file này khi thêm model (vd `Notification`, `ProblemBestSubmission`); gắn issue/PR cho từng ID khi làm.

---

*Tài liệu đồng bộ RFP + `apps/core-api/prisma/schema.prisma` (và `schema.md`).*
