'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  Plus,
  Search,
  Calendar,
  Edit2,
  Trash2,
  Clock,
  Trophy,
  MoreVertical,
  Eye,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { Contest, contestsApi, CreateContestDto, UpdateContestDto } from '@/services/contest.apis';
import { Problem, problemsApi } from '@/services/problem.apis';
import { useDebounce } from '@/hooks/use-debounce';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import Link from 'next/link';

export default function ClassContestsTab({
  classId,
  isOwner,
  canManage,
}: {
  classId: string;
  isOwner: boolean;
  canManage: boolean;
}) {
  const [contests, setContests] = useState<Contest[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingContestId, setEditingContestId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contestToDelete, setContestToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [problemSearch, setProblemSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const router = useRouter();

  const [formData, setFormData] = useState<CreateContestDto>({
    title: '',
    description: '',
    startAt: '',
    endAt: '',
    testFeedbackPolicy: 'SUMMARY_ONLY',
    maxSubmissionsPerProblem: undefined,
    password: '',
    problems: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setEditingContestId(null);
    setFormData({
      title: '',
      description: '',
      startAt: '',
      endAt: '',
      testFeedbackPolicy: 'SUMMARY_ONLY',
      maxSubmissionsPerProblem: undefined,
      password: '',
      problems: [],
    });
    setErrors({});
    setProblemSearch('');
  };

  const handleShowCreate = () => {
    resetForm();
    setShowCreateForm(true);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contestsResult, problemsResult] = await Promise.all([
        contestsApi.findAll({ limit: 50, classRoomId: classId }),
        problemsApi.findAll({ limit: 100, classRoomId: classId }),
      ]);
      setContests(contestsResult.items);
      setProblems(problemsResult.items);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const now = new Date();
    now.setSeconds(0, 0);

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.startAt) {
      newErrors.startAt = 'Start time is required';
    } else {
      const startDate = new Date(formData.startAt);
      if (startDate < now) {
        newErrors.startAt = 'Start time cannot be in the past';
      }
    }

    if (!formData.endAt) {
      newErrors.endAt = 'End time is required';
    } else {
      const endDate = new Date(formData.endAt);
      if (endDate < now) {
        newErrors.endAt = 'End time cannot be in the past';
      }
    }

    if (formData.startAt && formData.endAt) {
      const startDate = new Date(formData.startAt);
      const endDate = new Date(formData.endAt);
      if (endDate <= startDate) {
        newErrors.endAt = 'End time must be after start time';
      }
    }

    if (!formData.problems || formData.problems.length === 0) {
      newErrors.problems = 'At least one problem is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      const payload = {
        ...formData,
        classRoomId: classId,
      };

      if (editingContestId) {
        await contestsApi.update(editingContestId, payload as UpdateContestDto);
      } else {
        await contestsApi.create(payload as CreateContestDto);
      }
      resetForm();
      setShowCreateForm(false);
      loadData();
      toast.success(
        editingContestId ? 'Contest updated successfully!' : 'Contest created successfully!',
        {
          position: 'top-center',
        },
      );
    } catch (error) {
      console.error('Failed to save contest:', error);
      toast.error('Failed to save contest. Please check your inputs.', { position: 'top-center' });
    }
  };

  const handleEdit = async (contest: Contest) => {
    try {
      const data = await contestsApi.findById(contest.id);
      setFormData({
        title: data.title,
        description: data.description ?? '',
        startAt: data.startAt.slice(0, 16),
        endAt: data.endAt.slice(0, 16),
        testFeedbackPolicy: data.testFeedbackPolicy,
        maxSubmissionsPerProblem: data.maxSubmissionsPerProblem ?? undefined,
        password: '',
        problems:
          data.problems?.map((item) => ({
            problemId: item.problemId,
            points: item.points,
            orderIndex: item.orderIndex,
            timeLimitMsOverride: item.timeLimitMsOverride ?? undefined,
            memoryLimitMbOverride: item.memoryLimitMbOverride ?? undefined,
          })) ?? [],
      });
      setEditingContestId(contest.id);
      setShowCreateForm(true);
    } catch (error) {
      console.error('Failed to load contest details:', error);
      toast.error('Failed to load contest details.', { position: 'top-center' });
    }
  };

  const handleDelete = (contestId: string) => {
    setContestToDelete(contestId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!contestToDelete) return;
    setDeleteLoading(true);
    try {
      await contestsApi.delete(contestToDelete);
      if (editingContestId === contestToDelete) {
        resetForm();
        setShowCreateForm(false);
      }
      loadData();
      toast.success('Contest deleted successfully.', { position: 'top-center' });
      setDeleteConfirmOpen(false);
    } catch (error) {
      console.error('Failed to delete contest:', error);
      toast.error('Failed to delete contest.', { position: 'top-center' });
    } finally {
      setDeleteLoading(false);
      setContestToDelete(null);
    }
  };

  const handleCancel = () => {
    resetForm();
    setShowCreateForm(false);
  };

  const addProblemToContest = (problemId: string) => {
    if (!formData.problems?.find((p) => p.problemId === problemId)) {
      setFormData({
        ...formData,
        problems: [
          ...(formData.problems || []),
          { problemId, points: 100, orderIndex: (formData.problems?.length || 0) + 1 },
        ],
      });
    }
  };

  const removeProblemFromContest = (problemId: string) => {
    setFormData({
      ...formData,
      problems: formData.problems?.filter((p) => p.problemId !== problemId) || [],
    });
  };

  const filteredContests = contests.filter(
    (contest) =>
      contest.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      contest.description?.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  const filteredAvailableProblems = problems.filter(
    (p) =>
      p.title.toLowerCase().includes(problemSearch.toLowerCase()) &&
      !formData.problems?.some((cp) => cp.problemId === p.id),
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Running</Badge>;
      case 'ENDED':
        return (
          <Badge variant="secondary" className="bg-red-500 hover:bg-red-500 text-white">
            Ended
          </Badge>
        );
      case 'PUBLISHED':
        return (
          <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50">
            Published
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive" className="">
            {status}
          </Badge>
        );
    }
  };

  const handleNavigateContest = (contestId: string) => {
    router.push(`/dashboard/${classId}/contests/${contestId}`);
  };

  if (loading && contests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading contests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Class Contests</h2>
          <p className="text-muted-foreground">
            {isOwner
              ? 'Manage and track contests for your students.'
              : 'View contests available for your class.'}
          </p>
        </div>
        {canManage && (
          <Button
            onClick={handleShowCreate}
            className="cursor-pointer bg-black hover:bg-gray-800 text-white shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Contest
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-100 shadow-sm w-full max-w-md">
        <div className="pl-3">
          <Search className="w-4 h-4 text-gray-400" />
        </div>
        <Input
          placeholder="Search contests by title or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-0 focus-visible:ring-0 shadow-none bg-transparent"
        />
      </div>

      {showCreateForm && (
        <Card className="border-2 border-black/5 shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <CardHeader className="border-b">
            <CardTitle className="text-xl">
              {editingContestId ? 'Edit Contest' : 'Create New Contest'}
            </CardTitle>
            <CardDescription>Fill in the details below to set up your contest.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold">
                  Title
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (errors.title) setErrors({ ...errors, title: '' });
                  }}
                  placeholder="e.g. Midterm Programming Contest"
                  className={`rounded-lg border-gray-200 focus:border-black transition-colors ${errors.title ? 'border-red-500 bg-red-50' : ''}`}
                />
                {errors.title && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.title}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">
                  Access Password (optional)
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Leave empty for public access"
                  className="rounded-lg border-gray-200 focus:border-black transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this contest about?"
                className="min-h-[100px] rounded-lg border-gray-200 focus:border-black transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="startAt" className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" /> Start Time
                </Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16)}
                  value={formData.startAt}
                  onChange={(e) => {
                    setFormData({ ...formData, startAt: e.target.value });
                    if (errors.startAt) setErrors({ ...errors, startAt: '' });
                  }}
                  className={`rounded-lg border-gray-200 focus:border-black transition-colors ${errors.startAt ? 'border-red-500 bg-red-50' : ''}`}
                />
                {errors.startAt && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.startAt}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endAt" className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" /> End Time
                </Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16)}
                  value={formData.endAt}
                  onChange={(e) => {
                    setFormData({ ...formData, endAt: e.target.value });
                    if (errors.endAt) setErrors({ ...errors, endAt: '' });
                  }}
                  className={`rounded-lg border-gray-200 focus:border-black transition-colors ${errors.endAt ? 'border-red-500 bg-red-50' : ''}`}
                />
                {errors.endAt && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.endAt}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="testFeedbackPolicy" className="text-sm font-semibold">
                  Feedback Policy
                </Label>
                <Select
                  value={formData.testFeedbackPolicy}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, testFeedbackPolicy: value })
                  }
                >
                  <SelectTrigger className="rounded-lg border-gray-200 focus:ring-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUMMARY_ONLY">Summary Only</SelectItem>
                    <SelectItem value="VERBOSE">Full Details (Verbose)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxSubmissions" className="text-sm font-semibold">
                  Max Submissions per Problem
                </Label>
                <Input
                  id="maxSubmissions"
                  type="number"
                  value={formData.maxSubmissionsPerProblem || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxSubmissionsPerProblem: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="Unlimited"
                  className="rounded-lg border-gray-200 focus:border-black transition-colors"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div>
                <Label className="text-base font-bold flex items-center gap-2 text-gray-900">
                  <Trophy className="w-4 h-4 text-amber-500" /> Contest Problems
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select and configure problems for this contest
                </p>
              </div>

              <div
                className={`border rounded-xl p-6 bg-gray-50/20 space-y-6 ${errors.problems ? 'border-red-300 bg-red-50/20' : 'border-gray-200'}`}
              >
                {errors.problems && (
                  <p className="text-sm text-red-500 font-medium">{errors.problems}</p>
                )}

                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search available problems..."
                      value={problemSearch}
                      onChange={(e) => setProblemSearch(e.target.value)}
                      className="pl-10 bg-white border-gray-200 focus-visible:ring-black"
                    />
                  </div>

                  {filteredAvailableProblems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto bg-white rounded-xl">
                      {filteredAvailableProblems.map((problem) => (
                        <div
                          key={problem.id}
                          className="flex items-center justify-between p-3 border border-gray-300 rounded-xl hover:bg-gray-50/80 group cursor-pointer transition-colors"
                          onClick={() => addProblemToContest(problem.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-xs shrink-0">
                              {problem.difficulty[0]}
                            </div>
                            <span className="text-sm font-medium text-gray-700 truncate">
                              {problem.title}
                            </span>
                          </div>
                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-black shrink-0" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      {problems.length === 0
                        ? 'No problems available in this classroom. Please create some problems first.'
                        : 'All classroom problems have been added to this contest.'}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-6 border-t border-gray-200">
                  <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    Included Problems ({formData.problems?.length || 0})
                  </Label>
                  <div className="space-y-2">
                    {formData.problems?.length === 0 ? (
                      <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
                        No problems added yet
                      </div>
                    ) : (
                      formData.problems?.map((cp, idx) => {
                        const problem = problems.find((p) => p.id === cp.problemId);
                        return (
                          <div
                            key={cp.problemId}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-gray-300 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-gray-400 shrink-0">
                                #{idx + 1}
                              </span>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-gray-900 truncate">
                                  {problem?.title || 'Unknown Problem'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {problem?.difficulty} • {cp.points} points
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                              <div className="flex items-center gap-2">
                                <Label className="text-xs font-bold text-gray-400">Points</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={cp.points}
                                  onChange={(e) => {
                                    const next = [...(formData.problems || [])];
                                    next[idx].points = Number(e.target.value);
                                    setFormData({ ...formData, problems: next });
                                  }}
                                  className="w-20 h-8 rounded-lg text-center border-gray-200 focus-visible:ring-black focus-visible:ring-offset-0 focus:border-black"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeProblemFromContest(cp.problemId)}
                                className="text-rose-500 bg-rose-100 hover:bg-rose-50 hover:text-rose-500 cursor-pointer rounded-full h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end items-center gap-3 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={handleCancel}
                className="hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-black cursor-pointer hover:bg-gray-800 text-white px-8"
              >
                {editingContestId ? 'Save Changes' : 'Create Contest'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="py-4 font-bold text-black">Contest Title</TableHead>
                <TableHead className="py-4 font-bold text-black">Status</TableHead>
                <TableHead className="py-4 font-bold text-black">Timeline</TableHead>
                <TableHead className="py-4 font-bold text-black">Problems</TableHead>
                <TableHead className="py-4 font-bold text-black text-right pr-12">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                      <Calendar className="w-12 h-12" />
                      <p className="text-lg font-medium">No contests found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredContests.map((contest) => (
                  <TableRow
                    key={contest.id}
                    className="group hover:bg-black/[0.02] transition-colors"
                  >
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 group-hover:text-black transition-colors">
                          {contest.title}
                        </span>
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {contest.description || 'No description'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">{getStatusBadge(contest.status)}</TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col text-xs space-y-1">
                        <span className="flex items-center gap-1.5 text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          {format(new Date(contest.startAt), 'MMM d, h:mm a')}
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          {format(new Date(contest.endAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        {contest.problems?.length || 0}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right pr-6">
                      {canManage ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full hover:bg-black/5"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 p-1 rounded-xl shadow-xl border-gray-100"
                          >
                            <DropdownMenuItem
                              onClick={() => handleNavigateContest(contest.id)}
                              className="rounded-lg gap-2 cursor-pointer py-2"
                            >
                              <Eye className="w-4 h-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEdit(contest)}
                              className="rounded-lg gap-2 cursor-pointer py-2"
                            >
                              <Edit2 className="w-4 h-4" /> Edit Contest
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(contest.id)}
                              className="rounded-lg gap-2 cursor-pointer py-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" /> Delete Contest
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Link
                          href={`/dashboard/${classId}/contests/${contest.id}`}
                          className="border border-gray-800 rounded-md p-2 bg-black text-white font-medium hover:bg-gray-800"
                        >
                          View Details
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Contest"
        description="Are you sure you want to delete this contest? All progress for this contest will be lost. This action cannot be undone."
        loading={deleteLoading}
      />
    </div>
  );
}
