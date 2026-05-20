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
