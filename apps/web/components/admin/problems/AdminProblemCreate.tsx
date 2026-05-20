'use client';

import { useState, useEffect } from 'react';
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
  Globe,
  Lock,
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
import { ApiRequestError } from '@/services/api-client';
import { toast } from 'sonner';
import { AiTestCaseAdvancedOptions } from '@/components/problems/AiTestCaseAdvancedOptions';
import { AiTestCaseDraftSheet } from '@/components/problems/AiTestCaseDraftSheet';
import { ProblemTagPicker } from '@/components/problems/ProblemTagPicker';
import {
  defaultAiGenOptions,
  mapAiDraftToFormTestCases,
  buildGenerateTestCasesDraftDto,
  type AiGenOptionsState,
} from '@/components/problems/ai-testcase-draft.shared';

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
    supportedLanguages: ['PYTHON', 'JAVASCRIPT', 'CPP', 'JAVA'],
    maxTestCases: 100,
    testCases: [],
    dueAt: undefined,
    tagIds: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiDraftResult, setAiDraftResult] = useState<GenerateTestCasesDraftResult | null>(null);
  const [aiGenOptions, setAiGenOptions] = useState<AiGenOptionsState>(defaultAiGenOptions);

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
        supportedLanguages: data.supportedLanguages ?? ['PYTHON', 'JAVASCRIPT', 'CPP', 'JAVA'],
        maxTestCases: data.maxTestCases,
        testCases: (data.testCases ?? []).map(
          ({ id, problemId, orderIndex, createdAt, updatedAt, ...rest }: any) => rest,
        ),
        dueAt: data.assignments?.[0]?.dueAt ?? undefined,
        tagIds: (data.tags ?? []).map((t: any) => t.tag.id),
      });
    } catch (error) {
      console.error('Failed to load problem:', error);
      const msg = error instanceof ApiRequestError ? error.body.message : 'Failed to load problem.';
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
        const { dueAt: _due, ...forAdmin } = payload;
        await problemsApi.createAdmin(forAdmin as CreateAdminProblemDto);
      }
      toast.success(editId ? 'Problem updated successfully.' : 'Problem created successfully.', {
        position: 'top-center',
      });
      router.push('/admin/problems');
    } catch (error) {
      console.error('Failed to save problem:', error);
      const msg =
        error instanceof ApiRequestError
          ? error.body.message
          : 'Failed to save problem. Please check your data or try again later.';
      toast.error(msg, { position: 'top-center' });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 space-y-4"
        role="status"
        aria-busy="true"
        aria-label="Loading problem data"
      >
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Loading problem data...</p>
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

  const previewMappedCases = aiDraftResult ? mapAiDraftToFormTestCases(aiDraftResult.parsed) : [];

  const handleGenerateAiDraft = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title for the problem before calling AI.', {
        position: 'top-center',
      });
      return;
    }
    if (!formData.statementMd?.trim()) {
      toast.error('Please enter the problem statement (markdown) before calling AI.', {
        position: 'top-center',
      });
      return;
    }
    const previousDraft = aiDraftResult;
    setAiDraftLoading(true);
    setAiDraftResult(null);
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
      const mapped = mapAiDraftToFormTestCases(res.parsed);
      if (res.parseError && mapped.length === 0) {
        toast.warning(
          'AI returned a response but failed to parse the test cases. Please check the details in the panel.',
          {
            position: 'top-center',
          },
        );
      } else if (mapped.length === 0) {
        toast.warning('No valid test cases found in the AI response.', { position: 'top-center' });
      }
    } catch (error) {
      console.error(error);
      const msg =
        error instanceof ApiRequestError
          ? error.body.message
          : 'Failed to call AI. Please check your login and server configuration.';
      toast.error(msg, { position: 'top-center' });
    } finally {
      setAiDraftLoading(false);
    }
  };

  const applyAiTestCases = (mode: 'replace' | 'append') => {
    if (!aiDraftResult) return;
    const mapped = mapAiDraftToFormTestCases(aiDraftResult.parsed);
    if (mapped.length === 0) {
      toast.error('No test cases available to apply.', { position: 'top-center' });
      return;
    }
    clearTestCaseFieldErrors();
    setFormData((prev) => ({
      ...prev,
      testCases: mode === 'replace' ? mapped : [...(prev.testCases ?? []), ...mapped],
    }));
    setAiSheetOpen(false);
    toast.success(
      mode === 'replace'
        ? `Successfully replaced with ${mapped.length} test cases from AI.`
        : `Successfully added ${mapped.length} test cases from AI.`,
      { position: 'top-center' },
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
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
          <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b ">
              <CardTitle className="text-xl">Basic Information</CardTitle>
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
                  className={`text-lg font-medium h-12 rounded-xl border-gray-200 focus:border-black transition-all ${errors.title ? 'border-red-500 bg-red-50' : ''}`}
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
                  className={`min-h-[80px] rounded-xl border-gray-200 focus:border-black transition-all resize-none ${errors.description ? 'border-red-500 bg-red-50' : ''}`}
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
                  className={`min-h-[300px] rounded-xl border-gray-200 focus:border-black transition-all font-mono text-sm leading-relaxed ${errors.statementMd ? 'border-red-500 bg-red-50' : ''}`}
                />
                {errors.statementMd && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.statementMd}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-xl">Test Cases</CardTitle>
                <CardDescription>
                  Add manually or use AI to generate draft test cases from the title and problem
                  statement (always preview before applying).
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
                locale="vi"
                idPrefix="admin-"
              />

              <div className="space-y-4">
                {errors.testCases && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> {errors.testCases}
                  </div>
                )}
                {formData.testCases?.length === 0 ? (
                  <div
                    className={`flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-2xl bg-gray-50/50 text-gray-400 ${errors.testCases ? 'border-red-300' : ''}`}
                  >
                    <Beaker className="w-12 h-12 mb-3 opacity-20" />
                    <p className="font-medium">No test cases added yet.</p>
                    <p className="text-sm">Click "Add Case" to begin defining tests.</p>
                  </div>
                ) : (
                  formData.testCases?.map((tc, index) => (
                    <div
                      key={index}
                      className="group relative border border-gray-100 rounded-2xl p-5 bg-gray-50/30 hover:bg-white hover:shadow-lg hover:border-black/5 transition-all duration-300"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                            Input
                          </Label>
                          <Textarea
                            value={tc.input}
                            onChange={(e) => {
                              updateTestCase(index, 'input', e.target.value);
                              if (errors[`testCase_${index}_input`]) {
                                const next = { ...errors };
                                delete next[`testCase_${index}_input`];
                                setErrors(next);
                              }
                            }}
                            placeholder="Input for this case"
                            className={`min-h-[100px] rounded-xl border-gray-200 focus:border-black bg-white font-mono text-xs ${errors[`testCase_${index}_input`] ? 'border-red-500 bg-red-50' : ''}`}
                          />
                          {errors[`testCase_${index}_input`] && (
                            <p className="text-[10px] text-red-500 font-medium">
                              {errors[`testCase_${index}_input`]}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                            Expected Output
                          </Label>
                          <Textarea
                            value={tc.expectedOutput}
                            onChange={(e) => {
                              updateTestCase(index, 'expectedOutput', e.target.value);
                              if (errors[`testCase_${index}_output`]) {
                                const next = { ...errors };
                                delete next[`testCase_${index}_output`];
                                setErrors(next);
                              }
                            }}
                            placeholder="Expected output"
                            className={`min-h-[100px] rounded-xl border-gray-200 focus:border-black bg-white font-mono text-xs ${errors[`testCase_${index}_output`] ? 'border-red-500 bg-red-50' : ''}`}
                          />
                          {errors[`testCase_${index}_output`] && (
                            <p className="text-[10px] text-red-500 font-medium">
                              {errors[`testCase_${index}_output`]}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`hidden-${index}`}
                              checked={tc.isHidden}
                              onCheckedChange={(checked) =>
                                updateTestCase(index, 'isHidden', checked)
                              }
                              className="cursor-pointer"
                            />
                            <Label
                              htmlFor={`hidden-${index}`}
                              className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
                            >
                              {tc.isHidden ? (
                                <Lock className="w-3.5 h-3.5 text-amber-500" />
                              ) : (
                                <Globe className="w-3.5 h-3.5 text-blue-500" />
                              )}
                              {tc.isHidden ? 'Hidden Case' : 'Public Case'}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium text-gray-500">Weight:</Label>
                            <Input
                              type="number"
                              value={tc.weight}
                              onChange={(e) =>
                                updateTestCase(index, 'weight', Number(e.target.value))
                              }
                              className="w-16 h-8 rounded-lg border-gray-200 text-center font-bold"
                              min="1"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTestCase(index)}
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg h-8 px-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Configuration */}
        <div className="space-y-8">
          <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden sticky top-24">
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
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value: any) => setFormData({ ...formData, difficulty: value })}
                  >
                    <SelectTrigger className="rounded-xl border-gray-200 h-10">
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
                    <SelectTrigger className="rounded-xl border-gray-200 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALGO">Algorithmic</SelectItem>
                      <SelectItem value="PROJECT">Project Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> TIME LIMIT (ms)
                    </Label>
                    <Input
                      type="number"
                      value={formData.timeLimitMs}
                      onChange={(e) =>
                        setFormData({ ...formData, timeLimitMs: Number(e.target.value) })
                      }
                      className="rounded-xl border-gray-200 h-10 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                      <Database className="w-3 h-3" /> MEMORY (MB)
                    </Label>
                    <Input
                      type="number"
                      value={formData.memoryLimitMb}
                      onChange={(e) =>
                        setFormData({ ...formData, memoryLimitMb: Number(e.target.value) })
                      }
                      className="rounded-xl border-gray-200 h-10 font-bold"
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
                    locale="vi"
                  />
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Languages className="w-4 h-4 text-gray-400" /> Supported Languages
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {['PYTHON', 'JAVASCRIPT', 'CPP', 'JAVA', 'GO', 'RUST'].map((lang) => {
                      const isSelected = formData.supportedLanguages?.includes(lang);
                      return (
                        <Badge
                          key={lang}
                          variant={isSelected ? 'default' : 'outline'}
                          className={`cursor-pointer transition-all hover:scale-105 active:scale-95 ${isSelected ? 'bg-black' : 'text-gray-400'}`}
                          onClick={() => {
                            const current = formData.supportedLanguages || [];
                            const next = isSelected
                              ? current.filter((l) => l !== lang)
                              : [...current, lang];
                            setFormData({ ...formData, supportedLanguages: next });
                          }}
                        >
                          {lang}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AiTestCaseDraftSheet
        open={aiSheetOpen}
        onOpenChange={setAiSheetOpen}
        draftResult={aiDraftResult}
        previewCases={previewMappedCases}
        onApplyReplace={() => applyAiTestCases('replace')}
        onApplyAppend={() => applyAiTestCases('append')}
        problemId={editId ?? undefined}
        locale="vi"
      />
    </div>
  );
}
