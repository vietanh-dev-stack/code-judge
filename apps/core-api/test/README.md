# Core API automated tests

Chạy từ `apps/core-api`:

```bash
npm test
```

Hoặc từ root monorepo:

```bash
npm test
```

**Hiện tại: 16 suites, 58 tests** (tier **A** — unit/service với Prisma/Redis mock).

## Map case ID ↔ file

| File | Case ID |
|------|---------|
| `src/problems/problem-access.service.spec.ts` | SEC-PRB-01, 02, 03; list filter CONTEST_ONLY |
| `src/auth/auth.service.spec.ts` | SEC-AUTH-02, 03 |
| `src/auth/auth-rate-limit.service.spec.ts` | AUTH-F-01 |
| `src/common/utils/password-policy.spec.ts` | AUTH-H-01 (policy) |
| `src/classrooms/classroom.service.spec.ts` | SEC-CLS-01, CLS-E-01, CLS-H-02, CLS-F-01 |
| `src/invites/invites.service.spec.ts` | SEC-CLS-01 (invite), accept invite errors |
| `src/contests/contest-access.service.spec.ts` | Contest IDOR / member access |
| `src/contests/contests.service.spec.ts` | RT-CON-02, 04; CON-F-01 |
| `src/submissions/submissions.service.spec.ts` | JUD-F-01, JUD-E-01, SEC-STO-01, CON-CON-02 |
| `src/submissions/submissions-access.spec.ts` | SEC-SUB-01, 02 |
| `src/users/users.service.spec.ts` | ADM-F-01 (lock + role) |
| `src/storage/storage-access.service.spec.ts` | SEC-STO (presign) |
| `src/ai-hint/ai-hint.service.spec.ts` | SEC-AI-02, AI-HINT-02 |
| `src/ai-hint/ai-hint-filter.util.spec.ts` | SEC-AI-01 (filter) |
| `src/ai-testcase/ai-testcase-io-quality.util.spec.ts` | AI-TC-02 |
| `src/ai-testcase/project-testcase-output.validator.spec.ts` | AI-PROB-01 (schema) |

## CI (đề xuất)

- **PR:** `npm test -w @code-judge/core-api`
- **Nightly (tier S):** Docker Compose + API E2E + Judge0 smoke

## Tiếp theo (tier S)

- `@nestjs/testing` + Supertest + test DB
- Playwright: SEC-AUTH-01 (middleware silent refresh)
- k6: CON-CON-01, QUE-CON-03
