'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Save,
  Trash2,
  Languages,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  CalibrateProblemLimitsResult,
  CreateProblemDto,
  problemsApi,
  UpdateProblemDto,
} from '@/services/problem.apis';
import type { GenerateTestCasesDraftResult } from '@/services/problem.apis';
import { ExportReportButton } from '@/components/dashboard/class-detail/export-report-button';
import { ApiRequestError } from '@/services/api-client';
import { toast } from 'sonner';
import { AiGenerateProblemModal } from '@/components/problems/AiGenerateProblemModal';
import { AiTestCaseAdvancedOptions } from '@/components/problems/AiTestCaseAdvancedOptions';
import { AiTestCaseDraftSheet } from '@/components/problems/AiTestCaseDraftSheet';
import { AiTestcaseDraftReopenButton } from '@/components/problems/AiTestcaseDraftReopenButton';
import {
  aiTestcaseDraftStorageScope,
  clearSavedAiTestcaseDraft,
  saveSavedAiTestcaseDraft,
  type SavedAiTestcaseDraft,
} from '@/lib/ai-testcase-draft-storage';
import { ProblemTagPicker } from '@/components/problems/ProblemTagPicker';
import {
  ProblemFormPageShell,
  ProblemFormTestCasesScroll,
} from '@/components/problems/ProblemFormPageShell';
import { ProblemFormTestCaseList } from '@/components/problems/ProblemFormTestCaseList';
import {
  AiGenOptionsState,
  buildGenerateTestCasesDraftDto,
  defaultAiGenOptions,
  extractSuggestedLimitsFromAiDraft,
  mapAiDraftToFormTestCases,
  normalizeAiDraftSheetCases,
  resolveAiDraftPreviewCases,
  type AiDraftSheetCase,
} from '@/components/problems/ai-testcase-draft.shared';

const SUPPORTED_LANGUAGES = [
  {
    name: 'PYTHON',
    bg: 'bg-black',
    text: 'text-white',
  },
  {
    name: 'JAVASCRIPT',
    bg: 'bg-yellow-400',
    text: 'text-black',
  },
  {
    name: 'CPP',
    bg: 'bg-blue-600',
    text: 'text-white',
  },
  {
    name: 'JAVA',
    bg: 'bg-orange-400',
    text: 'text-white',
  },
  {
    name: 'GO',
    bg: 'bg-sky-500',
    text: 'text-white',
  },
  {
    name: 'RUST',
    bg: 'bg-orange-200',
    text: 'text-black',
  },
] as const;

export default function ClassProblemCreate({ classId }: { classId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('edit');

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!editId);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrateResult, setCalibrateResult] = useState<CalibrateProblemLimitsResult | null>(
    null,
  );

  const [formData, setFormData] = useState<Omit<CreateProblemDto, 'classRoomId'>>({
    title: '',
    description: '',
    statementMd: '',
    difficulty: 'EASY',
    mode: 'ALGO',
    timeLimitMs: 1000,
    memoryLimitMb: 256,
    isPublished: true,
    visibility: 'PRIVATE',
    supportedLanguages: SUPPORTED_LANGUAGES.map((lang) => lang.name),
    maxTestCases: 100,
    testCases: [],
    dueAt: undefined,
    tagIds: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [aiProblemModalOpen, setAiProblemModalOpen] = useState(false);
  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiDraftResult, setAiDraftResult] = useState<GenerateTestCasesDraftResult | null>(null);
  /** Testcase đã chỉnh trong sheet (ưu tiên hơn aiDraftResult.parsed). */
  const [aiDraftPreviewCases, setAiDraftPreviewCases] = useState<AiDraftSheetCase[] | null>(null);
  const [aiGenOptions, setAiGenOptions] = useState<AiGenOptionsState>(defaultAiGenOptions);
  const [aiDraftStorageKey, setAiDraftStorageKey] = useState(0);

  const aiDraftScope = aiTestcaseDraftStorageScope(editId);

  useEffect(() => {
    if (editId) {
      loadProblem(editId);
    }
  }, [editId]);

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
        visibility: data.visibility,
        supportedLanguages: data.supportedLanguages ?? SUPPORTED_LANGUAGES.map((lang) => lang.name),
        maxTestCases: data.maxTestCases,
        testCases: (data.testCases ?? []).map(
          ({ id, problemId, orderIndex, createdAt, updatedAt, ...rest }: any) => rest,
        ),
        dueAt: data.assignments?.find((a) => a.classRoomId === classId)?.dueAt ?? undefined,
        tagIds: (data.tags ?? []).map((t: any) => t.tag.id),
      });
    } catch (error) {
      console.error('Failed to load problem:', error);
      const msg =
        error instanceof ApiRequestError ? error.body.message : 'Failed to load problem data.';
      toast.error(msg, { position: 'top-center' });
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

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description?.trim()) newErrors.description = 'Description is required';
    if (!formData.statementMd?.trim()) newErrors.statementMd = 'Statement is required';

    if (!formData.testCases || formData.testCases.length === 0) {
      newErrors.testCases = 'At least one test case is required';
    } else {
      formData.testCases.forEach((tc, index) => {
        const inputEmpty = !tc.input.trim();
        const outputEmpty = !tc.expectedOutput.trim();
        if (tc.isHidden && inputEmpty && outputEmpty) {
          newErrors[`testCase_${index}_hidden`] =
            'Hidden test case data was not loaded. Refresh the page or sign in again before saving.';
          return;
        }
        if (inputEmpty) newErrors[`testCase_${index}_input`] = 'Input is required';
        if (outputEmpty) newErrors[`testCase_${index}_output`] = 'Output is required';
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCalibrateLimits = async () => {
    if (!editId) {
      toast.error('Save the problem first before calibrating limits', { position: 'top-center' });
      return;
    }
    setCalibrating(true);
    setCalibrateResult(null);
    try {
      const result = await problemsApi.calibrateLimits(editId);
      setCalibrateResult(result);
      toast.success('Measured limits from golden solution', { position: 'top-center' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Calibration failed';
      toast.error(msg, { position: 'top-center' });
    } finally {
      setCalibrating(false);
    }
  };

  const handleApplyCalibratedLimits = () => {
    if (!calibrateResult) return;
    setFormData((prev) => ({
      ...prev,
      timeLimitMs: calibrateResult.suggestedTimeLimitMs,
      memoryLimitMb: calibrateResult.suggestedMemoryLimitMb,
    }));
    toast.success('Applied suggested limits to form — save to persist', { position: 'top-center' });
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Please fix the errors in the form.', { position: 'top-center' });
      return;
    }

    setLoading(true);
    try {
      // Sanitize test cases to remove properties the API doesn't expect
      const sanitizedTestCases = (formData.testCases || []).map(
        ({ id, problemId, orderIndex, createdAt, updatedAt, ...rest }: any) => rest,
      );

      const payload = {
        ...formData,
        testCases: sanitizedTestCases,
      };

      if (editId) {
        await problemsApi.update(editId, payload as UpdateProblemDto);
      } else {
        await problemsApi.create({
          ...payload,
          classRoomId: classId,
        } as CreateProblemDto);
      }
      router.push(`/dashboard/${classId}/classwork`);
      toast.success(editId ? 'Problem updated successfully!' : 'Problem created successfully!', {
        position: 'top-center',
      });
    } catch (error: unknown) {
      if (!(error instanceof ApiRequestError) || (error.status !== 400 && error.status !== 403)) {
        console.error('Failed to save problem:', error);
      }
      const msg =
        error instanceof ApiRequestError
          ? error.body.message
          : error instanceof Error
            ? error.message
            : 'Failed to save problem. Please check your inputs.';
      toast.error(msg, { position: 'top-center' });
    } finally {
      setLoading(false);
    }
  };

  const previewMappedCases = useMemo(
    () => resolveAiDraftPreviewCases(aiDraftPreviewCases, aiDraftResult),
    [aiDraftPreviewCases, aiDraftResult],
  );

  const persistAiDraftFromSheet = useCallback(
    (cases: AiDraftSheetCase[]) => {
      setAiDraftPreviewCases(cases);
      if (!aiDraftResult) return;
      const forStorage = normalizeAiDraftSheetCases(cases);
      const fallback = mapAiDraftToFormTestCases(aiDraftResult.parsed);
      saveSavedAiTestcaseDraft(aiDraftScope, {
        savedAt: new Date().toISOString(),
        problemTitle: formData.title.trim(),
        draftResult: aiDraftResult,
        previewCases: forStorage.length > 0 ? forStorage : fallback,
      });
      setAiDraftStorageKey((k) => k + 1);
    },
    [aiDraftResult, aiDraftScope, formData.title],
  );

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-medium">Loading problem data...</p>
      </div>
    );
  }

  function updateTestCase(index: number, field: string, value: any): void {
    setFormData((prev) => {
      const newTestCases = [...(prev.testCases || [])];
      if (newTestCases[index]) {
        newTestCases[index] = { ...newTestCases[index], [field]: value };
      }
      return { ...prev, testCases: newTestCases };
    });
  }

  const clearTestCaseFieldErrors = () => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next.testCases;
      for (const k of Object.keys(next)) {
        if (k.startsWith('testCase_')) delete next[k];
      }
      return next;
    });
  };

  const handleGenerateAiDraft = async () => {
    if (!formData.title.trim()) {
      toast.error('Enter a problem title before running AI.', { position: 'top-center' });
      return;
    }
    if (!formData.statementMd?.trim()) {
      toast.error('Enter the full statement (markdown) before running AI.', {
        position: 'top-center',
      });
      return;
    }
    const previousDraft = aiDraftResult;
    setAiDraftLoading(true);
    setAiDraftResult(null);
    setAiDraftPreviewCases(null);
    try {
      const dto = buildGenerateTestCasesDraftDto({
        title: formData.title.trim(),
        description: formData.description,
        statementMd: formData.statementMd ?? '',
        difficulty: formData.difficulty ?? 'EASY',
        timeLimitMs: formData.timeLimitMs,
        memoryLimitMb: formData.memoryLimitMb,
        supportedLanguages: formData.supportedLanguages,
        maxTestCasesForProblem: formData.maxTestCases ?? 100,
        aiGenOptions,
        previousDraft,
      });
      const res = await problemsApi.generateTestCasesDraft(dto);
      setAiDraftResult(res);
      setAiSheetOpen(true);
      const suggestedLimits = extractSuggestedLimitsFromAiDraft(res.parsed);
      if (
        suggestedLimits &&
        formData.timeLimitMs === 1000 &&
        formData.memoryLimitMb === 256
      ) {
        setFormData((prev) => ({
          ...prev,
          timeLimitMs: suggestedLimits.timeLimitMs,
          memoryLimitMb: suggestedLimits.memoryLimitMb,
        }));
        toast.info(
          `Applied AI limits: ${suggestedLimits.timeLimitMs}ms / ${suggestedLimits.memoryLimitMb}MB`,
          { position: 'top-center' },
        );
      }
      const mapped = mapAiDraftToFormTestCases(res.parsed);
      setAiDraftPreviewCases(mapped);
      if (mapped.length > 0 || res.raw) {
        saveSavedAiTestcaseDraft(aiDraftScope, {
          savedAt: new Date().toISOString(),
          problemTitle: formData.title.trim(),
          draftResult: res,
          previewCases: mapped,
        });
        setAiDraftStorageKey((k) => k + 1);
      }
      if (res.generationMode === 'summarized') {
        toast.info('Long statement — summarized on the server before generating test cases.', {
          position: 'top-center',
        });
      }
      if (res.parseError && mapped.length === 0) {
        toast.warning(
          res.truncationSuspected
            ? 'AI output was truncated. Try fewer suggested cases or fill ioSpec.'
            : 'AI responded but test cases could not be parsed. See the panel for details.',
          {
            position: 'top-center',
            description: res.parseError,
          },
        );
      } else if (mapped.length === 0) {
        toast.warning('No valid test cases in the AI response.', { position: 'top-center' });
      }
    } catch (error) {
      console.error(error);
      const msg =
        error instanceof ApiRequestError
          ? error.body.message
          : 'Could not reach AI. Check login and server configuration.';
      toast.error(msg, { position: 'top-center' });
    } finally {
      setAiDraftLoading(false);
    }
  };

  const applyAiTestCases = (mode: 'replace' | 'append', sheetCases: AiDraftSheetCase[]) => {
    const mapped = normalizeAiDraftSheetCases(sheetCases);
    if (mapped.length === 0) {
      toast.error('No test cases to apply.', { position: 'top-center' });
      return;
    }
    clearTestCaseFieldErrors();
    setFormData((prev) => ({
      ...prev,
      testCases: mode === 'replace' ? mapped : [...(prev.testCases ?? []), ...mapped],
    }));
    setAiSheetOpen(false);
    setAiDraftPreviewCases(null);
    clearSavedAiTestcaseDraft(aiDraftScope);
    setAiDraftStorageKey((k) => k + 1);
    toast.success(
      mode === 'replace'
        ? `Replaced with ${mapped.length} AI test case(s).`
        : `Appended ${mapped.length} AI test case(s).`,
      { position: 'top-center' },
    );
  };

  const restoreSavedAiDraft = (saved: SavedAiTestcaseDraft) => {
    setAiDraftResult(saved.draftResult);
    setAiDraftPreviewCases(saved.previewCases ?? []);
    setAiSheetOpen(true);
    if (
      saved.problemTitle &&
      formData.title.trim() &&
      saved.problemTitle !== formData.title.trim()
    ) {
      toast.info('Saved draft was for a different title — review before applying.', {
        position: 'top-center',
      });
    }
  };

  return (
    <ProblemFormPageShell variant="classroom">
      <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              {editId ? 'Edit Problem' : 'Create Problem'}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {editId
                ? 'Update the details of your existing problem.'
                : 'Design a new challenge for your students.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {editId && (
            <ExportReportButton
              kind="problem"
              classRoomId={classId}
              problemId={editId}
              variant="outline"
            />
          )}
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
            className="cursor-pointer border border-primary text-primary hover:text-primary hover:bg-primary/20"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="cursor-pointer bg-primary hover:bg-primary/80 text-white min-w-[120px]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {editId ? 'Update Problem' : 'Save Problem'}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border border-border shadow-lg bg-card overflow-clip">
            <CardHeader className="border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-xl">Basic Information</CardTitle>
              <Button
                type="button"
                size="sm"
                className="rounded-lg shrink-0 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setAiProblemModalOpen(true)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI generate problem
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold text-muted-foreground">
                  Problem Title
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (errors.title) setErrors({ ...errors, title: '' });
                  }}
                  placeholder="e.g. Find the Maximum Sum Subarray"
                  className={`text-lg font-medium h-12 rounded-xl border-border bg-background focus-visible:ring-primary/40 transition-all ${errors.title ? 'border-destructive bg-destructive/10' : ''}`}
                />
                {errors.title && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold text-muted-foreground">
                  Brief Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (errors.description) setErrors({ ...errors, description: '' });
                  }}
                  placeholder="A short summary of what the problem is about..."
                  className={`min-h-[80px] rounded-xl border-border bg-background focus-visible:ring-primary/40 transition-all resize-none ${errors.description ? 'border-destructive bg-destructive/10' : ''}`}
                />
                {errors.description && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="statementMd" className="text-sm font-semibold text-muted-foreground">
                  Full Problem Statement (Markdown)
                </Label>
                <Textarea
                  id="statementMd"
                  value={formData.statementMd}
                  onChange={(e) => {
                    setFormData({ ...formData, statementMd: e.target.value });
                    if (errors.statementMd) setErrors({ ...errors, statementMd: '' });
                  }}
                  placeholder="Describe the problem, input format, output format, and constraints in detail..."
                  className={`min-h-[300px] rounded-xl border-border bg-background focus-visible:ring-primary/40 transition-all font-mono text-sm leading-relaxed ${errors.statementMd ? 'border-destructive bg-destructive/10' : ''}`}
                />
                {errors.statementMd && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.statementMd}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-lg bg-card overflow-clip">
            <CardHeader className="border-b border-border flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-xl">Test Cases</CardTitle>
                <CardDescription className="text-sm">
                  Add cases manually or use AI from the title and statement. Review and edit in the
                  draft panel before applying — nothing is saved until you submit.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-lg cursor-pointer"
                  disabled={aiDraftLoading || loading}
                  aria-busy={aiDraftLoading}
                  onClick={() => void handleGenerateAiDraft()}
                >
                  {aiDraftLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Suggest with AI
                </Button>
                <AiTestcaseDraftReopenButton
                  scope={aiDraftScope}
                  locale="en"
                  disabled={aiDraftLoading || loading}
                  refreshKey={aiDraftStorageKey}
                  onRestore={restoreSavedAiDraft}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTestCase}
                  className="rounded-lg cursor-pointer border-primary text-primary hover:bg-muted hover:text-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Case
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <AiTestCaseAdvancedOptions
                aiGenOptions={aiGenOptions}
                setAiGenOptions={setAiGenOptions}
                maxTestCasesForProblem={formData.maxTestCases ?? 100}
                locale="en"
                idPrefix="class-"
                problemDescription={formData.description}
                problemStatementMd={formData.statementMd}
              />

              <ProblemFormTestCasesScroll>
                <ProblemFormTestCaseList
                  variant="classroom"
                  locale="en"
                  testCases={formData.testCases ?? []}
                  errors={errors}
                  onUpdate={updateTestCase}
                  onRemove={removeTestCase}
                  onClearError={(key) => {
                    setErrors((prev) => {
                      if (!prev[key]) return prev;
                      const next = { ...prev };
                      delete next[key];
                      return next;
                    });
                  }}
                />
              </ProblemFormTestCasesScroll>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Configuration */}
        <div className="space-y-8">
          <Card className="border border-border shadow-lg bg-card overflow-clip lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:custom-scrollbar">
            <CardHeader className="border-b">
              <CardTitle className="text-xl">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-muted-foreground">Difficulty</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, difficulty: value })
                      }
                    >
                      <SelectTrigger className="rounded-xl border-border h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EASY">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>Easy</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="MEDIUM">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span>Medium</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="HARD">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            <span>Hard</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-muted-foreground">Mode</Label>
                    <Select
                      value={formData.mode}
                      onValueChange={(value: any) => setFormData({ ...formData, mode: value })}
                    >
                      <SelectTrigger className="rounded-xl border-border h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALGO">Algorithmic</SelectItem>
                        <SelectItem value="PROJECT">Project Based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> TIME LIMIT (ms)
                    </Label>
                    <Input
                      type="number"
                      value={formData.timeLimitMs}
                      onChange={(e) =>
                        setFormData({ ...formData, timeLimitMs: Number(e.target.value) })
                      }
                      className="rounded-xl border-border h-10 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                      <Database className="w-3 h-3" /> MEMORY (MB)
                    </Label>
                    <Input
                      type="number"
                      value={formData.memoryLimitMb}
                      onChange={(e) =>
                        setFormData({ ...formData, memoryLimitMb: Number(e.target.value) })
                      }
                      className="rounded-xl border-border h-10 font-bold"
                    />
                  </div>
                </div>

                {editId && formData.mode === 'ALGO' && (
                  <div className="space-y-3 pt-2 border-t border-dashed border-border">
                    <p className="text-xs text-muted-foreground">
                      Run the primary golden on all test cases via Judge0 to suggest time/memory
                      limits.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl border-border"
                      disabled={calibrating}
                      onClick={handleCalibrateLimits}
                    >
                      <Beaker className="w-4 h-4 mr-2" />
                      {calibrating ? 'Measuring…' : 'Measure limits (golden)'}
                    </Button>
                    {calibrateResult && (
                      <div className="rounded-xl border border-border bg-slate-800/50 p-3 space-y-2 text-xs text-muted-foreground">
                        <p>
                          Golden: <strong>{calibrateResult.goldenLanguage}</strong> — suggested{' '}
                          <strong>{calibrateResult.suggestedTimeLimitMs}ms</strong> /{' '}
                          <strong>{calibrateResult.suggestedMemoryLimitMb}MB</strong>
                        </p>
                        {!calibrateResult.memoryEnforced && (
                          <p className="text-amber-400">
                            Memory limit is informational until VPS uses cgroup v1 + isolate.
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

                <div className="bg-primary/20 border border-primary/60 rounded-lg p-3 mt-4">
                  <p className="text-xs text-primary">
                    <strong>ℹ️ Class Problems Are Private:</strong> Problems created in this class
                    are automatically kept private to this class only. They won't appear in the
                    public problem bank.
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4 border-t pt-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold text-muted-foreground">
                      For Contest Only
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Hide this problem from students in the normal assignments list. It will only
                      be accessible within contests.
                    </p>
                  </div>
                  <Switch
                    checked={formData.visibility === 'CONTEST_ONLY'}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        visibility: checked ? 'CONTEST_ONLY' : 'PRIVATE',
                      })
                    }
                  />
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <ProblemTagPicker
                    value={formData.tagIds || []}
                    onChange={(ids) => setFormData({ ...formData, tagIds: ids })}
                    label="Problem Tags"
                    hint="Select tags that match this problem type."
                    locale="en"
                  />
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Languages className="w-4 h-4 text-muted-foreground" /> Supported Languages
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <Badge
                        key={lang.name}
                        variant="default"
                        className={`${lang.bg} ${lang.text} rounded-sm py-3`}
                      >
                        {lang.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AiGenerateProblemModal
        open={aiProblemModalOpen}
        onOpenChange={setAiProblemModalOpen}
        locale="en"
        existingTitle={formData.title}
        existingStatement={formData.statementMd}
        defaultDifficulty={formData.difficulty}
        onApply={(payload) => {
          setFormData((prev) => ({
            ...prev,
            title: payload.title,
            description: payload.description,
            statementMd: payload.statementMd,
            ...(payload.difficulty ? { difficulty: payload.difficulty } : {}),
            ...(payload.timeLimitMs ? { timeLimitMs: payload.timeLimitMs } : {}),
            ...(payload.memoryLimitMb ? { memoryLimitMb: payload.memoryLimitMb } : {}),
          }));
          setAiGenOptions((prev) => ({ ...prev, ioSpec: payload.ioSpec }));
          setErrors((prev) => {
            const next = { ...prev };
            delete next.title;
            delete next.description;
            delete next.statementMd;
            return next;
          });
        }}
      />

      <AiTestCaseDraftSheet
        open={aiSheetOpen}
        onOpenChange={setAiSheetOpen}
        draftResult={aiDraftResult}
        previewCases={previewMappedCases}
        onApplyReplace={(cases) => applyAiTestCases('replace', cases)}
        onApplyAppend={(cases) => applyAiTestCases('append', cases)}
        onPersistEditableCases={persistAiDraftFromSheet}
        onApplySuggestedLimits={(limits) => {
          setFormData((prev) => ({
            ...prev,
            timeLimitMs: limits.timeLimitMs,
            memoryLimitMb: limits.memoryLimitMb,
          }));
          toast.success('Limits applied to form', { position: 'top-center' });
        }}
        problemId={editId ?? undefined}
        problemTitle={formData.title}
        problemStatement={formData.statementMd}
        ioSpec={aiGenOptions.ioSpec}
        locale="en"
      />
      </div>
    </ProblemFormPageShell>
  );
}
