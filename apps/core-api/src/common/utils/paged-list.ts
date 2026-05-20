export interface PagingMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PagedListResult<T> {
  items: T[];
  paging: PagingMeta;
}

export function formatPagedList<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PagedListResult<T> {
  const safeLimit = Math.max(1, limit);
  const safePage = Math.max(1, page);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  return {
    items,
    paging: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    },
  };
}
