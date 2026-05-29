# Implementation checklist — time/memory limits (Phase 1)

Tài liệu này mô tả các file cần tạo/sửa khi triển khai plan. Hướng dẫn cgroup: [JUDGE0-CGROUP-V1-MIGRATION.md](./JUDGE0-CGROUP-V1-MIGRATION.md).

## Trạng thái

| Hạng mục | Trạng thái |
|----------|------------|
| `docs/JUDGE0-CGROUP-V1-MIGRATION.md` | Done |
| `deploy/README.md` link | Done |
| Worker `effective-limits`, `judge0-client`, `judge0-verdict` | Done |
| Worker `index.ts` contest + MLE/TLE | Done |
| Queue `calibrate-limits` + API | Done |
| `ProblemEditor` UI | Done |

## File mới (worker)

- `apps/worker/src/lib/effective-limits.ts` — resolver + `suggestLimitsFromMeasurements`
- `apps/worker/src/lib/judge0-verdict.ts` — map status id → TLE/MLE/WA
- `apps/worker/src/lib/judge0-client.ts` — `runJudge0Submission`, `getJudge0LanguageId`
- `apps/worker/src/calibrate-limits-job.ts` — chạy golden trên Judge0 từng testcase

## Sửa `apps/worker/src/index.ts`

1. Load `ContestProblem` khi `submission.contestId` set.
2. `resolveEffectiveLimits()` mỗi testcase (Phase 2: thêm case override).
3. Dùng `runJudge0Submission` + `resolveCaseVerdict` (không promote AC khi TLE/MLE).
4. Map `MemoryLimitExceeded` → `SubmissionStatus.MemoryLimitExceeded`.
5. Đăng ký worker queue `calibrate-limits`.

## Queue name (phải trùng core-api ↔ worker)

```ts
export const CALIBRATE_LIMITS_QUEUE_NAME = 'calibrate-limits' as const;
```

## API (core-api)

- `POST /problems/:id/calibrate-limits` → `ProblemLimitsService.calibrate()`
- DTO response: `{ cases, suggestedTimeLimitMs, suggestedMemoryLimitMb, memoryEnforced, goldenLanguage }`
- Auth: `assertUserCanManageProblemAiForProblemId`
- Apply limit: `PATCH /problems/:id` với `timeLimitMs` / `memoryLimitMb` (UI nút Áp dụng)

## Env (worker)

```env
LIMIT_TIME_SAFETY=2
LIMIT_MEM_SAFETY=1.5
LIMIT_LANGUAGE_MULTIPLIERS={"PYTHON":2,"JAVA":2}
JUDGE0_MEMORY_ENFORCED=false
```

## Web

- `problemsApi.calibrateLimits(problemId)`
- `ProblemEditor`: nút "Đo limit (golden)", bảng preview, "Áp dụng", cảnh báo khi `!memoryEnforced`
