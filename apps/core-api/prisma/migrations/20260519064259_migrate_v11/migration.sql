-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CLIENT');

-- CreateEnum
CREATE TYPE "ClassRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "ProblemMode" AS ENUM ('ALGO', 'PROJECT');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ProblemVisibility" AS ENUM ('PRIVATE', 'PUBLIC', 'CONTEST_ONLY');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('Pending', 'Running', 'Accepted', 'Wrong', 'RuntimeError', 'Error', 'CompilationError', 'TimeLimitExceeded', 'MemoryLimitExceeded');

-- CreateEnum
CREATE TYPE "SubmissionContext" AS ENUM ('PRACTICE', 'CONTEST', 'CLASS_ASSIGNMENT');

-- CreateEnum
CREATE TYPE "ClassEnrollmentStatus" AS ENUM ('ACTIVE', 'REMOVED', 'LEFT', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RUNNING', 'ENDED');

-- CreateEnum
CREATE TYPE "ContestTestFeedbackPolicy" AS ENUM ('SUMMARY_ONLY', 'VERBOSE');

-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('XLSX', 'PDF');

-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('PENDING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "imageObjectKey" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassRoom" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "academicYear" TEXT,
    "classCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassEnrollment" (
    "id" TEXT NOT NULL,
    "classRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ClassRole" NOT NULL,
    "status" "ClassEnrollmentStatus" NOT NULL,
    "joinedAt" TIMESTAMP(3),

    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassInvite" (
    "id" TEXT NOT NULL,
    "classRoomId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassAssignment" (
    "id" TEXT NOT NULL,
    "classRoomId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "problemId" TEXT,
    "contestId" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "statementMd" TEXT,
    "difficulty" "Difficulty" NOT NULL,
    "mode" "ProblemMode" NOT NULL,
    "timeLimitMs" INTEGER NOT NULL,
    "memoryLimitMb" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL,
    "visibility" "ProblemVisibility" NOT NULL,
    "supportedLanguages" JSONB,
    "maxTestCases" INTEGER NOT NULL,
    "creatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemTag" (
    "problemId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ProblemTag_pkey" PRIMARY KEY ("problemId","tagId")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "input" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL,
    "weight" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoldenSolution" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "sourceCodeObjectKey" TEXT,
    "isPrimary" BOOLEAN NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoldenSolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGenerationJob" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "AiJobStatus" NOT NULL,
    "inputDocObjectKey" TEXT,
    "inputDocUrl" TEXT,
    "inputDocFileName" TEXT,
    "inputDocContentType" TEXT,
    "inputDocSizeBytes" INTEGER,
    "promptVersion" TEXT,
    "structuredOutput" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "passwordHash" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "ContestStatus" NOT NULL,
    "testFeedbackPolicy" "ContestTestFeedbackPolicy" NOT NULL,
    "maxSubmissionsPerProblem" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestProblem" (
    "contestId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "timeLimitMsOverride" INTEGER,
    "memoryLimitMbOverride" INTEGER,

    CONSTRAINT "ContestProblem_pkey" PRIMARY KEY ("contestId","problemId")
);

-- CreateTable
CREATE TABLE "ContestParticipant" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "mode" "ProblemMode" NOT NULL,
    "context" "SubmissionContext" NOT NULL,
    "isDryRun" BOOLEAN NOT NULL DEFAULT false,
    "contestId" TEXT,
    "classRoomId" TEXT,
    "classAssignmentId" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "judgePriority" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT,
    "status" "SubmissionStatus" NOT NULL,
    "score" INTEGER,
    "logs" TEXT,
    "compileLog" TEXT,
    "runtimeMs" INTEGER,
    "memoryMb" INTEGER,
    "error" TEXT,
    "judgeStartedAt" TIMESTAMP(3),
    "judgeFinishedAt" TIMESTAMP(3),
    "testsPassed" INTEGER,
    "testsTotal" INTEGER,
    "caseResults" JSONB,
    "sourceCode" TEXT,
    "sourceCodeObjectKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportExport" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "status" "ExportJobStatus" NOT NULL,
    "fileObjectKey" TEXT,
    "fileUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ReportExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeSimilarityFinding" (
    "id" TEXT NOT NULL,
    "contestId" TEXT,
    "submissionIdA" TEXT NOT NULL,
    "submissionIdB" TEXT NOT NULL,
    "similarityPct" DOUBLE PRECISION NOT NULL,
    "algorithm" TEXT NOT NULL,
    "details" JSONB,
    "reportedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeSimilarityFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_providerUserId_key" ON "OAuthAccount"("provider", "providerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassRoom_classCode_key" ON "ClassRoom"("classCode");

-- CreateIndex
CREATE INDEX "ClassEnrollment_userId_idx" ON "ClassEnrollment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassEnrollment_classRoomId_userId_key" ON "ClassEnrollment"("classRoomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassInvite_tokenHash_key" ON "ClassInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "ClassInvite_email_idx" ON "ClassInvite"("email");

-- CreateIndex
CREATE INDEX "ClassInvite_classRoomId_idx" ON "ClassInvite"("classRoomId");

-- CreateIndex
CREATE INDEX "ClassInvite_classRoomId_email_idx" ON "ClassInvite"("classRoomId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_slug_key" ON "Problem"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "ProblemTag_tagId_idx" ON "ProblemTag"("tagId");

-- CreateIndex
CREATE INDEX "TestCase_problemId_idx" ON "TestCase"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "TestCase_problemId_orderIndex_key" ON "TestCase"("problemId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Contest_slug_key" ON "Contest"("slug");

-- CreateIndex
CREATE INDEX "ContestParticipant_userId_idx" ON "ContestParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestParticipant_contestId_userId_key" ON "ContestParticipant"("contestId", "userId");

-- CreateIndex
CREATE INDEX "Submission_userId_problemId_idx" ON "Submission"("userId", "problemId");

-- CreateIndex
CREATE INDEX "Submission_contestId_idx" ON "Submission"("contestId");

-- CreateIndex
CREATE INDEX "Submission_status_idx" ON "Submission"("status");

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRoom" ADD CONSTRAINT "ClassRoom_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassInvite" ADD CONSTRAINT "ClassInvite_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassInvite" ADD CONSTRAINT "ClassInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAssignment" ADD CONSTRAINT "ClassAssignment_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAssignment" ADD CONSTRAINT "ClassAssignment_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAssignment" ADD CONSTRAINT "ClassAssignment_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTag" ADD CONSTRAINT "ProblemTag_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTag" ADD CONSTRAINT "ProblemTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoldenSolution" ADD CONSTRAINT "GoldenSolution_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoldenSolution" ADD CONSTRAINT "GoldenSolution_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGenerationJob" ADD CONSTRAINT "AiGenerationJob_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGenerationJob" ADD CONSTRAINT "AiGenerationJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestProblem" ADD CONSTRAINT "ContestProblem_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestProblem" ADD CONSTRAINT "ContestProblem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestParticipant" ADD CONSTRAINT "ContestParticipant_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestParticipant" ADD CONSTRAINT "ContestParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_classAssignmentId_fkey" FOREIGN KEY ("classAssignmentId") REFERENCES "ClassAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSimilarityFinding" ADD CONSTRAINT "CodeSimilarityFinding_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSimilarityFinding" ADD CONSTRAINT "CodeSimilarityFinding_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSimilarityFinding" ADD CONSTRAINT "CodeSimilarityFinding_submissionIdA_fkey" FOREIGN KEY ("submissionIdA") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSimilarityFinding" ADD CONSTRAINT "CodeSimilarityFinding_submissionIdB_fkey" FOREIGN KEY ("submissionIdB") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
