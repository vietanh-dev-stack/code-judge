'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Problem, ProblemBankProgress, problemsApi } from '@/services/problem.apis';
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
import {
  Search,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Zap,
  SquareMenu,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { ProblemTagSlugFilter } from '@/components/problems/ProblemTagSlugFilter';
import ProblemCard from './ProblemCard';

const PAGE_SIZE = 4;

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
  const [progress, setProgress] = useState<ProblemBankProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);

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
            e instanceof ApiRequestError ? e.body.message : 'Failed to load problem bank.';
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
    let cancelled = false;
    (async () => {
      setProgressLoading(true);
      try {
        const res = await problemsApi.getBankProgress();
        if (!cancelled) setProgress(res);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setProgress({ total: 0, solved: 0, byDifficulty: { EASY: 0, MEDIUM: 0, HARD: 0 } });
        }
      } finally {
        if (!cancelled) setProgressLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    setProgressLoading(true);
    Promise.all([
      problemsApi.findAll({
        search: f.q || undefined,
        page: f.page,
        limit: PAGE_SIZE,
        difficulty: f.difficulty || undefined,
        mode: f.mode || undefined,
        tagSlug: f.tagSlug || undefined,
      }),
      problemsApi.getBankProgress(),
    ])
      .then(([listRes, progressRes]) => {
        setItems(listRes.items);
        setTotal(listRes.total);
        setProgress(progressRes);
      })
      .catch((e) => {
        const msg = e instanceof ApiRequestError ? e.body.message : 'Failed to load problem bank.';
        toast.error(msg, { position: 'top-center' });
        setItems([]);
        setTotal(0);
        setProgress({ total: 0, solved: 0, byDifficulty: { EASY: 0, MEDIUM: 0, HARD: 0 } });
      })
      .finally(() => {
        setLoading(false);
        setProgressLoading(false);
      });
  }, [searchParams]);

  const progressTotal = progress?.total ?? 0;
  const progressSolved = progress?.solved ?? 0;
  const progressPct =
    progressTotal > 0 ? Math.min(100, Math.round((progressSolved / progressTotal) * 100)) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Problem Bank</h1>
          <p className="bg-primary text-muted py-1 px-2 rounded-full text-sm font-semibold">
            {total > 0 ? `${total} problems` : null}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <p className="text-lg text-primary/70 max-w-2xl leading-relaxed">
            Practice and master programming with our curated collection of public problems. Filter
            by difficulty, topics, or status to find your next challenge.{' '}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Filters */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by title, description, or slug..."
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-slate-950/40 border-slate-800 focus-visible:border-slate-700 text-slate-200 placeholder:text-slate-500 rounded-lg text-sm focus-visible:ring-0 focus-visible:ring-offset-0 transition-all"
              aria-label="Search problems"
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs font-medium">Difficulty</p>
              <Select value={filters.difficulty || 'all'} onValueChange={setDifficulty}>
                <SelectTrigger className="w-[120px] m-0 cursor-pointer">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs font-medium">Mode</p>
              <Select value={filters.mode || 'all'} onValueChange={setMode}>
                <SelectTrigger className="w-[130px] m-0 cursor-pointer">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="ALGO">Algorithm</SelectItem>
                  <SelectItem value="PROJECT">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ProblemTagSlugFilter
              value={filters.tagSlug}
              onChange={setTagSlug}
              label="Tag"
              allLabel="All"
              triggerClassName="w-[150px] m-0 cursor-pointer"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 cursor-pointer"
              onClick={() => void refetch()}
              disabled={loading}
              aria-label="Làm mới"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Problem List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading && items.length === 0 ? (
              <div className="col-span-full h-32 flex items-center justify-center bg-card rounded-xl border border-slate-800">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="col-span-full text-muted-foreground h-32 flex items-center justify-center bg-card rounded-xl border border-slate-800 text-sm">
                No matching problems. Try adjusting filters or keywords.
              </div>
            ) : (
              items.map((p) => {
                return <ProblemCard key={p.id} problem={p} onTagClick={setTagSlug} />;
              })
            )}
          </div>
          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                Page {filters.page} / {totalPages} · {PAGE_SIZE} problems / page
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => goPage(filters.page - 1)}
                  disabled={filters.page <= 1 || loading}
                  className="flex items-center gap-1 text-primary hover:bg-primary/10 hover:text-primary cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => goPage(filters.page + 1)}
                  disabled={filters.page >= totalPages || loading}
                  className="flex items-center gap-1 text-primary hover:bg-primary/10 hover:text-primary cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              {total > 0 ? `Found ${items.length} problem${items.length > 1 ? 's' : ''}.` : null}
            </p>
          )}
        </div>
        {/* Stats */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* User Progress */}
          <div className="flex flex-col gap-4 p-5 bg-slate-900/50 border border-primary/20 hover:border hover:border-primary/50 rounded-2xl shadow-sm transition-all duration-200">
            <div className="flex items-center gap-3">
              <SquareMenu className="h-5 w-5 text-primary" />
              <p className="font-semibold text-lg">My Progress</p>
            </div>
            {/* Total Solved - Progress bar */}
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex items-center justify-between">
                <h5 className="text-primary/80 text-md">Total Solved</h5>
                {progressLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <p className="font-medium text-sm">
                    {progressSolved} / {progressTotal}
                  </p>
                )}
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: progressLoading ? '0%' : `${progressPct}%` }}
                />
              </div>
              {!progressLoading && progressTotal > 0 ? (
                <p className="text-[11px] text-muted-foreground">{progressPct}% of problem bank</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
              {(['EASY', 'MEDIUM', 'HARD'] as const).map((d) => {
                const count = progress?.byDifficulty[d] ?? 0;
                const diffColor =
                  d === 'EASY'
                    ? 'bg-emerald-500/30 text-emerald-400 border-emerald-500/20'
                    : d === 'MEDIUM'
                      ? 'bg-amber-500/30 text-amber-400 '
                      : 'bg-rose-500/30 text-rose-400';
                return (
                  <div key={d} className={`flex flex-col p-3 rounded-lg ${diffColor}`}>
                    <span
                      className={`text-[11px] font-bold tracking-wider rounded uppercase text-center`}
                    >
                      {d}
                    </span>
                    <p className="font-medium text-sm text-center mt-3">
                      {progressLoading ? '—' : count}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
