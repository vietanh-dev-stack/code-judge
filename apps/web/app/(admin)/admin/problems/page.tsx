'use client';

import { useState, useEffect } from 'react';
import { problemsApi, Problem } from '@/services/problem.apis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Globe,
  Lock,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Code2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';

export default function AdminProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadProblems = async () => {
    setLoading(true);
    try {
      const data = await problemsApi.findAllAdmin({ search, page, limit: 10 });
      setProblems(data.items);
      setTotal(data.total);
    } catch (error) {
      toast.error('Failed to load problems');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProblems();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadProblems();
  };

  const togglePublished = async (problemId: string, currentStatus: boolean) => {
    try {
      await problemsApi.update(problemId, { isPublished: !currentStatus });
      toast.success(`Problem ${!currentStatus ? 'published' : 'unpublished'}`);
      loadProblems();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this problem?')) return;
    try {
      await problemsApi.delete(id);
      toast.success('Problem deleted');
      loadProblems();
    } catch (error) {
      toast.error('Failed to delete problem');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'HARD':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Problems Management</h1>
          <p className="text-muted-foreground mt-1">Manage public and private coding challenges</p>
        </div>
        <Button
          asChild
          className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105"
        >
          <Link href="/admin/problems/create">
            <Plus className="w-4 h-4 mr-2" />
            New Problem
          </Link>
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-md overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search problems..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background border-border focus:ring-primary"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/10 hover:bg-muted/10">
              <TableHead className="w-[300px]">Problem</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell colSpan={6} className="h-16 bg-slate-50/20" />
                </TableRow>
              ))
            ) : problems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Code2 className="w-8 h-8 text-slate-300" />
                    <p>No problems found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              problems.map((problem) => (
                <TableRow key={problem.id} className="hover:bg-muted/5 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-foreground">{problem.title}</span>
                      <span className="text-xs text-muted-foreground font-normal truncate max-w-[250px]">
                        {problem.slug}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getDifficultyColor(problem.difficulty)}>
                      {problem.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={problem.isPublished}
                        onCheckedChange={() => togglePublished(problem.id, problem.isPublished)}
                      />
                      <Badge
                        variant={problem.isPublished ? 'default' : 'secondary'}
                        className={
                          problem.isPublished
                            ? 'bg-primary/10 text-primary hover:bg-primary/10 border-primary/20'
                            : ''
                        }
                      >
                        {problem.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {(problem as any).creator?.name || 'System'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/admin/problems/${problem.id}`}
                            className="flex items-center"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                          onClick={() => handleDelete(problem.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
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

        <div className="p-4 border-t border-border border-slate-100 bg-muted/10 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {problems.length} of {total} problems
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 10 >= total || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
