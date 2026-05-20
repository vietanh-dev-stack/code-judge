import { randomBytes } from 'crypto';
import type { PrismaService } from '../prisma/prisma.service';

export function slugify(value: string): string {
  const raw = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return raw.length > 0 ? raw : `problem-${randomBytes(4).toString('hex')}`;
}

export async function buildUniqueProblemSlug(
  prisma: PrismaService['problem'],
  title: string,
): Promise<string> {
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let counter = 1;
  while (await prisma.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }
  return slug;
}
