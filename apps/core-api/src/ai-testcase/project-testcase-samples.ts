import type { GenerateAiProjectTestcaseDto } from './dto/generate-ai-project-testcase.dto';

export const PROJECT_TESTCASE_SAMPLE_KEYS = ['backend', 'frontend', 'fullstack'] as const;

export type ProjectTestcaseSampleKey = (typeof PROJECT_TESTCASE_SAMPLE_KEYS)[number];

export type ProjectTestcaseSampleDefinition = {
  key: ProjectTestcaseSampleKey;
  label: string;
  description: string;
  dto: GenerateAiProjectTestcaseDto;
};

const BACKEND_SAMPLE: GenerateAiProjectTestcaseDto = {
  title: '[Sample] REST API Quản lý thư viện (NestJS)',
  stack: 'backend',
  framework: 'nest',
  difficulty: 'Medium',
  maxTestCases: 8,
  statement: `Xây dựng REST API bằng NestJS + TypeScript cho hệ thống thư viện.

Yêu cầu chức năng:
1. Auth: POST /auth/login nhận email/password, trả JWT access token (JSON: accessToken, expiresIn).
2. Books: CRUD /books — list có pagination (?page, ?limit), create cần title (required), author (optional), status enum draft|published.
3. Authors: GET /authors trả danh sách id, name.
4. Validation: body không hợp lệ trả 400 với message array.
5. Protected routes: POST/PATCH/DELETE /books yêu cầu header Authorization Bearer token.

Ràng buộc kỹ thuật:
- Entry: export app từ src/main.ts hoặc AppModule cho supertest.
- Không gọi API bên ngoài thật trong test.
- Dùng in-memory hoặc sqlite test DB nếu cần.`,
  acceptanceCriteria: [
    'Đăng nhập đúng credential trả 200 + accessToken',
    'Đăng nhập sai trả 401',
    'GET /books không token trả 200 (public list) hoặc theo spec protected',
    'POST /books không token trả 401',
    'POST /books thiếu title trả 400',
    'Pagination page/limit hoạt động',
  ],
  goldenSummary: `Golden NestJS app:
- src/main.ts bootstrap, export app for tests
- POST /auth/login, GET/POST/PATCH/DELETE /books, GET /authors
- JwtAuthGuard on mutating book routes
- ValidationPipe global`,
  rubric: 'API contract đúng, status code chuẩn, validation rõ ràng.',
  installCommand: 'npm ci',
  testCommand: 'npm test -- --json --outputFile=result.json',
  resultParser: 'jest-json',
  dockerImage: 'node:18-alpine',
};

const FRONTEND_SAMPLE: GenerateAiProjectTestcaseDto = {
  title: '[Sample] Todo App React (Vite)',
  stack: 'frontend',
  framework: 'react',
  difficulty: 'Easy',
  maxTestCases: 6,
  statement: `Xây dựng ứng dụng Todo single-page bằng React + Vite.

Yêu cầu UI:
1. Ô input + nút "Add" thêm todo (data-testid="todo-input", "todo-add-btn").
2. Danh sách todo hiển thị text (data-testid="todo-item").
3. Click todo toggle trạng thái done (class hoặc data-done).
4. Nút xóa từng todo (data-testid="todo-delete").
5. Filter: All / Active / Done (data-testid="filter-active", "filter-done").
6. Đếm số todo còn active (data-testid="todo-count").

Ứng dụng chạy dev server port 5173 hoặc 3000; e2e dùng Playwright với BASE_URL.`,
  acceptanceCriteria: [
    'Thêm todo mới xuất hiện trong list',
    'Toggle done thay đổi trạng thái hiển thị',
    'Xóa todo biến mất khỏi DOM',
    'Filter Active chỉ hiện chưa done',
    'Filter Done chỉ hiện đã done',
  ],
  goldenSummary: `Golden React app:
- src/App.tsx với state todos[]
- data-testid theo spec trên
- npm run dev port 5173, npm run test:e2e với Playwright`,
  starterTemplateSummary: 'Starter có App.tsx rỗng + router shell, chưa có logic todo.',
  installCommand: 'npm ci',
  testCommand: 'npm run test:e2e -- --reporter=json',
  resultParser: 'playwright-json',
  dockerImage: 'node:18-alpine',
};

const FULLSTACK_SAMPLE: GenerateAiProjectTestcaseDto = {
  title: '[Sample] Shop Mini — Express API + React Checkout',
  stack: 'fullstack',
  framework: 'express+react',
  difficulty: 'Hard',
  maxTestCases: 10,
  statement: `Dự án fullstack mini e-commerce.

Backend (Express, port 4000):
- GET /api/products → [{ id, name, price, stock }]
- POST /api/orders body { items: [{ productId, qty }] } → { orderId, total }
- POST /api/orders validate stock; hết stock trả 409

Frontend (React, port 3000):
- Trang /products list sản phẩm (data-testid="product-card")
- Nút "Add to cart" (data-testid="add-to-cart")
- Trang /checkout hiển thị tổng và nút Place order (data-testid="place-order")
- Sau order thành công hiện message (data-testid="order-success")

Hidden tests gồm: API tests (Jest+supertest) và e2e Playwright (mock hoặc spin API).`,
  acceptanceCriteria: [
    'API list products 200',
    'API order hợp lệ trả 201 + orderId',
    'API order vượt stock trả 409',
    'E2E add to cart tăng số item cart',
    'E2E place order hiện order-success',
  ],
  goldenSummary: `Monorepo hoặc 2 folder:
- server/: Express routes /api/products, /api/orders
- client/: React routes /products, /checkout
- Golden pass cả unit API và e2e với API chạy localhost:4000`,
  rubric: 'API + UI flow checkout end-to-end.',
  installCommand: 'npm ci',
  testCommand: 'npm test -- --json --outputFile=result.json',
  resultParser: 'jest-json',
  dockerImage: 'node:18-alpine',
};

export const PROJECT_TESTCASE_SAMPLES: Record<ProjectTestcaseSampleKey, ProjectTestcaseSampleDefinition> = {
  backend: {
    key: 'backend',
    label: 'Backend — NestJS Library API',
    description: 'REST API auth + CRUD books, Jest + supertest, jest-json parser.',
    dto: BACKEND_SAMPLE,
  },
  frontend: {
    key: 'frontend',
    label: 'Frontend — React Todo (Playwright)',
    description: 'SPA Todo với data-testid, Playwright e2e, playwright-json parser.',
    dto: FRONTEND_SAMPLE,
  },
  fullstack: {
    key: 'fullstack',
    label: 'Fullstack — Express Shop + React Checkout',
    description: 'API orders/products + e2e checkout; manifest có thể gồm cả Jest API specs.',
    dto: FULLSTACK_SAMPLE,
  },
};

export function isProjectTestcaseSampleKey(value: string): value is ProjectTestcaseSampleKey {
  return (PROJECT_TESTCASE_SAMPLE_KEYS as readonly string[]).includes(value);
}

export function getProjectTestcaseSample(key: ProjectTestcaseSampleKey): ProjectTestcaseSampleDefinition {
  return PROJECT_TESTCASE_SAMPLES[key];
}
