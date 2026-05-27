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
  Beaker,
  Clock,
  Database,
  Globe,
  Lock,
  Save,
  Trash2,
  Languages,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProblemFormTestCaseList } from '@/components/problems/ProblemFormTestCaseList';
import { ProblemFormTestCasesScroll } from '@/components/problems/ProblemFormPageShell';
import { Switch } from '@/components/ui/switch';
import {
  CalibrateProblemLimitsResult,
  CreateProblemDto,
  problemsApi,
  UpdateProblemDto,
} from '@/services/problem.apis';
import { adminToast } from '@/lib/admin-toast';
import { ProblemTagPicker } from '@/components/problems/ProblemTagPicker';
import { AdminExportReportButton } from '@/components/admin/admin-export-report-button';

const SUPPORTED_LANGUAGES = ['PYTHON', 'JAVASCRIPT', 'CPP', 'JAVA', 'GO', 'RUST'] as const;

export default function AdminProblemEditor({ problemId }: { problemId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!problemId);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrateResult, setCalibrateResult] = useState<CalibrateProblemLimitsResult | null>(
    null,
  );

  const [formData, setFormData] = useState<Partial<CreateProblemDto>>({
    title: '',
    description: '',
    statementMd: '',
    difficulty: 'EASY',
    mode: 'ALGO',
    timeLimitMs: 1000,
    memoryLimitMb: 256,
    isPublished: true,
    supportedLanguages: Array.from(SUPPORTED_LANGUAGES),
    maxTestCases: 100,
    testCases: [],
    tagIds: [],
  });

  useEffect(() => {
    if (problemId) {
      loadProblem(problemId);
    }
  }, [problemId]);

  const loadProblem = async (id: string) => {
    try {
      const data = await problemsApi.findById(id);
      setFormData({
        title: data.title,
        description: data.description ?? '',
        statementMd: data.statementMd ?? '',
        difficulty: data.difficulty,
        mode: data.mode,
        timeLimitMs: data.timeLimitMs,
        memoryLimitMb: data.memoryLimitMb,
        isPublished: data.isPublished,
        supportedLanguages: data.supportedLanguages ?? Array.from(SUPPORTED_LANGUAGES),
        maxTestCases: data.maxTestCases,
        testCases: (data.testCases ?? []).map(
          ({ id, problemId, orderIndex, createdAt, updatedAt, ...rest }: any) => rest,
        ),
        tagIds: (data.tags ?? []).map((t: any) => t.tag.id),
      });
    } catch (error) {
      adminToast.errorFrom(error, 'Failed to load problem data.');
    } finally {
      setInitialLoading(false);
    }
  };

  const addTestCase = () => {
    setFormData({
      ...formData,
      testCases: [
        ...(formData.testCases || []),
        { input: '', expectedOutput: '', isHidden: false, weight: 1 },
      ],
    });
  };

  const removeTestCase = (index: number) => {
    setFormData({
      ...formData,
      testCases: (formData.testCases || []).filter((_, i) => i !== index),
    });
  };

  const updateTestCase = (index: number, field: string, value: any) => {
    const updatedTestCases = (formData.testCases || []).map((tc, i) =>
      i === index ? { ...tc, [field]: value } : tc,
    );
    setFormData({
      ...formData,
      testCases: updatedTestCases,
    });
  };

  const handleCalibrateLimits = async () => {
    if (!problemId) {
      adminToast.error('Save the problem first before calibrating limits.');
      return;
    }
    setCalibrating(true);
    setCalibrateResult(null);
    try {
      const result = await problemsApi.calibrateLimits(problemId);
      setCalibrateResult(result);
      adminToast.success('Measured limits from golden solution.');
    } catch (error: unknown) {
      adminToast.errorFrom(error, 'Calibration failed.');
    } finally {
      setCalibrating(false);
    }
  };

  const handleApplyCalibratedLimits = () => {
    if (!calibrateResult) return;
    setFormData({
      ...formData,
      timeLimitMs: calibrateResult.suggestedTimeLimitMs,
      memoryLimitMb: calibrateResult.suggestedMemoryLimitMb,
    });
    adminToast.success('Applied suggested limits to form — save to persist.');
  };

  const handleSave = async () => {
    if (!formData.title) {
      adminToast.error('Please enter a title.');
      return;
    }

    setLoading(true);
    try {
      if (problemId) {
        await problemsApi.update(problemId, formData as UpdateProblemDto);
        adminToast.success('Problem updated successfully.');
      } else {
        await problemsApi.create(formData as CreateProblemDto);
        adminToast.success('Problem created successfully.');
      }
      router.push('/admin/problems');
    } catch (error) {
      adminToast.errorFrom(error, 'Failed to save problem.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-medium">Loading problem details...</p>
      </div>
    );
  }

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
              {problemId ? 'Edit Problem' : 'New Problem'}
            </h1>
            <p className="text-muted-foreground">
              {problemId
                ? 'Update your coding challenge details'
                : 'Create a new challenge for the platform'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {problemId && <AdminExportReportButton kind="problem" problemId={problemId} />}
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 min-w-[140px]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {problemId ? 'Update' : 'Create'}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-border shadow-md overflow-hidden bg-card">
            <CardHeader className="bg-muted/10 border-b border-border">
              <CardTitle className="text-lg">Content</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold">
                  Title
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Problem name..."
                  className="h-11 rounded-lg border-border focus:ring-primary bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short summary..."
                  className="min-h-[80px] rounded-lg border-border focus:ring-primary bg-background resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="statementMd" className="text-sm font-semibold">
                  Statement (Markdown)
                </Label>
                <Textarea
                  id="statementMd"
                  value={formData.statementMd}
                  onChange={(e) => setFormData({ ...formData, statementMd: e.target.value })}
                  placeholder="Detailed instructions..."
                  className="min-h-[300px] rounded-lg border-border focus:ring-primary bg-background font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-md overflow-hidden bg-card">
            <CardHeader className="bg-muted/10 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Test Cases</CardTitle>
                <CardDescription>Configure validation tests</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTestCase}
                className="rounded-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <ProblemFormTestCasesScroll>
                <ProblemFormTestCaseList
                  variant="admin"
                  locale="en"
                  testCases={formData.testCases ?? []}
                  errors={{}}
                  onUpdate={updateTestCase}
                  onRemove={removeTestCase}
                  onClearError={() => {}}
                />
              </ProblemFormTestCasesScroll>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="border-border shadow-md overflow-hidden bg-card sticky top-24">
            <CardHeader className="bg-muted/10 border-b border-border">
              <CardTitle className="text-lg">Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value: any) => setFormData({ ...formData, difficulty: value })}
                  >
                    <SelectTrigger className="rounded-lg bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EASY">Easy</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HARD">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Time (ms)
                    </Label>
                    <Input
                      type="number"
                      value={formData.timeLimitMs}
                      onChange={(e) =>
                        setFormData({ ...formData, timeLimitMs: Number(e.target.value) })
                      }
                      className="rounded-lg font-bold bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <Database className="w-3 h-3" /> Mem (MB)
                    </Label>
                    <Input
                      type="number"
                      value={formData.memoryLimitMb}
                      onChange={(e) =>
                        setFormData({ ...formData, memoryLimitMb: Number(e.target.value) })
                      }
                      className="rounded-lg font-bold bg-background border-border"
                    />
                  </div>
                </div>

                {problemId && formData.mode === 'ALGO' && (
                  <div className="space-y-3 pt-2 border-t border-dashed border-border">
                    <p className="text-xs text-muted-foreground">
                      Run the primary golden on all test cases via Judge0 to suggest time/memory
                      limits.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full rounded-lg"
                      disabled={calibrating}
                      onClick={handleCalibrateLimits}
                    >
                      <Beaker className="w-4 h-4 mr-2" />
                      {calibrating ? 'Measuring…' : 'Measure limits (golden)'}
                    </Button>
                    {calibrateResult && (
                      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-xs">
                        <p>
                          Golden: <strong>{calibrateResult.goldenLanguage}</strong> — suggested{' '}
                          <strong>{calibrateResult.suggestedTimeLimitMs}ms</strong> /{' '}
                          <strong>{calibrateResult.suggestedMemoryLimitMb}MB</strong>
                        </p>
                        {!calibrateResult.memoryEnforced && (
                          <p className="text-amber-700">
                            Memory limit is informational until VPS uses cgroup v1 + isolate (see
                            docs/JUDGE0-CGROUP-V1-MIGRATION.md).
                          </p>
                        )}
                        <div className="max-h-28 overflow-y-auto space-y-1 font-mono text-[10px]">
                          {calibrateResult.cases.map((c) => (
                            <div key={c.testCaseId}>
                              #{c.orderIndex + 1}: {c.runtimeMs}ms, {c.memoryMb}MB ({c.verdict})
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="w-full"
                          onClick={handleApplyCalibratedLimits}
                        >
                          Apply suggested limits
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                 <div className="pt-4 border-t border-border flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Published</Label>
                    <p className="text-xs text-muted-foreground">Live status</p>
                  </div>
                  <Switch
                    checked={formData.isPublished}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isPublished: checked })
                    }
                  />
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                  <ProblemTagPicker
                    value={formData.tagIds || []}
                    onChange={(ids) => setFormData({ ...formData, tagIds: ids })}
                    label="Problem Tags"
                    hint="Select tags that match this problem type."
                    locale="en"
                  />
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Languages className="w-4 h-4 text-muted-foreground" /> Languages
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <Badge key={lang} variant="default" className="bg-black text-white">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
