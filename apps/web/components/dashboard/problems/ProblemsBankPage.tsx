'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Problem, problemsApi } from '@/services/problem.apis';
import { ApiRequestError } from '@/services/api-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { ProblemTagSlugFilter } from '@/components/problems/ProblemTagSlugFilter';

const PAGE_SIZE = 12;

type DifficultyFilter = '' | 'EASY' | 'MEDIUM' | 'HARD';
type ModeFilter = '' | 'ALGO' | 'PROJECT';

function parseFilters(sp: URLSearchParams) {
  const page = Math.max(1, Number(sp.get('page') || '1') || 1);
  const q = (sp.get('q') ?? '').trim();
  const d = sp.get('difficulty') ?? '';
  const m = sp.get('mode') ?? '';
  const tagSlug = sp.get('tagSlug') ?? '';
  const difficulty = (['EASY', 'MEDIUM', 'HARD'].includes(d) ? d : '') as DifficultyFilter;
  const mode = (['ALGO', 'PROJECT'].includes(m) ? m : '') as ModeFilter;
  return { page, q, difficulty, mode, tagSlug };
}

export default function ProblemsBankPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const [searchDraft, setSearchDraft] = useState(filters.q);

  useEffect(() => {
    setSearchDraft(filters.q);
  }, [filters.q]);

  const replaceQuery = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(searchParams.toString());
      mutate(p);
      const qs = p.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const [items, setItems] = useState<Problem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await problemsApi.findAll({
          search: filters.q || undefined,
          page: filters.page,
          limit: PAGE_SIZE,
          difficulty: filters.difficulty || undefined,
          mode: filters.mode || undefined,
          tagSlug: filters.tagSlug || undefined,
        });
        if (!cancelled) {
          setItems(res.items);
          setTotal(res.total);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          const msg =
            e instanceof ApiRequestError ? e.body.message : 'Không tải được danh sách đề.';
          toast.error(msg, { position: 'top-center' });
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.q, filters.page, filters.difficulty, filters.mode, filters.tagSlug]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchDraft.trim();
      if (next === filters.q) return;
      replaceQuery((p) => {
        if (next) p.set('q', next);
        else p.delete('q');
        p.delete('page');
      });
    }, 400);
    return () => clearTimeout(t);
  }, [searchDraft, filters.q, replaceQuery]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const setDifficulty = (v: string | null) => {
    if (v == null) return;
    const d = (v === 'all' ? '' : v) as DifficultyFilter;
    replaceQuery((p) => {
      if (d) p.set('difficulty', d);
      else p.delete('difficulty');
      p.delete('page');
    });
  };

  const setMode = (v: string | null) => {
    if (v == null) return;
    const m = (v === 'all' ? '' : v) as ModeFilter;
    replaceQuery((p) => {
      if (m) p.set('mode', m);
      else p.delete('mode');
      p.delete('page');
    });
  };

  const setTagSlug = (slug: string) => {
    replaceQuery((p) => {
      if (slug) p.set('tagSlug', slug);
      else p.delete('tagSlug');
      p.delete('page');
    });
  };

  const goPage = (nextPage: number) => {
    const p = Math.min(Math.max(1, nextPage), totalPages);
    replaceQuery((params) => {
      if (p <= 1) params.delete('page');
      else params.set('page', String(p));
    });
  };

  const refetch = useCallback(() => {
    const f = parseFilters(searchParams);
    setLoading(true);
    problemsApi
      .findAll({
        search: f.q || undefined,
        page: f.page,
        limit: PAGE_SIZE,
        difficulty: f.difficulty || undefined,
        mode: f.mode || undefined,
        tagSlug: f.tagSlug || undefined,
      })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((e) => {
        const msg =
          e instanceof ApiRequestError ? e.body.message : 'Không tải được danh sách đề.';
        toast.error(msg, { position: 'top-center' });
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kho đề</h1>
        <p className="text-muted-foreground text-sm">
          Các đề công khai đã publish. {total > 0 ? `${total} đề` : null}
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tiêu đề, mô tả, slug..."
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            className="bg-background pl-8"
            aria-label="Tìm kiếm đề"
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">Độ khó</p>
            <Select value={filters.difficulty || 'all'} onValueChange={setDifficulty}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="EASY">Dễ</SelectItem>
                <SelectItem value="MEDIUM">Trung bình</SelectItem>
                <SelectItem value="HARD">Khó</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">Dạng</p>
            <Select value={filters.mode || 'all'} onValueChange={setMode}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="ALGO">Thuật toán</SelectItem>
                <SelectItem value="PROJECT">Project</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ProblemTagSlugFilter
            value={filters.tagSlug}
            onChange={setTagSlug}
            label="Tag"
            allLabel="Tất cả"
            triggerClassName="w-[150px]"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => void refetch()}
            disabled={loading}
            aria-label="Làm mới"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tiêu đề</TableHead>
              <TableHead className="hidden sm:table-cell">Slug</TableHead>
              <TableHead>Độ khó</TableHead>
              <TableHead className="hidden md:table-cell">Mode</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <Loader2 className="text-muted-foreground mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-32 text-center">
                  Không có đề phù hợp. Thử đổi bộ lọc hoặc từ khóa.
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{p.title}</span>
                      {p.tags && p.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.tags.map((t) => (
                            <Badge
                              key={t.tag.id}
                              variant="secondary"
                              className="text-[10px] py-0 px-1.5 h-4 bg-muted/60 text-muted-foreground hover:bg-muted font-normal cursor-pointer"
                              onClick={() => setTagSlug(t.tag.slug)}
                            >
                              {t.tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {p.description ? (
                        <span className="text-muted-foreground line-clamp-1 text-xs mt-0.5">
                          {p.description}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden font-mono text-xs sm:table-cell">
                    {p.slug}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.difficulty}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline">{p.mode}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/problem/${p.id}`}>Làm bài</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Trang {filters.page} / {totalPages} · {PAGE_SIZE} đề / trang
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goPage(filters.page - 1)}
              disabled={filters.page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Trước
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goPage(filters.page + 1)}
              disabled={filters.page >= totalPages || loading}
            >
              Sau
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          {total > 0 ? `Hiển thị ${items.length} đề.` : null}
        </p>
      )}
    </div>
  );
}
