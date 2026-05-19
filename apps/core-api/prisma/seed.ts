/**
 * Seed dev/test: User, ClassRoom, ClassEnrollment, Problem, TestCase, ClassAssignment.
 *
 * - Kho đề: 5 EASY, 3 MEDIUM, 1 HARD (PUBLIC — không gắn lớp / assignment).
 * - Lớp học: ClassAssignment trỏ tới problem riêng (khác id với kho đề).
 *
 * Chạy: `npm run prisma:seed -w @code-judge/core-api`
 */
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { Difficulty, PrismaClient, ProblemVisibility } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required for prisma seed');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL }),
});

const SEED_PASSWORD = '123456';
const passwordHash = bcrypt.hashSync(SEED_PASSWORD, 10);

/** Id cố định để test / Postman */
const SEED_IDS = {
  admin: 'seed-user-admin',
  instructor: 'seed-user-instructor',
  student: 'seed-user-student',
  student2: 'seed-user-student-2',
  classCpp: 'seed-class-cpp-101',
  classWeb: 'seed-class-web-102',
} as const;

type SeedTestCase = {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
};

type SeedProblemDef = {
  id: string;
  slug: string;
  title: string;
  description: string;
  statementMd: string;
  difficulty: Difficulty;
  tagSlugs: string[];
  visibility: ProblemVisibility;
  testCases: SeedTestCase[];
};

type SeedClassAssignmentDef = {
  id: string;
  classRoomId: string;
  title: string;
  description: string;
  problem: SeedProblemDef;
};

const SUPPORTED_LANGUAGES = ['PYTHON', 'JAVASCRIPT', 'CPP', 'JAVA'];

/** Kho đề — không có ClassAssignment */
const SEED_BANK_PROBLEMS: SeedProblemDef[] = [
  {
    id: 'seed-problem-algo',
    slug: 'sum-two-numbers-seed',
    title: 'Tổng hai số',
    description: 'Đọc hai số nguyên, in tổng.',
    statementMd:
      'Cho **a**, **b** (mỗi số một dòng). In **a + b**.\n\nVí dụ: `1` và `2` → `3`.',
    difficulty: 'EASY',
    tagSlugs: ['array', 'math'],
    visibility: 'PUBLIC',
    testCases: [
      { id: 'seed-tc-e01-1', input: '1\n2', expectedOutput: '3', isHidden: false },
      { id: 'seed-tc-e01-2', input: '0\n0', expectedOutput: '0', isHidden: false },
      { id: 'seed-tc-e01-3', input: '-5\n10', expectedOutput: '5', isHidden: false },
      { id: 'seed-tc-e01-4', input: '1000000\n2000000', expectedOutput: '3000000', isHidden: true },
      { id: 'seed-tc-e01-5', input: '-1000000\n-1', expectedOutput: '-1000001', isHidden: true },
    ],
  },
  {
    id: 'seed-problem-easy-02',
    slug: 'max-two-numbers-seed',
    title: 'Số lớn hơn',
    description: 'Đọc hai số nguyên, in số lớn hơn.',
    statementMd: 'Cho hai số trên hai dòng. In số **lớn hơn** (bằng nhau thì in số đó).',
    difficulty: 'EASY',
    tagSlugs: ['math'],
    visibility: 'PUBLIC',
    testCases: [
      { id: 'seed-tc-e02-1', input: '3\n7', expectedOutput: '7', isHidden: false },
      { id: 'seed-tc-e02-2', input: '4\n4', expectedOutput: '4', isHidden: false },
      { id: 'seed-tc-e02-3', input: '-10\n-3', expectedOutput: '-3', isHidden: false },
      { id: 'seed-tc-e02-4', input: '999999\n1', expectedOutput: '999999', isHidden: true },
      { id: 'seed-tc-e02-5', input: '-1000000\n-1000000', expectedOutput: '-1000000', isHidden: true },
    ],
  },
  {
    id: 'seed-problem-easy-03',
    slug: 'even-odd-seed',
    title: 'Chẵn hay lẻ',
    description: 'Đọc số nguyên n, in EVEN hoặc ODD.',
    statementMd: 'Cho **n**. In `EVEN` nếu n chẵn, ngược lại in `ODD`.',
    difficulty: 'EASY',
    tagSlugs: ['math', 'implementation'],
    visibility: 'PUBLIC',
    testCases: [
      { id: 'seed-tc-e03-1', input: '4', expectedOutput: 'EVEN', isHidden: false },
      { id: 'seed-tc-e03-2', input: '7', expectedOutput: 'ODD', isHidden: false },
      { id: 'seed-tc-e03-3', input: '0', expectedOutput: 'EVEN', isHidden: false },
      { id: 'seed-tc-e03-4', input: '-2', expectedOutput: 'EVEN', isHidden: true },
      { id: 'seed-tc-e03-5', input: '1000001', expectedOutput: 'ODD', isHidden: true },
    ],
  },
  {
    id: 'seed-problem-easy-04',
    slug: 'hello-name-seed',
    title: 'Xin chào',
    description: 'Đọc tên, in dòng Hello, {tên}.',
    statementMd: 'Cho một dòng **name** (không rỗng). In đúng: `Hello, {name}`',
    difficulty: 'EASY',
    tagSlugs: ['string', 'implementation'],
    visibility: 'PUBLIC',
    testCases: [
      { id: 'seed-tc-e04-1', input: 'An', expectedOutput: 'Hello, An', isHidden: false },
      { id: 'seed-tc-e04-2', input: 'World', expectedOutput: 'Hello, World', isHidden: false },
      { id: 'seed-tc-e04-3', input: 'Seed_2026', expectedOutput: 'Hello, Seed_2026', isHidden: false },
      { id: 'seed-tc-e04-4', input: 'Nguyen Van A', expectedOutput: 'Hello, Nguyen Van A', isHidden: true },
      { id: 'seed-tc-e04-5', input: 'X', expectedOutput: 'Hello, X', isHidden: true },
    ],
  },
  {
    id: 'seed-problem-easy-05',
    slug: 'square-number-seed',
    title: 'Bình phương',
    description: 'Đọc n, in n².',
    statementMd: 'Cho số nguyên **n**. In **n × n**.',
    difficulty: 'EASY',
    tagSlugs: ['math'],
    visibility: 'PUBLIC',
    testCases: [
      { id: 'seed-tc-e05-1', input: '3', expectedOutput: '9', isHidden: false },
      { id: 'seed-tc-e05-2', input: '0', expectedOutput: '0', isHidden: false },
      { id: 'seed-tc-e05-3', input: '-4', expectedOutput: '16', isHidden: false },
      { id: 'seed-tc-e05-4', input: '1000', expectedOutput: '1000000', isHidden: true },
      { id: 'seed-tc-e05-5', input: '-31623', expectedOutput: '999961129', isHidden: true },
    ],
  },
  {
    id: 'seed-problem-med-01',
    slug: 'array-sum-seed',
    title: 'Tổng dãy số',
    description: 'Đọc n và n số nguyên, in tổng.',
    statementMd:
      'Dòng 1: **n**. Dòng 2: **n** số nguyên cách nhau bởi khoảng trắng. In tổng.',
    difficulty: 'MEDIUM',
    tagSlugs: ['array', 'math'],
    visibility: 'PUBLIC',
    testCases: [
      { id: 'seed-tc-m01-1', input: '3\n1 2 3', expectedOutput: '6', isHidden: false },
      { id: 'seed-tc-m01-2', input: '1\n42', expectedOutput: '42', isHidden: false },
      { id: 'seed-tc-m01-3', input: '5\n-1 2 -3 4 -5', expectedOutput: '-3', isHidden: false },
      { id: 'seed-tc-m01-4', input: '4\n1000000 1000000 1000000 1000000', expectedOutput: '4000000', isHidden: true },
      { id: 'seed-tc-m01-5', input: '10\n1 1 1 1 1 1 1 1 1 1', expectedOutput: '10', isHidden: true },
    ],
  },
  {
    id: 'seed-problem-med-02',
    slug: 'palindrome-string-seed',
    title: 'Palindrome',
    description: 'Đọc chuỗi, in YES nếu đối xứng.',
    statementMd:
      'Cho chuỗi **s** (chỉ chữ thường a-z). In `YES` nếu đọc xuôi ngược giống nhau, ngược lại `NO`.',
    difficulty: 'MEDIUM',
    tagSlugs: ['string'],
    visibility: 'PUBLIC',
    testCases: [
      { id: 'seed-tc-m02-1', input: 'aba', expectedOutput: 'YES', isHidden: false },
      { id: 'seed-tc-m02-2', input: 'abc', expectedOutput: 'NO', isHidden: false },
      { id: 'seed-tc-m02-3', input: 'a', expectedOutput: 'YES', isHidden: false },
      { id: 'seed-tc-m02-4', input: 'abba', expectedOutput: 'YES', isHidden: true },
      { id: 'seed-tc-m02-5', input: 'abcdcba', expectedOutput: 'YES', isHidden: true },
    ],
  },
  {
    id: 'seed-problem-med-03',
    slug: 'prime-check-seed',
    title: 'Số nguyên tố',
    description: 'Đọc n, in YES nếu nguyên tố.',
    statementMd:
      'Cho **n** (n ≥ 1). In `YES` nếu n là số nguyên tố, ngược lại `NO`. (1 không phải nguyên tố.)',
    difficulty: 'MEDIUM',
    tagSlugs: ['math', 'implementation'],
    visibility: 'PUBLIC',
    testCases: [
      { id: 'seed-tc-m03-1', input: '2', expectedOutput: 'YES', isHidden: false },
      { id: 'seed-tc-m03-2', input: '4', expectedOutput: 'NO', isHidden: false },
      { id: 'seed-tc-m03-3', input: '1', expectedOutput: 'NO', isHidden: false },
      { id: 'seed-tc-m03-4', input: '97', expectedOutput: 'YES', isHidden: true },
      { id: 'seed-tc-m03-5', input: '999983', expectedOutput: 'YES', isHidden: true },
    ],
  },
  {
    id: 'seed-problem-hard-01',
    slug: 'max-subarray-sum-seed',
    title: 'Tổng dãy con lớn nhất',
    description: 'Kadane — tổng dãy con liên tiếp lớn nhất.',
    statementMd:
      'Dòng 1: **n**. Dòng 2: **n** số nguyên. In tổng lớn nhất của một dãy con **liên tiếp** (ít nhất một phần tử).',
    difficulty: 'HARD',
    tagSlugs: ['array', 'dp'],
    visibility: 'PUBLIC',
    testCases: [
      { id: 'seed-tc-h01-1', input: '5\n-2 1 -3 4 -1', expectedOutput: '4', isHidden: false },
      { id: 'seed-tc-h01-2', input: '1\n5', expectedOutput: '5', isHidden: false },
      { id: 'seed-tc-h01-3', input: '4\n-1 -2 -3 -4', expectedOutput: '-1', isHidden: false },
      { id: 'seed-tc-h01-4', input: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6', isHidden: true },
      { id: 'seed-tc-h01-5', input: '6\n1000000 -1000000 1000000 -1000000 1000000 -1000000', expectedOutput: '1000000', isHidden: true },
    ],
  },
];

/** Bài tập lớp — problem riêng, chỉ gắn qua ClassAssignment */
const SEED_CLASS_ASSIGNMENTS: SeedClassAssignmentDef[] = [
  {
    id: 'seed-assignment-cpp-01',
    classRoomId: SEED_IDS.classCpp,
    title: 'BT tuần 1: Tổng ba số',
    description: 'Bài nộp lớp CPP — không trùng kho đề.',
    problem: {
      id: 'seed-problem-class-cpp-01',
      slug: 'sum-three-numbers-class-cpp',
      title: 'Tổng ba số (Lớp CPP)',
      description: 'Đọc ba số nguyên, in tổng.',
      statementMd: 'Cho **a**, **b**, **c** (mỗi số một dòng). In **a + b + c**.',
      difficulty: 'EASY',
      tagSlugs: ['math'],
      visibility: 'PRIVATE',
      testCases: [
        { id: 'seed-tc-cpp01-1', input: '1\n2\n3', expectedOutput: '6', isHidden: false },
        { id: 'seed-tc-cpp01-2', input: '0\n0\n0', expectedOutput: '0', isHidden: false },
        { id: 'seed-tc-cpp01-3', input: '-1\n5\n-2', expectedOutput: '2', isHidden: false },
        { id: 'seed-tc-cpp01-4', input: '1000000\n2000000\n3000000', expectedOutput: '6000000', isHidden: true },
        { id: 'seed-tc-cpp01-5', input: '-999999\n1\n999998', expectedOutput: '0', isHidden: true },
      ],
    },
  },
  {
    id: 'seed-assignment-cpp-02',
    classRoomId: SEED_IDS.classCpp,
    title: 'BT tuần 2: Ước chung lớn nhất',
    description: 'GCD hai số — bài lớp CPP.',
    problem: {
      id: 'seed-problem-class-cpp-02',
      slug: 'gcd-two-numbers-class-cpp',
      title: 'GCD (Lớp CPP)',
      description: 'Đọc a, b, in gcd(a,b).',
      statementMd: 'Cho **a**, **b** (a,b ≥ 0). In **gcd(a, b)**.',
      difficulty: 'MEDIUM',
      tagSlugs: ['math', 'implementation'],
      visibility: 'PRIVATE',
      testCases: [
        { id: 'seed-tc-cpp02-1', input: '12\n18', expectedOutput: '6', isHidden: false },
        { id: 'seed-tc-cpp02-2', input: '7\n13', expectedOutput: '1', isHidden: false },
        { id: 'seed-tc-cpp02-3', input: '0\n5', expectedOutput: '5', isHidden: false },
        { id: 'seed-tc-cpp02-4', input: '1071\n462', expectedOutput: '21', isHidden: true },
        { id: 'seed-tc-cpp02-5', input: '270270\n756756', expectedOutput: '270270', isHidden: true },
      ],
    },
  },
  {
    id: 'seed-assignment-cpp-03',
    classRoomId: SEED_IDS.classCpp,
    title: 'BT tuần 3: Đếm số đẹp',
    description: 'Đếm số trong đoạn thỏa điều kiện — bài lớp CPP.',
    problem: {
      id: 'seed-problem-class-cpp-03',
      slug: 'count-beautiful-class-cpp',
      title: 'Đếm số chia hết (Lớp CPP)',
      description: 'Đếm số trong [L,R] chia hết cho k.',
      statementMd:
        'Dòng 1: **L R k** (1 ≤ L ≤ R ≤ 10^6). In số lượng số nguyên trong [L,R] chia hết cho **k**.',
      difficulty: 'MEDIUM',
      tagSlugs: ['math'],
      visibility: 'PRIVATE',
      testCases: [
        { id: 'seed-tc-cpp03-1', input: '1 10 2', expectedOutput: '5', isHidden: false },
        { id: 'seed-tc-cpp03-2', input: '5 5 5', expectedOutput: '1', isHidden: false },
        { id: 'seed-tc-cpp03-3', input: '10 20 7', expectedOutput: '2', isHidden: false },
        { id: 'seed-tc-cpp03-4', input: '1 1000000 3', expectedOutput: '333334', isHidden: true },
        { id: 'seed-tc-cpp03-5', input: '999900 1000000 11', expectedOutput: '10', isHidden: true },
      ],
    },
  },
  {
    id: 'seed-assignment-web-01',
    classRoomId: SEED_IDS.classWeb,
    title: 'BT lab: Nhân đôi',
    description: 'Bài nộp lớp Web — problem riêng.',
    problem: {
      id: 'seed-problem-class-web-01',
      slug: 'double-number-class-web',
      title: 'Nhân đôi (Lớp Web)',
      description: 'Đọc n, in 2*n.',
      statementMd: 'Cho **n**. In **2 × n**.',
      difficulty: 'EASY',
      tagSlugs: ['math'],
      visibility: 'PRIVATE',
      testCases: [
        { id: 'seed-tc-web01-1', input: '5', expectedOutput: '10', isHidden: false },
        { id: 'seed-tc-web01-2', input: '0', expectedOutput: '0', isHidden: false },
        { id: 'seed-tc-web01-3', input: '-3', expectedOutput: '-6', isHidden: false },
        { id: 'seed-tc-web01-4', input: '500000', expectedOutput: '1000000', isHidden: true },
        { id: 'seed-tc-web01-5', input: '-250000', expectedOutput: '-500000', isHidden: true },
      ],
    },
  },
  {
    id: 'seed-assignment-web-02',
    classRoomId: SEED_IDS.classWeb,
    title: 'BT lab: Đảo ngược chuỗi số',
    description: 'Đảo chuỗi chữ số — bài lớp Web.',
    problem: {
      id: 'seed-problem-class-web-02',
      slug: 'reverse-digits-class-web',
      title: 'Đảo chuỗi số (Lớp Web)',
      description: 'Đọc chuỗi số, in đảo ngược (bỏ số 0 đầu nếu có).',
      statementMd:
        'Cho chuỗi **s** chỉ gồm chữ số (có thể có số 0 đầu). In chuỗi đảo ngược, **không** có số 0 thừa ở đầu (trừ khi kết quả là `0`).',
      difficulty: 'MEDIUM',
      tagSlugs: ['string', 'implementation'],
      visibility: 'PRIVATE',
      testCases: [
        { id: 'seed-tc-web02-1', input: '123', expectedOutput: '321', isHidden: false },
        { id: 'seed-tc-web02-2', input: '1000', expectedOutput: '1', isHidden: false },
        { id: 'seed-tc-web02-3', input: '0', expectedOutput: '0', isHidden: false },
        { id: 'seed-tc-web02-4', input: '1200300', expectedOutput: '30021', isHidden: true },
        { id: 'seed-tc-web02-5', input: '9000000000001', expectedOutput: '1000000000009', isHidden: true },
      ],
    },
  },
];

const SEED_CLASS_PROBLEMS = SEED_CLASS_ASSIGNMENTS.map((a) => a.problem);

const ALL_USER_IDS = [
  SEED_IDS.admin,
  SEED_IDS.instructor,
  SEED_IDS.student,
  SEED_IDS.student2,
] as const;

const ALL_CLASS_IDS = [SEED_IDS.classCpp, SEED_IDS.classWeb] as const;

const ALL_BANK_PROBLEM_IDS = SEED_BANK_PROBLEMS.map((p) => p.id);

const ALL_CLASS_PROBLEM_IDS = SEED_CLASS_PROBLEMS.map((p) => p.id);

const ALL_PROBLEM_IDS = [...ALL_BANK_PROBLEM_IDS, ...ALL_CLASS_PROBLEM_IDS];

const ALL_ASSIGNMENT_IDS = SEED_CLASS_ASSIGNMENTS.map((a) => a.id);

const ALL_TEST_CASE_IDS = [
  ...SEED_BANK_PROBLEMS.flatMap((p) => p.testCases.map((tc) => tc.id)),
  ...SEED_CLASS_PROBLEMS.flatMap((p) => p.testCases.map((tc) => tc.id)),
];

const LEGACY_PROBLEM_IDS = [
  'seed-problem-web-sum',
  'seed-assignment-easy-01',
  'seed-assignment-easy-02',
  'seed-assignment-easy-03',
  'seed-assignment-easy-04',
  'seed-assignment-easy-05',
  'seed-assignment-med-01',
  'seed-assignment-med-02',
  'seed-assignment-med-03',
  'seed-assignment-hard-01',
  'seed-assignment-cpp-sum',
  'seed-assignment-web-sum',
] as const;

async function wipeSeedArtifacts(): Promise<void> {
  const legacyProblemIds = [...LEGACY_PROBLEM_IDS];

  await prisma.submission.deleteMany({
    where: {
      OR: [
        { problemId: { in: [...ALL_PROBLEM_IDS, ...legacyProblemIds] } },
        { classAssignmentId: { in: [...ALL_ASSIGNMENT_IDS, ...legacyProblemIds] } },
        { classRoomId: { in: [...ALL_CLASS_IDS] } },
      ],
    },
  });
  await prisma.classAssignment.deleteMany({
    where: {
      OR: [
        { id: { in: [...ALL_ASSIGNMENT_IDS, ...legacyProblemIds] } },
        { problemId: { in: [...ALL_PROBLEM_IDS, ...legacyProblemIds] } },
        { classRoomId: { in: [...ALL_CLASS_IDS] } },
      ],
    },
  });
  await prisma.testCase.deleteMany({
    where: {
      OR: [
        { id: { in: ALL_TEST_CASE_IDS } },
        { problemId: { in: [...ALL_PROBLEM_IDS, ...legacyProblemIds] } },
      ],
    },
  });
  await prisma.problemTag.deleteMany({
    where: { problemId: { in: [...ALL_PROBLEM_IDS, ...legacyProblemIds] } },
  });
  await prisma.problem.deleteMany({
    where: { id: { in: [...ALL_PROBLEM_IDS, ...legacyProblemIds] } },
  });
  await prisma.classEnrollment.deleteMany({
    where: { classRoomId: { in: [...ALL_CLASS_IDS] } },
  });
  await prisma.classRoom.deleteMany({
    where: { id: { in: [...ALL_CLASS_IDS] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [...ALL_USER_IDS] } },
  });
}

function problemRows(problems: SeedProblemDef[]) {
  return problems.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    statementMd: p.statementMd,
    difficulty: p.difficulty,
    mode: 'ALGO' as const,
    timeLimitMs: p.difficulty === 'HARD' ? 2000 : 1000,
    memoryLimitMb: 256,
    isPublished: true,
    visibility: p.visibility,
    supportedLanguages: SUPPORTED_LANGUAGES,
    maxTestCases: 100,
    creatorId: SEED_IDS.instructor,
  }));
}

async function insertProblemsWithTestCases(
  problems: SeedProblemDef[],
  tagBySlug: Map<string, string>,
): Promise<void> {
  if (problems.length === 0) return;

  await prisma.problem.createMany({ data: problemRows(problems) });

  const problemTags: { problemId: string; tagId: string }[] = [];
  for (const p of problems) {
    for (const slug of p.tagSlugs) {
      const tagId = tagBySlug.get(slug);
      if (tagId) {
        problemTags.push({ problemId: p.id, tagId });
      }
    }
  }
  if (problemTags.length > 0) {
    await prisma.problemTag.createMany({ data: problemTags });
  }

  await prisma.testCase.createMany({
    data: problems.flatMap((p) =>
      p.testCases.map((tc, index) => ({
        id: tc.id,
        problemId: p.id,
        orderIndex: index + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden,
        weight: 1,
      })),
    ),
  });
}

async function seedProblems(now: Date, dueAt: Date): Promise<void> {
  const tagBySlug = new Map(
    (await prisma.tag.findMany()).map((t) => [t.slug, t.id] as const),
  );

  await insertProblemsWithTestCases(SEED_BANK_PROBLEMS, tagBySlug);
  await insertProblemsWithTestCases(SEED_CLASS_PROBLEMS, tagBySlug);

  await prisma.classAssignment.createMany({
    data: SEED_CLASS_ASSIGNMENTS.map((a) => ({
      id: a.id,
      classRoomId: a.classRoomId,
      problemId: a.problem.id,
      title: a.title,
      description: a.description,
      dueAt,
      publishedAt: now,
    })),
  });
}

async function seed(): Promise<void> {
  await wipeSeedArtifacts();

  await prisma.user.createMany({
    data: [
      {
        id: SEED_IDS.admin,
        name: 'Seed Admin',
        email: 'admin@example.com',
        passwordHash,
        role: 'ADMIN',
        emailVerified: true,
        isActive: true,
      },
      {
        id: SEED_IDS.instructor,
        name: 'Seed Instructor',
        email: 'instructor@example.com',
        passwordHash,
        role: 'CLIENT',
        emailVerified: true,
        isActive: true,
      },
      {
        id: SEED_IDS.student,
        name: 'Seed Student',
        email: 'student@example.com',
        passwordHash,
        role: 'CLIENT',
        emailVerified: true,
        isActive: true,
      },
      {
        id: SEED_IDS.student2,
        name: 'Seed Student Two',
        email: 'student2@example.com',
        passwordHash,
        role: 'CLIENT',
        emailVerified: true,
        isActive: true,
      },
    ],
  });

  const seedTags = [
    { slug: 'array', name: 'Array / Mảng' },
    { slug: 'string', name: 'String / Xâu' },
    { slug: 'math', name: 'Math / Số học' },
    { slug: 'implementation', name: 'Implementation' },
    { slug: 'graphs', name: 'Graphs / Đồ thị' },
    { slug: 'dp', name: 'Dynamic programming' },
  ] as const;
  for (const t of seedTags) {
    await prisma.tag.upsert({
      where: { slug: t.slug },
      create: { slug: t.slug, name: t.name },
      update: { name: t.name },
    });
  }

  const now = new Date();
  const dueAt = new Date(now);
  dueAt.setDate(dueAt.getDate() + 30);

  await prisma.classRoom.createMany({
    data: [
      {
        id: SEED_IDS.classCpp,
        ownerId: SEED_IDS.instructor,
        name: 'CPP 101 (Seed)',
        description: 'Lớp seed — C++ cơ bản.',
        academicYear: '2026-2027',
        classCode: 'SEEDCPP101',
        isActive: true,
      },
      {
        id: SEED_IDS.classWeb,
        ownerId: SEED_IDS.instructor,
        name: 'Web 102 (Seed)',
        description: 'Lớp seed — Web.',
        academicYear: '2026-2027',
        classCode: 'SEEDWEB102',
        isActive: true,
      },
    ],
  });

  await prisma.classEnrollment.createMany({
    data: [
      {
        classRoomId: SEED_IDS.classCpp,
        userId: SEED_IDS.instructor,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: now,
      },
      {
        classRoomId: SEED_IDS.classCpp,
        userId: SEED_IDS.student,
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: now,
      },
      {
        classRoomId: SEED_IDS.classCpp,
        userId: SEED_IDS.student2,
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: now,
      },
      {
        classRoomId: SEED_IDS.classWeb,
        userId: SEED_IDS.instructor,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: now,
      },
      {
        classRoomId: SEED_IDS.classWeb,
        userId: SEED_IDS.student,
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: now,
      },
    ],
  });

  await seedProblems(now, dueAt);

  const bankCounts = SEED_BANK_PROBLEMS.reduce(
    (acc, p) => {
      acc[p.difficulty] += 1;
      return acc;
    },
    { EASY: 0, MEDIUM: 0, HARD: 0 } as Record<Difficulty, number>,
  );
  console.info(
    `[prisma seed] Bank: ${SEED_BANK_PROBLEMS.length} (EASY=${bankCounts.EASY}, MEDIUM=${bankCounts.MEDIUM}, HARD=${bankCounts.HARD}) — no ClassAssignment`,
  );
  console.info(
    `[prisma seed] Class assignments: ${SEED_CLASS_ASSIGNMENTS.length} → separate problems (${ALL_CLASS_PROBLEM_IDS.join(', ')})`,
  );
}

async function main(): Promise<void> {
  console.info('[prisma seed] Starting…');
  await seed();
  console.info('[prisma seed] Done.');
}

main()
  .catch((error) => {
    console.error('[prisma seed] Failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
