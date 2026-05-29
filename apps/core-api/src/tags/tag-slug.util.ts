const MAX_SLUG = 80;

/** Slug URL-safe từ tên hiển thị (cho Tag). */
export function slugifyTagName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!base) return 'tag';
  return base.slice(0, MAX_SLUG);
}

export async function buildUniqueTagSlug(
  prisma: { findUnique: (args: { where: { slug: string } }) => Promise<unknown> },
  input: string,
): Promise<string> {
  const baseSlug = slugifyTagName(input);
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.findUnique({ where: { slug } })) {
    counter += 1;
    const suffix = `-${counter}`;
    const trimmedBase = baseSlug.slice(0, Math.max(1, MAX_SLUG - suffix.length));
    slug = `${trimmedBase}${suffix}`;
  }

  return slug;
}
