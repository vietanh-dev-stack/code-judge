import { PrismaService } from '../prisma/prisma.service';

/** Chủ lớp + enrollment OWNER — không tính vào thống kê học viên. */
export type ClassroomReportScope = {
  ownerId: string | null;
  staffUserIds: Set<string>;
};

export async function resolveClassroomReportScope(
  prisma: PrismaService,
  classRoomId: string,
): Promise<ClassroomReportScope> {
  const [classRoom, ownerEnrollments] = await Promise.all([
    prisma.classRoom.findUnique({
      where: { id: classRoomId },
      select: { ownerId: true },
    }),
    prisma.classEnrollment.findMany({
      where: { classRoomId, status: 'ACTIVE', role: 'OWNER' },
      select: { userId: true },
    }),
  ]);

  const staffUserIds = new Set<string>();
  if (classRoom?.ownerId) {
    staffUserIds.add(classRoom.ownerId);
  }
  for (const e of ownerEnrollments) {
    staffUserIds.add(e.userId);
  }

  return {
    ownerId: classRoom?.ownerId ?? null,
    staffUserIds,
  };
}

export function isStaffUser(userId: string, scope: ClassroomReportScope): boolean {
  return scope.staffUserIds.has(userId);
}
