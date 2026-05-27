/**
 * Normalize Core API list responses.
 * Most endpoints return `{ items, total, page, limit }`.
 * `formatPagedList` (users) returns `{ items, paging: { ... } }`.
 */

export type PaginatedList<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ApiPagedListRaw<T> = {
  items: T[];
  paging?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

export function normalizePagedList<T>(raw: ApiPagedListRaw<T>): PaginatedList<T> {
  if (raw.paging) {
    return {
      items: raw.items,
      total: raw.paging.total,
      page: raw.paging.page,
      limit: raw.paging.limit,
      totalPages: raw.paging.totalPages,
    };
  }
  const limit = raw.limit ?? Math.max(1, raw.items.length || 1);
  const total = raw.total ?? raw.items.length;
  const page = raw.page ?? 1;
  const totalPages = raw.totalPages ?? Math.max(1, Math.ceil(total / limit));
  return { items: raw.items, total, page, limit, totalPages };
}
