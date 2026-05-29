'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
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
  CreateAdminProblemDto,
  problemsApi,
  UpdateProblemDto,
  type GenerateTestCasesDraftResult,
} from '@/services/problem.apis';
import { adminToast } from '@/lib/admin-toast';
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
  defaultAiGenOptions,
  mapAiDraftToFormTestCases,
  normalizeAiDraftSheetCases,
  resolveAiDraftPreviewCases,
  type AiDraftSheetCase,
  buildGenerateTestCasesDraftDto,
  extractSuggestedLimitsFromAiDraft,
  type AiGenOptionsState,
} from '@/components/problems/ai-testcase-draft.shared';

const SUPPORTED_LANGUAGES = ['PYTHON', 'JAVASCRIPT', 'CPP', 'JAVA', 'GO', 'RUST'] as const;

type AdminProblemFormValues = CreateAdminProblemDto & { dueAt?: string };

export default function AdminProblemCreate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('edit');

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!editId);

  const [formData, setFormData] = useState<AdminProblemFormValues>({
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
    dueAt: undefined,
    tagIds: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [aiProblemModalOpen, setAiProblemModalOpen] = useState(false);
  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiDraftResult, setAiDraftResult] = useState<GenerateTestCasesDraftResult | null>(null);
  const [aiDraftPreviewCases, setAiDraftPreviewCases] = useState<AiDraftSheetCase[] | null>(null);
  const [aiGenOptions, setAiGenOptions] = useState<AiGenOptionsState>(defaultAiGenOptions);
  const [aiDraftStorageKey, setAiDraftStorageKey] = useState(0);

  const aiDraftScope = aiTestcaseDraftStorageScope(editId);

  useEffect(() => {
    if (editId) {
      loadProblem(editId);
    } else {
      setInitialLoading(false);
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
        supportedLanguages: data.supportedLanguages ?? Array.from(SUPPORTED_LANGUAGES),
        maxTestCases: data.maxTestCases,
        testCases: (data.testCases ?? []).map(
          ({ id, problemId, orderIndex, createdAt, updatedAt, ...rest }: any) => rest,
        ),
        dueAt: data.assignments?.[0]?.dueAt ?? undefined,
        tagIds: (data.tags ?? []).map((t: any) => t.tag.id),
      });
    } catch (error) {
      adminToast.errorFrom(error, 'Failed to load problem.');
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

    if (!formData.title.trim()) newErrors.title = 'Please enter a title';
    if (!formData.description?.trim()) newErrors.description = 'Please enter a short description';
    if (!formData.statementMd?.trim())
      newErrors.statementMd = 'Please enter the problem statement (markdown)';

    if (!formData.testCases || formData.testCases.length === 0) {
      newErrors.testCases = 'At least one test case is required';
    } else {
      formData.testCases.forEach((tc, index) => {
        if (!tc.input.trim()) newErrors[`testCase_${index}_input`] = 'Input is required';
        if (!tc.expectedOutput.trim())
          newErrors[`testCase_${index}_output`] = 'Expected output is required';
      });
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
        const { dueAt: _due, ...forAdmin } = payload;
        await problemsApi.createAdmin(forAdmin as CreateAdminProblemDto);
      }
      adminToast.success(
        editId ? 'Problem updated successfully.' : 'Problem created successfully.',
      );
      router.push('/admin/problems');
    } catch (error) {
      adminToast.errorFrom(error, 'Failed to save problem. Please check your data or try again later.');
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
      <div
        className="flex flex-col items-center justify-center py-20 space-y-4"
        role="status"
        aria-busy="true"
        aria-label="Loading problem data"
      >
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
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
      adminToast.error('Please enter a title for the problem before calling AI.');
      return;
    }
    if (!formData.statementMd?.trim()) {
      adminToast.error('Please enter the problem statement (markdown) before calling AI.');
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
        adminToast.info(
          `Applied AI limits: ${suggestedLimits.timeLimitMs}ms / ${suggestedLimits.memoryLimitMb}MB`,
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
        adminToast.info('Long statement — server summarized it before generating test cases.');
      }
      if (res.parseError && mapped.length === 0) {
        adminToast.warning(
          res.truncationSuspected
            ? 'AI output was truncated. Try fewer suggested cases or fill ioSpec.'
            : 'AI returned a response but failed to parse the test cases. See the panel for details.',
          { description: res.parseError },
        );
      } else if (mapped.length === 0) {
        adminToast.warning('No valid test cases found in the AI response.');
      }
    } catch (error) {
      adminToast.errorFrom(error, 'Failed to call AI. Please check your login and server configuration.');
    } finally {
      setAiDraftLoading(false);
    }
  };

  const applyAiTestCases = (mode: 'replace' | 'append', sheetCases: AiDraftSheetCase[]) => {
    const mapped = normalizeAiDraftSheetCases(sheetCases);
    if (mapped.length === 0) {
      adminToast.error('No test cases available to apply.');
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
    adminToast.success(
      mode === 'replace'
        ? `Successfully replaced with ${mapped.length} test cases from AI.`
        : `Successfully added ${mapped.length} test cases from AI.`,
      {},
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
      adminToast.info(
        'Bản AI được lưu cho tiêu đề khác — vẫn xem được, hãy kiểm tra lại trước khi áp dụng.',
      );
    }
  };

  return (
    <ProblemFormPageShell variant="admin">
      <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <Button variant="outline" size="sm" className="w-fit cursor-pointer" asChild>
            <Link href="/admin/problems">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {editId ? 'Admin — Edit Problem' : 'Admin — Create Problem'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {editId
                ? 'Update the problem and test cases. Submission deadline (if any) will be synchronized with the current class assignment.'
                : 'Create a problem in the repository (only saves the problem, does not create an assignment for a class).'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/problems')}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="cursor-pointer bg-black hover:bg-gray-800 text-white min-w-[120px]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {editId ? 'Update' : 'Save'}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border border-border shadow-sm bg-card overflow-clip">
            <CardHeader className="border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-xl">Basic Information</CardTitle>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-lg shrink-0"
                onClick={() => setAiProblemModalOpen(true)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Generate Problem
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold">
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
                  className={`text-lg font-medium h-12 rounded-xl border-border bg-background focus-visible:ring-ring transition-all ${errors.title ? 'border-destructive bg-destructive/10' : ''}`}
                />
                {errors.title && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">
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
                  className={`min-h-[80px] rounded-xl border-border bg-background focus-visible:ring-ring transition-all resize-none ${errors.description ? 'border-destructive bg-destructive/10' : ''}`}
                />
                {errors.description && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="statementMd" className="text-sm font-semibold">
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
                  className={`min-h-[300px] rounded-xl border-border bg-background focus-visible:ring-ring transition-all font-mono text-sm leading-relaxed ${errors.statementMd ? 'border-destructive bg-destructive/10' : ''}`}
                />
                {errors.statementMd && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.statementMd}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm bg-card overflow-clip">
            <CardHeader className="border-b flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-xl">Test Cases</CardTitle>
                <CardDescription>
                  Thêm tay hoặc dùng AI từ tiêu đề và đề bài. Chỉnh trong panel nháp rồi mới áp
                  dụng — chưa lưu DB cho đến khi bấm Lưu.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
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
                  AI Suggestions
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
                  className="rounded-lg cursor-pointer"
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
                idPrefix="admin-"
                problemDescription={formData.description}
                problemStatementMd={formData.statementMd}
              />

              <ProblemFormTestCasesScroll>
                <ProblemFormTestCaseList
                  variant="admin"
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
          <Card className="border border-border shadow-sm bg-card overflow-clip lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:custom-scrollbar">
            <CardHeader className="border-b">
              <CardTitle className="text-xl">Configuration</CardTitle>
              <CardDescription className="text-xs text-muted-foreground pt-1">
                Create problem without assigning to a class (no need for{' '}
                <span className="font-mono">classRoomId</span>
                ). To make the problem appear in the public problem bank, please enable Published.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Difficulty</Label>
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
                    <Label className="text-sm font-semibold">Mode</Label>
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

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold">Status</Label>
                      <p className="text-xs text-muted-foreground">Publish to students</p>
                    </div>
                    <Switch
                      checked={formData.isPublished}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isPublished: checked })
                      }
                      className="cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <ProblemTagPicker
                    value={formData.tagIds || []}
                    onChange={(ids) => setFormData({ ...formData, tagIds: ids })}
                    label="Từ khóa (Tags)"
                    hint="Choose relevant tags for this problem."
                    locale="en"
                  />
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Languages className="w-4 h-4 text-muted-foreground" /> Supported Languages
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
          adminToast.info(
            'Problem draft applied. Use AI Suggestions below to generate test cases.',
          );
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
          adminToast.success('Limits applied to form');
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
