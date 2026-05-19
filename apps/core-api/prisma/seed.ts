/**
 * Seed tạm thời — **chỉ Contest** (+ user, problem/testcase cho contest).
 * Không tạo Submission. Không seed lớp học, kho đề, golden, AI job, invite.
 *
 * Chạy: `npm run prisma:seed -w @code-judge/core-api`
 */
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { Difficulty, PrismaClient, ProblemMode, ProblemVisibility } from '@prisma/client';
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
  contestWinter: 'seed-contest-winter',
  contestSpring: 'seed-contest-spring',
  contestPast: 'seed-contest-past',
} as const;

const SEED_PREFIX = 'seed-';

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
  mode?: ProblemMode;
  tagSlugs: string[];
  visibility: ProblemVisibility;
  testCases: SeedTestCase[];
};

const SUPPORTED_LANGUAGES = ['PYTHON', 'JAVASCRIPT', 'CPP', 'JAVA'];

/** Problem dùng trong các contest seed (không kho đề / không bài lớp). */
const SEED_CONTEST_PROBLEMS: SeedProblemDef[] = [
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
  {
    id: 'seed-problem-contest-only',
    slug: 'contest-secret-sum-seed',
    title: 'Tổng bí mật (Contest only)',
    description: 'Chỉ xuất hiện trong contest — visibility CONTEST_ONLY.',
    statementMd: 'Cho **a**, **b** trên hai dòng. In **a + b**.',
    difficulty: 'EASY',
    tagSlugs: ['math'],
    visibility: 'CONTEST_ONLY',
    testCases: [
      { id: 'seed-tc-co-1', input: '2\n3', expectedOutput: '5', isHidden: false },
      { id: 'seed-tc-co-2', input: '100\n200', expectedOutput: '300', isHidden: true },
    ],
  },
];

const LEGACY_SEED_IDS = [
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

/** Xoá mọi artifact seed cũ (gồm submission cũ nếu có — seed không tạo submission mới). */
async function wipeSeedArtifacts(): Promise<void> {
  const seedPrefix = { startsWith: SEED_PREFIX };

  await prisma.codeSimilarityFinding.deleteMany({
    where: { contestId: seedPrefix },
  });
  await prisma.submission.deleteMany({
    where: {
      OR: [
        { id: seedPrefix },
        { userId: seedPrefix },
        { problemId: seedPrefix },
        { contestId: seedPrefix },
        { classRoomId: seedPrefix },
        { classAssignmentId: seedPrefix },
      ],
    },
  });
  await prisma.reportExport.deleteMany({ where: { id: seedPrefix } });
  await prisma.contestParticipant.deleteMany({ where: { id: seedPrefix } });
  await prisma.contestProblem.deleteMany({
    where: { OR: [{ contestId: seedPrefix }, { problemId: seedPrefix }] },
  });
  await prisma.classAssignment.deleteMany({ where: { id: seedPrefix } });
  await prisma.aiGenerationJob.deleteMany({ where: { id: seedPrefix } });
  await prisma.goldenSolution.deleteMany({ where: { id: seedPrefix } });
  await prisma.testCase.deleteMany({
    where: { OR: [{ id: seedPrefix }, { problemId: seedPrefix }] },
  });
  await prisma.problemTag.deleteMany({
    where: { problem: { id: seedPrefix } },
  });
  await prisma.problem.deleteMany({
    where: {
      OR: [
        { id: seedPrefix },
        { creatorId: seedPrefix },
        { id: { in: [...LEGACY_SEED_IDS] } },
      ],
    },
  });
  await prisma.classInvite.deleteMany({ where: { id: seedPrefix } });
  await prisma.classEnrollment.deleteMany({
    where: { OR: [{ id: seedPrefix }, { classRoomId: seedPrefix }] },
  });
  await prisma.classRoom.deleteMany({
    where: { OR: [{ id: seedPrefix }, { ownerId: seedPrefix }] },
  });
  await prisma.contest.deleteMany({
    where: { OR: [{ id: seedPrefix }, { createdById: seedPrefix }] },
  });
  await prisma.oAuthAccount.deleteMany({ where: { id: seedPrefix } });
  await prisma.user.deleteMany({ where: { id: seedPrefix } });
  await prisma.classAssignment.deleteMany({ where: { id: { in: [...LEGACY_SEED_IDS] } } });
}

function problemRows(problems: SeedProblemDef[]) {
  return problems.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    statementMd: p.statementMd,
    difficulty: p.difficulty,
    mode: p.mode ?? 'ALGO',
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

async function seedContestProblems(): Promise<void> {
  const tagBySlug = new Map(
    (await prisma.tag.findMany()).map((t) => [t.slug, t.id] as const),
  );
  await insertProblemsWithTestCases(SEED_CONTEST_PROBLEMS, tagBySlug);
}

async function seedContestsAndRelated(now: Date): Promise<void> {
  const day = 24 * 60 * 60 * 1000;
  const winterStart = new Date(now.getTime() - day);
  const winterEnd = new Date(now.getTime() + 7 * day);
  const springStart = new Date(now.getTime() + 7 * day);
  const springEnd = new Date(now.getTime() + 14 * day);
  const pastStart = new Date(now.getTime() - 30 * day);
  const pastEnd = new Date(now.getTime() - 7 * day);

  await prisma.contest.createMany({
    data: [
      {
        id: SEED_IDS.contestWinter,
        title: 'Winter Challenge 2026 (Seed)',
        description: 'Contest đang diễn ra — dùng để test leaderboard & submit.',
        slug: 'winter-seed-2026',
        passwordHash: null,
        startAt: winterStart,
        endAt: winterEnd,
        status: 'RUNNING',
        testFeedbackPolicy: 'SUMMARY_ONLY',
        maxSubmissionsPerProblem: 50,
        createdById: SEED_IDS.instructor,
      },
      {
        id: SEED_IDS.contestSpring,
        title: 'Spring Open 2026 (Seed)',
        description: 'Contest sắp diễn ra.',
        slug: 'spring-seed-2026',
        passwordHash: null,
        startAt: springStart,
        endAt: springEnd,
        status: 'PUBLISHED',
        testFeedbackPolicy: 'VERBOSE',
        maxSubmissionsPerProblem: 30,
        createdById: SEED_IDS.instructor,
      },
      {
        id: SEED_IDS.contestPast,
        title: 'Past Mock Contest (Seed)',
        description: 'Contest đã kết thúc.',
        slug: 'past-mock-seed-2026',
        passwordHash: null,
        startAt: pastStart,
        endAt: pastEnd,
        status: 'ENDED',
        testFeedbackPolicy: 'SUMMARY_ONLY',
        maxSubmissionsPerProblem: 10,
        createdById: SEED_IDS.instructor,
      },
    ],
  });

  await prisma.contestProblem.createMany({
    data: [
      { contestId: SEED_IDS.contestWinter, problemId: 'seed-problem-algo', orderIndex: 1, points: 100 },
      { contestId: SEED_IDS.contestWinter, problemId: 'seed-problem-med-01', orderIndex: 2, points: 200 },
      { contestId: SEED_IDS.contestWinter, problemId: 'seed-problem-hard-01', orderIndex: 3, points: 300 },
      { contestId: SEED_IDS.contestWinter, problemId: 'seed-problem-contest-only', orderIndex: 4, points: 150 },
      { contestId: SEED_IDS.contestSpring, problemId: 'seed-problem-easy-02', orderIndex: 1, points: 100 },
      { contestId: SEED_IDS.contestSpring, problemId: 'seed-problem-med-02', orderIndex: 2, points: 200 },
      { contestId: SEED_IDS.contestPast, problemId: 'seed-problem-algo', orderIndex: 1, points: 100 },
    ],
  });

  await prisma.contestParticipant.createMany({
    data: [
      { id: 'seed-cpart-winter-student', contestId: SEED_IDS.contestWinter, userId: SEED_IDS.student },
      { id: 'seed-cpart-winter-student2', contestId: SEED_IDS.contestWinter, userId: SEED_IDS.student2 },
      { id: 'seed-cpart-winter-instructor', contestId: SEED_IDS.contestWinter, userId: SEED_IDS.instructor },
      { id: 'seed-cpart-spring-student', contestId: SEED_IDS.contestSpring, userId: SEED_IDS.student },
    ],
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
    { id: 'seed-tag-array', slug: 'array', name: 'Array / Mảng' },
    { id: 'seed-tag-string', slug: 'string', name: 'String / Xâu' },
    { id: 'seed-tag-math', slug: 'math', name: 'Math / Số học' },
    { id: 'seed-tag-dp', slug: 'dp', name: 'Dynamic programming' },
  ] as const;
  for (const t of seedTags) {
    await prisma.tag.upsert({
      where: { slug: t.slug },
      create: { id: t.id, slug: t.slug, name: t.name },
      update: { name: t.name },
    });
  }

  const now = new Date();

  await seedContestProblems();
  await seedContestsAndRelated(now);

  const submissionCount = await prisma.submission.count({
    where: { userId: { startsWith: SEED_PREFIX } },
  });

  console.info('[prisma seed] Mode: contest-only');
  console.info(
    `[prisma seed] Users: 4 · Contest problems: ${SEED_CONTEST_PROBLEMS.length} · Contests: 3 · Participants: 4`,
  );
  console.info(`[prisma seed] Submissions created: 0 (existing seed-user submissions in DB: ${submissionCount})`);
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
