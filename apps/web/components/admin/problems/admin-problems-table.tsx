'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Problem, problemsApi } from '@/services/problem.apis';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Pencil, Trash2, Loader2, RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ApiRequestError } from '@/services/api-client';
import { ProblemTagSlugFilter } from '@/components/problems/ProblemTagSlugFilter';

export default function AdminProblemsTable() {
  const [items, setItems] = useState<Problem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tagSlug, setTagSlug] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await problemsApi.findAllAdmin({
        search: debouncedSearch || undefined,
        page,
        limit,
        tagSlug: tagSlug || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
      const msg = e instanceof ApiRequestError ? e.body.message : 'Failed to fetch problems.';
      setListError(msg);
      setItems([]);
      setTotal(0);
      toast.error(msg, { position: 'top-center' });
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, tagSlug]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleDelete = async (p: Problem) => {
    if (!confirm(`Delete problem "${p.title}"? This action cannot be undone.`)) return;
    try {
      await problemsApi.delete(p.id);
      toast.success('Problem deleted successfully.', { position: 'top-center' });
      fetchProblems();
    } catch (e) {
      console.error(e);
      const msg =
        e instanceof ApiRequestError
          ? e.body.message
          : 'Failed to delete problem. Please try again later.';
      toast.error(msg, { position: 'top-center' });
    }
  };

  return (
    <div className="space-y-4">
      {listError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {listError}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3 max-w-xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tiêu đề, mô tả, slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-background"
            />
          </div>
          <ProblemTagSlugFilter
            value={tagSlug}
            onChange={(val) => {
              setTagSlug(val);
              setPage(1);
            }}
            label=""
            allLabel="Tất cả tag"
            triggerClassName="w-[160px] h-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!loading && total > 0 ? (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {items.length} / {total} đề
            </span>
          ) : null}
          <Button variant="outline" size="icon" onClick={fetchProblems} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button asChild className="gap-2">
            <Link href="/admin/problems/create">
              <Plus className="h-4 w-4" />
              Create Problem
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Độ khó</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {listError ? listError : 'No problems found.'}
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
                              onClick={() => {
                                setTagSlug(t.tag.slug);
                                setPage(1);
                              }}
                            >
                              {t.tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {p.description ? (
                        <span className="line-clamp-1 text-xs text-muted-foreground mt-0.5">
                          {p.description}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.slug}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.difficulty}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={p.isPublished ? 'outline' : 'destructive'}>
                        {p.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Tùy chọn</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/admin/problems/create?edit=${p.id}`}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Update
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(p)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((x) => Math.max(1, x - 1))}
            disabled={page <= 1 || loading}
          >
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((x) => Math.min(totalPages, x + 1))}
            disabled={page >= totalPages || loading}
          >
            Sau
          </Button>
        </div>
      ) : null}
    </div>
  );
}
