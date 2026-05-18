/**
 * Seed dev/test: User, ClassRoom, ClassEnrollment (khớp `schema.prisma` hiện tại).
 *
 * Chạy: `npm run prisma:seed -w @code-judge/core-api`
 */
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
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

const ALL_USER_IDS = [
  SEED_IDS.admin,
  SEED_IDS.instructor,
  SEED_IDS.student,
  SEED_IDS.student2,
] as const;

const ALL_CLASS_IDS = [SEED_IDS.classCpp, SEED_IDS.classWeb] as const;

async function wipeSeedArtifacts(): Promise<void> {
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
