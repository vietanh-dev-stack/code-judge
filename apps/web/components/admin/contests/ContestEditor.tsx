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
  Plus,
  ArrowLeft,
  Save,
  Trash2,
  Clock,
  Trophy,
  Search,
  Calendar,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { contestsApi, CreateContestDto, UpdateContestDto } from '@/services/contest.apis';
import { problemsApi, Problem } from '@/services/problem.apis';
import { dateTimeLocalToUtcIso, utcIsoToDateTimeLocal } from '@/lib/utils';
import { adminToast } from '@/lib/admin-toast';

export default function AdminContestEditor({ contestId }: { contestId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!contestId);
  const [availableProblems, setAvailableProblems] = useState<Problem[]>([]);
  const [problemSearch, setProblemSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<Partial<CreateContestDto>>({
    title: '',
    description: '',
    startAt: '',
    endAt: '',
    testFeedbackPolicy: 'SUMMARY_ONLY',
    maxSubmissionsPerProblem: undefined,
    password: '',
    problems: [],
  });

  useEffect(() => {
    loadData();
  }, [contestId]);

  const loadData = async () => {
    try {
      const [problemsResult] = await Promise.all([problemsApi.findAllAdmin({ limit: 100 })]);
      setAvailableProblems(problemsResult.items);

      if (contestId) {
        const data = await contestsApi.findById(contestId);
        setFormData({
          title: data.title,
          description: data.description ?? '',
          startAt: utcIsoToDateTimeLocal(data.startAt),
          endAt: utcIsoToDateTimeLocal(data.endAt),
          testFeedbackPolicy: data.testFeedbackPolicy,
          maxSubmissionsPerProblem: data.maxSubmissionsPerProblem ?? undefined,
          password: '',
          problems:
            data.problems?.map((p) => ({
              problemId: p.problemId,
              points: p.points,
              orderIndex: p.orderIndex,
            })) || [],
        });
      }
    } catch (error) {
      adminToast.errorFrom(error, 'Failed to load contest data.');
    } finally {
      setInitialLoading(false);
    }
  };

  const addProblem = (problemId: string) => {
    if (formData.problems?.some((p) => p.problemId === problemId)) return;
    setFormData({
      ...formData,
      problems: [
        ...(formData.problems || []),
        { problemId, points: 100, orderIndex: (formData.problems?.length || 0) + 1 },
      ],
    });
    if (errors.problems) setErrors({ ...errors, problems: '' });
  };

  const removeProblem = (problemId: string) => {
    setFormData({
      ...formData,
      problems: formData.problems?.filter((p) => p.problemId !== problemId) || [],
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const now = new Date();
    now.setSeconds(0, 0);

    if (!formData.title?.trim()) {
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
    if (!validate()) {
      adminToast.error('Please fix the errors in the form.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        startAt: formData.startAt ? dateTimeLocalToUtcIso(formData.startAt) : undefined,
        endAt: formData.endAt ? dateTimeLocalToUtcIso(formData.endAt) : undefined,
      };

      if (contestId) {
        await contestsApi.update(contestId, payload as UpdateContestDto);
        adminToast.success('Contest updated.');
      } else {
        await contestsApi.create(payload as CreateContestDto);
        adminToast.success('Contest created.');
      }
      router.push('/admin/contests');
    } catch (error) {
      adminToast.errorFrom(error, 'Failed to save contest.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground mt-4 font-medium">Loading contest data...</p>
      </div>
    );
  }

  const filteredAvailable = availableProblems.filter(
    (p) =>
      p.title.toLowerCase().includes(problemSearch.toLowerCase()) &&
      !formData.problems?.some((cp) => cp.problemId === p.id),
  );

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {contestId ? 'Edit Contest' : 'New Contest'}
            </h1>
            <p className="text-muted-foreground">Configure your programming competition</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/20 min-w-[140px]"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {contestId ? 'Update' : 'Create'}
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-border shadow-md overflow-hidden bg-card">
            <CardHeader className="bg-muted/10 border-b border-border">
              <CardTitle className="text-lg">Basic Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      if (errors.title) setErrors({ ...errors, title: '' });
                    }}
                    placeholder="Contest name..."
                    className={`h-11 border-border bg-background focus:ring-primary ${errors.title ? 'border-red-500 bg-red-50/10 focus:ring-red-500' : ''}`}
                  />
                  {errors.title && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{errors.title}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" /> Password (Optional)
                  </Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Secure access..."
                    className="h-11 border-border bg-background focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Contest rules, prizes, etc..."
                  className="min-h-[120px] border-border bg-background focus:ring-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" /> Start Time
                  </Label>
                  <Input
                    type="datetime-local"
                    min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16)}
                    value={formData.startAt}
                    onChange={(e) => {
                      setFormData({ ...formData, startAt: e.target.value });
                      if (errors.startAt) setErrors({ ...errors, startAt: '' });
                    }}
                    className={`border-border bg-background focus:ring-primary ${errors.startAt ? 'border-red-500 bg-red-50/10 focus:ring-red-500' : ''}`}
                  />
                  {errors.startAt && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{errors.startAt}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" /> End Time
                  </Label>
                  <Input
                    type="datetime-local"
                    min={
                      formData.startAt ||
                      new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
                        .toISOString()
                        .slice(0, 16)
                    }
                    value={formData.endAt}
                    onChange={(e) => {
                      setFormData({ ...formData, endAt: e.target.value });
                      if (errors.endAt) setErrors({ ...errors, endAt: '' });
                    }}
                    className={`border-border bg-background focus:ring-primary ${errors.endAt ? 'border-red-500 bg-red-50/10 focus:ring-red-500' : ''}`}
                  />
                  {errors.endAt && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{errors.endAt}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border-border bg-card shadow-md overflow-hidden ${errors.problems ? 'border-red-300 bg-red-50/5' : ''}`}
          >
            <CardHeader className="bg-muted/10 border-b border-border">
              <CardTitle className="text-lg">Contest Problems</CardTitle>
              <CardDescription>Select problems for this contest</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {errors.problems && (
                <p className="text-sm text-red-500 font-medium">{errors.problems}</p>
              )}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search available problems..."
                      value={problemSearch}
                      onChange={(e) => setProblemSearch(e.target.value)}
                      className="pl-10 border-border bg-background focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto p-1">
                  {filteredAvailable.map((problem) => (
                    <div
                      key={problem.id}
                      className="flex items-center justify-between p-3 border border-border rounded-xl hover:bg-muted/40 group cursor-pointer transition-colors"
                      onClick={() => addProblem(problem.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {problem.difficulty[0]}
                        </div>
                        <span className="text-sm font-medium text-foreground">{problem.title}</span>
                      </div>
                      <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-6 border-t border-border">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" /> Included Problems
                  </Label>
                  <div className="space-y-2">
                    {formData.problems?.length === 0 ? (
                      <div className="text-center py-10 bg-muted/5 rounded-xl border border-dashed border-border text-muted-foreground text-sm">
                        No problems added yet
                      </div>
                    ) : (
                      formData.problems?.map((cp, idx) => {
                        const problem = availableProblems.find((p) => p.id === cp.problemId);
                        return (
                          <div
                            key={cp.problemId}
                            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-md"
                          >
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground">
                                  {problem?.title}
                                </span>
                                <span className="text-xs text-muted-foreground">{cp.points} points</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2 mr-4">
                                <Label className="text-xs font-bold text-muted-foreground">Points</Label>
                                <Input
                                  type="number"
                                  value={cp.points}
                                  onChange={(e) => {
                                    const next = [...(formData.problems || [])];
                                    next[idx].points = Number(e.target.value);
                                    setFormData({ ...formData, problems: next });
                                  }}
                                  className="w-20 h-8 rounded-lg text-center bg-background border-border"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeProblem(cp.problemId)}
                                className="text-rose-500 hover:bg-rose-500/10 rounded-full"
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
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="border-border shadow-md overflow-hidden bg-card sticky top-24">
            <CardHeader className="bg-muted/10 border-b border-border">
              <CardTitle className="text-lg">Policies</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Feedback Policy</Label>
                  <Select
                    value={formData.testFeedbackPolicy}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, testFeedbackPolicy: value })
                    }
                  >
                    <SelectTrigger className="rounded-lg bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUMMARY_ONLY">Summary Only</SelectItem>
                      <SelectItem value="VERBOSE">Full Details</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Max Submissions</Label>
                  <Input
                    type="number"
                    value={formData.maxSubmissionsPerProblem || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxSubmissionsPerProblem: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="Unlimited"
                    className="rounded-lg bg-background border-border"
                  />
                  <p className="text-[10px] text-muted-foreground italic">Per problem per participant</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
