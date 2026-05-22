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

/** Internal select — includes object key for presigned avatar resolution (not returned to clients). */
export const PUBLIC_USER_WITH_AVATAR_KEY_SELECT = {
  ...PUBLIC_USER_SELECT,
  imageObjectKey: true,
} satisfies Prisma.UserSelect;

export type UserWithAvatarKey = Prisma.UserGetPayload<{
  select: typeof PUBLIC_USER_WITH_AVATAR_KEY_SELECT;
}>;
