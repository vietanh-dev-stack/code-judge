/**
 * Rich Seed Data — **Comprehensive Seeding** for Code-Judge.
 *
 * Includes:
 * - Diverse Users (Admin, Instructor, Students).
 * - Multi-category Problems (Math, Array, DP, Graph, String).
 * - Golden Solutions (C++, Python).
 * - Active & Past Contests with real submissions.
 * - Classrooms with Assignments and Enrollments.
 *
 * Run: `npm run prisma:seed -w @code-judge/core-api`
 */
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { Difficulty, PrismaClient, ProblemMode, ProblemVisibility, SubmissionStatus, SubmissionContext, ContestStatus, ClassRole, ClassEnrollmentStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required for prisma seed');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL }),
});

const SEED_PASSWORD = 'password123';
const passwordHash = bcrypt.hashSync(SEED_PASSWORD, 10);
const SEED_PREFIX = 'seed-';

/** Fixed IDs for predictable testing */
const SEED_IDS = {
  admin: 'seed-user-admin',
  instructor: 'seed-user-instructor',
  student1: 'seed-user-student-1',
  student2: 'seed-user-student-2',
  student3: 'seed-user-student-3',
  student4: 'seed-user-student-4',
  classIntro: 'seed-class-intro-prog',
  classAlgo: 'seed-class-data-algo',
  contestWar: 'seed-contest-code-war',
  contestPast: 'seed-contest-past-mock',
  contestFuture: 'seed-contest-future-cup',
} as const;

const SUPPORTED_LANGUAGES = ['PYTHON', 'JAVASCRIPT', 'CPP', 'JAVA'];

// --- Problem Definitions ---

type SeedTestCase = {
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
  goldenSolutions?: { language: string; source: string }[];
};

const SEED_PROBLEMS: SeedProblemDef[] = [
  {
    id: 'seed-prob-helloworld',
    slug: 'hello-world',
    title: 'Hello Code-Judge',
    description: 'A classic introductory problem.',
    statementMd: 'Write a program that prints exactly `Hello, Code-Judge!` to the standard output.',
    difficulty: 'EASY',
    tagSlugs: ['basic'],
    visibility: 'PUBLIC',
    testCases: [
      { input: '', expectedOutput: 'Hello, Code-Judge!', isHidden: false },
    ],
    goldenSolutions: [
      { language: 'PYTHON', source: 'print("Hello, Code-Judge!")' },
      { language: 'CPP', source: '#include <iostream>\nint main() { std::cout << "Hello, Code-Judge!" << std::endl; return 0; }' },
      { language: 'JAVASCRIPT', source: 'console.log("Hello, Code-Judge!");' },
    ],
  },
  {
    id: 'seed-prob-sum2',
    slug: 'sum-two-numbers',
    title: 'Sum of Two Numbers',
    description: 'Read two integers and output their sum.',
    statementMd: 'You are given two integers $A$ and $B$. Print $A + B$.\n\n### Input\nTwo integers on separate lines.\n\n### Output\nA single integer.',
    difficulty: 'EASY',
    tagSlugs: ['math'],
    visibility: 'PUBLIC',
    testCases: [
      { input: '5\n7', expectedOutput: '12', isHidden: false },
      { input: '-10\n10', expectedOutput: '0', isHidden: false },
      { input: '1000000\n2000000', expectedOutput: '3000000', isHidden: true },
    ],
    goldenSolutions: [
      { language: 'PYTHON', source: 'import sys\nlines = sys.stdin.readlines()\nprint(int(lines[0]) + int(lines[1]))' },
    ],
  },
  {
    id: 'seed-prob-fib',
    slug: 'fibonacci-n',
    title: 'N-th Fibonacci Number',
    description: 'Calculate the n-th Fibonacci number using dynamic programming.',
    statementMd: 'The Fibonacci sequence is defined as $F_0 = 0, F_1 = 1, F_n = F_{n-1} + F_{n-2}$.\nGiven $n$, find $F_n$ modulo $10^9 + 7$.\n\n$0 \\le n \\le 10^6$',
    difficulty: 'MEDIUM',
    visibility: 'PUBLIC',
    tagSlugs: ['math', 'dp'],
    testCases: [
      { input: '0', expectedOutput: '0', isHidden: false },
      { input: '1', expectedOutput: '1', isHidden: false },
      { input: '10', expectedOutput: '55', isHidden: false },
      { input: '100', expectedOutput: '687995182', isHidden: true },
    ],
  },
  {
    id: 'seed-prob-lca',
    slug: 'lowest-common-ancestor',
    title: 'Lowest Common Ancestor',
    description: 'Find the LCA of two nodes in a rooted tree.',
    statementMd: 'Given a tree with $N$ nodes rooted at 1, find the LCA of nodes $u$ and $v$.\n\n### Input\n- $N$\n- $N-1$ edges\n- $Q$ queries of $(u, v)$',
    difficulty: 'HARD',
    tagSlugs: ['graph', 'tree'],
    visibility: 'PUBLIC',
    testCases: [
      { input: '5\n1 2\n1 3\n2 4\n2 5\n1\n4 5', expectedOutput: '2', isHidden: false },
      { input: '5\n1 2\n1 3\n2 4\n2 5\n1\n4 3', expectedOutput: '1', isHidden: true },
    ],
  },
  {
    id: 'seed-prob-palindrome',
    slug: 'longest-palindrome-substring',
    title: 'Longest Palindromic Substring',
    description: 'Classic string problem using Manacher or DP.',
    statementMd: 'Find the length of the longest palindromic substring in a given string $S$.',
    difficulty: 'MEDIUM',
    tagSlugs: ['string', 'dp'],
    visibility: 'PUBLIC',
    testCases: [
      { input: 'babad', expectedOutput: '3', isHidden: false },
      { input: 'cbbd', expectedOutput: '2', isHidden: false },
      { input: 'a', expectedOutput: '1', isHidden: true },
    ],
  },
];

// --- Seeding Logic ---

async function wipeSeedArtifacts(): Promise<void> {
  const seedPrefix = { startsWith: SEED_PREFIX };
  const whereClause = {
    OR: [
      { id: seedPrefix },
      { userId: seedPrefix },
      { problemId: seedPrefix },
      { contestId: seedPrefix },
      { classRoomId: seedPrefix },
      { classAssignmentId: seedPrefix },
      { creatorId: seedPrefix },
      { createdById: seedPrefix },
      { ownerId: seedPrefix },
      { email: { startsWith: 'seed-' } },
      { slug: { startsWith: 'seed-' } },
    ],
  };

  console.info('Cleaning up existing seed data...');
  await prisma.codeSimilarityFinding.deleteMany({ where: { OR: [{ contestId: seedPrefix }, { id: seedPrefix }] } });
  await prisma.submission.deleteMany({ where: { OR: [{ id: seedPrefix }, { userId: seedPrefix }, { problemId: seedPrefix }, { contestId: seedPrefix }] } });
  await prisma.reportExport.deleteMany({ where: { id: seedPrefix } });
  await prisma.contestParticipant.deleteMany({ where: { id: seedPrefix } });
  await prisma.contestProblem.deleteMany({ where: { OR: [{ contestId: seedPrefix }, { problemId: seedPrefix }] } });
  await prisma.classAssignment.deleteMany({ where: { id: seedPrefix } });
  await prisma.aiGenerationJob.deleteMany({ where: { id: seedPrefix } });
  await prisma.goldenSolution.deleteMany({ where: { id: seedPrefix } });
  await prisma.testCase.deleteMany({ where: { id: seedPrefix } });
  await prisma.problemTag.deleteMany({ where: { problem: { id: seedPrefix } } });
  await prisma.problem.deleteMany({ where: { id: seedPrefix } });
  await prisma.classInvite.deleteMany({ where: { id: seedPrefix } });
  await prisma.classEnrollment.deleteMany({ where: { OR: [{ id: seedPrefix }, { classRoomId: seedPrefix }] } });
  await prisma.classRoom.deleteMany({ where: { id: seedPrefix } });
  await prisma.contest.deleteMany({ where: { id: seedPrefix } });
  await prisma.oAuthAccount.deleteMany({ where: { id: seedPrefix } });
  await prisma.user.deleteMany({ where: { OR: [{ id: seedPrefix }, { email: { startsWith: 'seed-' } }] } });
}

async function seedUsers() {
  const users = [
    { id: SEED_IDS.admin, name: 'System Admin', email: 'seed-admin@codejudge.io', role: 'ADMIN', emailVerified: true, isActive: true, passwordHash },
    { id: SEED_IDS.instructor, name: 'Dr. Algorithm', email: 'seed-instructor@codejudge.io', role: 'CLIENT', emailVerified: true, isActive: true, passwordHash },
    { id: SEED_IDS.student1, name: 'Alice Smith', email: 'seed-student1@codejudge.io', role: 'CLIENT', emailVerified: true, isActive: true, passwordHash },
    { id: SEED_IDS.student2, name: 'Bob Johnson', email: 'seed-student2@codejudge.io', role: 'CLIENT', emailVerified: true, isActive: true, passwordHash },
    { id: SEED_IDS.student3, name: 'Charlie Brown', email: 'seed-student3@codejudge.io', role: 'CLIENT', emailVerified: true, isActive: true, passwordHash },
    { id: SEED_IDS.student4, name: 'Diana Prince', email: 'seed-student4@codejudge.io', role: 'CLIENT', emailVerified: true, isActive: true, passwordHash },
  ];

  for (let i = 5; i <= 20; i++) {
    users.push({
      id: `${SEED_PREFIX}user-${i}`,
      name: `Student ${i}`,
      email: `seed-student${i}@codejudge.io`,
      role: 'CLIENT',
      emailVerified: true,
      isActive: true,
      passwordHash,
    });
  }

  await prisma.user.createMany({ data: users });
  console.info(`Seeded ${users.length} users.`);
}

async function seedTags() {
  const tags = [
    { id: 'a1111111-1111-4111-8111-111111111101', slug: 'basic', name: 'Basic' },
    { id: 'a1111111-1111-4111-8111-111111111102', slug: 'math', name: 'Mathematics' },
    { id: 'a1111111-1111-4111-8111-111111111103', slug: 'dp', name: 'Dynamic Programming' },
    { id: 'a1111111-1111-4111-8111-111111111104', slug: 'graph', name: 'Graph Theory' },
    { id: 'a1111111-1111-4111-8111-111111111105', slug: 'tree', name: 'Trees' },
    { id: 'a1111111-1111-4111-8111-111111111106', slug: 'string', name: 'String' },
  ];

  for (const t of tags) {
    await prisma.tag.upsert({
      where: { slug: t.slug },
      create: t,
      update: { name: t.name },
    });
  }
}

async function seedProblems() {
  const tagBySlug = new Map((await prisma.tag.findMany()).map((t) => [t.slug, t.id]));

  for (const p of SEED_PROBLEMS) {
    await prisma.problem.create({
      data: {
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        statementMd: p.statementMd,
        difficulty: p.difficulty,
        mode: 'ALGO',
        timeLimitMs: p.difficulty === 'HARD' ? 2000 : 1000,
        memoryLimitMb: 256,
        isPublished: true,
        visibility: p.visibility,
        supportedLanguages: SUPPORTED_LANGUAGES,
        maxTestCases: 100,
        creatorId: SEED_IDS.instructor,
        tags: {
          create: p.tagSlugs.map((slug) => ({
            tagId: tagBySlug.get(slug)!,
          })),
        },
        testCases: {
          create: p.testCases.map((tc, idx) => ({
            id: `${p.id}-tc-${idx}`,
            orderIndex: idx + 1,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden,
            weight: 1,
          })),
        },
        goldenSolutions: p.goldenSolutions ? {
          create: p.goldenSolutions.map((gs, idx) => ({
            id: `${p.id}-gs-${idx}`,
            language: gs.language,
            sourceCode: gs.source,
            isPrimary: idx === 0,
            createdById: SEED_IDS.instructor,
          })),
        } : undefined,
      },
    });
  }
  console.info(`Seeded ${SEED_PROBLEMS.length} problems with test cases and golden solutions.`);
}

async function seedClassrooms() {
  const now = new Date();

  await prisma.classRoom.create({
    data: {
      id: SEED_IDS.classIntro,
      name: 'Introduction to Programming (Python)',
      description: 'Learn the basics of programming using Python. Topics include variables, loops, and functions.',
      academicYear: '2025-2026',
      classCode: 'INTRO-PY-01',
      isActive: true,
      ownerId: SEED_IDS.instructor,
      enrollments: {
        create: [
          { userId: SEED_IDS.instructor, role: 'OWNER', status: 'ACTIVE', joinedAt: now },
          { userId: SEED_IDS.student1, role: 'MEMBER', status: 'ACTIVE', joinedAt: now },
          { userId: SEED_IDS.student2, role: 'MEMBER', status: 'ACTIVE', joinedAt: now },
        ],
      },
      assignments: {
        create: [
          {
            id: 'seed-assign-hello',
            title: 'First Assignment: Hello World',
            description: 'Submit your first program!',
            publishedAt: now,
            dueAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            problemId: 'seed-prob-helloworld',
          },
        ],
      },
    },
  });

  await prisma.classRoom.create({
    data: {
      id: SEED_IDS.classAlgo,
      name: 'Advanced Data Structures & Algorithms',
      description: 'Deep dive into complex algorithms and data structures.',
      academicYear: '2025-2026',
      classCode: 'ALGO-ADV-02',
      isActive: true,
      ownerId: SEED_IDS.instructor,
      enrollments: {
        create: [
          { userId: SEED_IDS.instructor, role: 'OWNER', status: 'ACTIVE', joinedAt: now },
          { userId: SEED_IDS.student3, role: 'MEMBER', status: 'ACTIVE', joinedAt: now },
          { userId: SEED_IDS.student4, role: 'MEMBER', status: 'ACTIVE', joinedAt: now },
        ],
      },
      assignments: {
        create: [
          {
            id: 'seed-assign-dp',
            title: 'DP Challenge',
            description: 'Solve the Fibonacci problem using DP.',
            publishedAt: now,
            dueAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
            problemId: 'seed-prob-fib',
          },
        ],
      },
    },
  });

  console.info('Seeded classrooms and assignments.');
}

async function seedContests() {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  // 1. Running Contest
  await prisma.contest.create({
    data: {
      id: SEED_IDS.contestWar,
      title: 'Code War 2026: The Beginning',
      slug: 'code-war-2026',
      description: 'The first big contest of the year. Show your skills!',
      startAt: new Date(now.getTime() - day),
      endAt: new Date(now.getTime() + 2 * day),
      status: 'RUNNING',
      testFeedbackPolicy: 'VERBOSE',
      createdById: SEED_IDS.instructor,
      problems: {
        create: [
          { problemId: 'seed-prob-helloworld', orderIndex: 1, points: 100 },
          { problemId: 'seed-prob-sum2', orderIndex: 2, points: 100 },
          { problemId: 'seed-prob-palindrome', orderIndex: 3, points: 200 },
        ],
      },
      participants: {
        create: [
          { userId: SEED_IDS.student1 },
          { userId: SEED_IDS.student2 },
          { userId: SEED_IDS.student3 },
        ],
      },
    },
  });

  // 2. Ended Contest
  await prisma.contest.create({
    data: {
      id: SEED_IDS.contestPast,
      title: 'New Year Practice Mock',
      slug: 'new-year-mock',
      description: 'A mock contest held during New Year.',
      startAt: new Date(now.getTime() - 10 * day),
      endAt: new Date(now.getTime() - 9 * day),
      status: 'ENDED',
      testFeedbackPolicy: 'SUMMARY_ONLY',
      createdById: SEED_IDS.admin,
      problems: {
        create: [
          { problemId: 'seed-prob-fib', orderIndex: 1, points: 200 },
          { problemId: 'seed-prob-lca', orderIndex: 2, points: 500 },
        ],
      },
      participants: {
        create: [
          { userId: SEED_IDS.student1 },
          { userId: SEED_IDS.student4 },
        ],
      },
    },
  });

  console.info('Seeded contests.');
}

async function seedSubmissions() {
  const now = new Date();
  const past = new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000);

  // Submissions for Ended Contest
  const submissions = [
    // Student 1 solved Fib in Past Contest
    {
      id: 'seed-sub-1',
      userId: SEED_IDS.student1,
      problemId: 'seed-prob-fib',
      mode: 'ALGO' as const,
      context: 'CONTEST' as const,
      contestId: SEED_IDS.contestPast,
      language: 'PYTHON',
      status: 'Accepted' as const,
      score: 200,
      testsPassed: 4,
      testsTotal: 4,
      runtimeMs: 45,
      memoryMb: 12,
      createdAt: past,
      sourceCode: 'def fib(n):\n    if n <= 1: return n\n    a, b = 0, 1\n    for _ in range(n-1):\n        a, b = b, (a + b) % 1000000007\n    return b\nimport sys\nn = int(sys.stdin.read().strip())\nprint(fib(n))',
    },
    // Student 4 failed Fib in Past Contest
    {
      id: 'seed-sub-2',
      userId: SEED_IDS.student4,
      problemId: 'seed-prob-fib',
      mode: 'ALGO' as const,
      context: 'CONTEST' as const,
      contestId: SEED_IDS.contestPast,
      language: 'PYTHON',
      status: 'Wrong' as const,
      score: 50,
      testsPassed: 1,
      testsTotal: 4,
      runtimeMs: 30,
      memoryMb: 10,
      createdAt: past,
      sourceCode: 'print(0)',
    },
    // Student 1 failed LCA (TLE)
    {
      id: 'seed-sub-3',
      userId: SEED_IDS.student1,
      problemId: 'seed-prob-lca',
      mode: 'ALGO' as const,
      context: 'CONTEST' as const,
      contestId: SEED_IDS.contestPast,
      language: 'CPP',
      status: 'TimeLimitExceeded' as const,
      score: 0,
      testsPassed: 0,
      testsTotal: 2,
      runtimeMs: 2001,
      memoryMb: 64,
      createdAt: past,
      sourceCode: '#include <iostream>\nint main() { while(true); }',
    },
    // Running Contest Submissions
    {
      id: 'seed-sub-4',
      userId: SEED_IDS.student1,
      problemId: 'seed-prob-helloworld',
      mode: 'ALGO' as const,
      context: 'CONTEST' as const,
      contestId: SEED_IDS.contestWar,
      language: 'PYTHON',
      status: 'Accepted' as const,
      score: 100,
      testsPassed: 1,
      testsTotal: 1,
      runtimeMs: 10,
      memoryMb: 5,
      createdAt: now,
      sourceCode: 'print("Hello, Code-Judge!")',
    },
    {
      id: 'seed-sub-5',
      userId: SEED_IDS.student2,
      problemId: 'seed-prob-helloworld',
      mode: 'ALGO' as const,
      context: 'CONTEST' as const,
      contestId: SEED_IDS.contestWar,
      language: 'CPP',
      status: 'Accepted' as const,
      score: 100,
      testsPassed: 1,
      testsTotal: 1,
      runtimeMs: 1,
      memoryMb: 1,
      createdAt: now,
      sourceCode: '#include <iostream>\nint main() { std::cout << "Hello, Code-Judge!" << std::endl; return 0; }',
    },
  ];

  await prisma.submission.createMany({ data: submissions });
  console.info(`Seeded ${submissions.length} submissions.`);
}

async function main() {
  console.info('Starting seed...');
  await wipeSeedArtifacts();
  await seedUsers();
  await seedTags();
  await seedProblems();
  await seedClassrooms();
  await seedContests();
  await seedSubmissions();
  console.info('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
