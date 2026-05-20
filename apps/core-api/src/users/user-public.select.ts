import { Prisma } from '@prisma/client';

/** Safe user fields exposed to clients (matches GET /auth/me). */
export const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  image: true,
  emailVerified: true,
  isActive: true,
  createdAt: true,
  lastLoginAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof PUBLIC_USER_SELECT }>;
