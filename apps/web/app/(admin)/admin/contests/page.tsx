'use client';

import { useState, useEffect } from 'react';
import { contestsApi, Contest } from '@/services/contest.apis';
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
  Calendar, 
  Clock, 
  Trophy,
  MoreVertical,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import Link from 'next/link';

export default function AdminContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadContests = async () => {
    setLoading(true);
    try {
      const data = await contestsApi.findAllAdmin({ search, page, limit: 10 });
      setContests(data.items);
      setTotal(data.total);
    } catch (error) {
      toast.error('Failed to load contests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContests();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadContests();
  };

  const toggleStatus = async (contestId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'DRAFT' ? 'PUBLISHED' : 'DRAFT';
    try {
      // Note: Backend handles auto-status (RUNNING/ENDED) based on dates if PUBLISHED
      await contestsApi.update(contestId, { 
        // We might need to handle specific status logic if backend doesn't auto-flip
      } as any);
      toast.success(`Contest status updated`);
      loadContests();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contest?')) return;
    try {
      await contestsApi.delete(id);
      toast.success('Contest deleted');
      loadContests();
    } catch (error) {
      toast.error('Failed to delete contest');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 animate-pulse">Live Now</Badge>;
      case 'ENDED':
        return <Badge variant="secondary">Finished</Badge>;
      case 'PUBLISHED':
        return <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50">Upcoming</Badge>;
      case 'DRAFT':
        return <Badge variant="outline" className="border-slate-200 text-slate-500 bg-slate-50">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Contests Management</h1>
          <p className="text-slate-500 mt-1">Schedule and monitor programming competitions</p>
        </div>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:scale-105">
          <Link href="/admin/contests/create">
            <Plus className="w-4 h-4 mr-2" />
            New Contest
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search contests..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white border-slate-200 focus:ring-indigo-500"
              />
            </div>
            <Button type="submit" variant="secondary">Search</Button>
          </form>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
              <TableHead className="w-[300px]">Contest</TableHead>
              <TableHead>Timeline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell colSpan={5} className="h-16 bg-slate-50/20" />
                </TableRow>
              ))
            ) : contests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Trophy className="w-8 h-8 text-slate-300" />
                    <p>No contests found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              contests.map((contest) => (
                <TableRow key={contest.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-slate-900">{contest.title}</span>
                      <span className="text-xs text-slate-400 font-normal">
                        {contest.slug}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm text-slate-600 gap-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{format(new Date(contest.startAt), 'MMM d, h:mm a')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Duration: {Math.round((new Date(contest.endAt).getTime() - new Date(contest.startAt).getTime()) / 60000)}m</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(contest.status)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-600">
                      {(contest as any).createdBy?.name || 'System'}
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
                          <Link href={`/admin/contests/${contest.id}`} className="flex items-center">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-rose-600 focus:text-rose-600 focus:bg-rose-50" onClick={() => handleDelete(contest.id)}>
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

        <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {contests.length} of {total} contests
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || loading}
              onClick={() => setPage(p => p - 1)}
              className="rounded-lg"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 10 >= total || loading}
              onClick={() => setPage(p => p + 1)}
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
