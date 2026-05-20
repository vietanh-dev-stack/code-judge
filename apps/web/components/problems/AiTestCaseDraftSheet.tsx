'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAuthStore } from '@/store/auth-store';
import { uploadGoldenSolutionForProblem } from '@/lib/golden-upload';
import { readSourceFileAsUtf8Text } from '@/lib/read-source-file';
import { aiTestcaseApi, type VerifyTestcasesWithGoldenResult } from '@/services/ai-testcase.apis';
import { goldenSolutionsApi } from '@/services/golden-solutions.apis';
import { ApiRequestError } from '@/services/api-client';
import type { GenerateTestCasesDraftResult } from '@/services/problem.apis';
import { toast } from 'sonner';

type Locale = 'vi' | 'en';

type PreviewCase = {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  weight: number;
};

type GoldenCopy = {
  goldenTitle: string;
  goldenHint: string;
  languageLabel: string;
  storedUsesDbLang: string;
  saveFirstHint: string;
  inlineLabel: string;
  inlineFileLabel: string;
  inlineFileHint: string;
  uploadLabel: string;
  uploadButton: string;
  uploadReady: string;
  storedFromServer: string;
  syncPreview: string;
  verifyButton: string;
  verifyWorkerHint: string;
  modeInline: string;
  modeStored: string;
  addCase: string;
  remove: string;
  caseN: (n: number) => string;
  noCasesForVerify: string;
  needGolden: string;
};

const GOLDEN_LANG_OPTIONS = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
] as const;

const GOLDEN_COPY: Record<Locale, GoldenCopy> = {
  vi: {
    goldenTitle: 'Kiểm tra bằng golden',
    goldenHint:
      'Chạy lời giải chuẩn trên từng test (stdin/stdout). Cần worker golden-verify và Redis. Python có thể chạy local không cần Lambda; Java/C++/JS/Go/Rust cần Lambda judge (JUDGE_LAMBDA_FUNCTION_NAME).',
    languageLabel: 'Ngôn ngữ golden',
    storedUsesDbLang:
      'Chế độ golden trên server: ngôn ngữ lấy từ bản ghi đã upload (không phụ thuộc ô chọn bên trên).',
    saveFirstHint:
      'Chưa có problemId: lưu bài một lần để upload file golden lên MinIO. Hoặc (ADMIN) dán mã golden bên dưới và verify không cần lưu trước.',
    inlineLabel: 'Mã golden',
    inlineFileLabel: 'Tải file mã (tuỳ chọn)',
    inlineFileHint: 'Chọn .py, .java, .cpp, … — nội dung sẽ điền vào ô bên dưới để verify (không lưu MinIO).',
    uploadLabel: 'File golden',
    uploadButton: 'Upload golden',
    uploadReady: 'Đã upload & xác nhận golden.',
    storedFromServer: 'Đã có golden trên server cho bài này.',
    syncPreview: 'Đồng bộ test từ preview',
    verifyButton: 'Chạy golden & kiểm tra',
    verifyWorkerHint:
      'Nếu lỗi timeout/service: kiểm tra worker đang chạy và queue golden-verify.',
    modeInline: 'Dán mã',
    modeStored: 'Golden đã upload / trên server',
    addCase: 'Thêm test',
    remove: 'Xóa',
    caseN: (n) => `Test #${n}`,
    noCasesForVerify: 'Cần ít nhất một test có input và expected không rỗng.',
    needGolden: 'Chọn mã inline, tải file vào ô mã, hoặc upload golden / golden trên server.',
  },
  en: {
    goldenTitle: 'Verify with golden solution',
    goldenHint:
      'Runs reference code per case (stdin/stdout). Requires golden-verify worker and Redis. Python can run locally without Lambda; Java/C++/JS/Go/Rust need the judge Lambda (JUDGE_LAMBDA_FUNCTION_NAME).',
    languageLabel: 'Golden language',
    storedUsesDbLang:
      'Server golden mode: language comes from the uploaded record (not the selector above).',
    saveFirstHint:
      'No problemId yet: save once to upload a golden file. Or (ADMIN) paste golden code below and verify without saving first.',
    inlineLabel: 'Golden source',
    inlineFileLabel: 'Load code from file (optional)',
    inlineFileHint:
      'Pick .py, .java, .cpp, … — contents fill the box below for verify (not stored on MinIO).',
    uploadLabel: 'Golden file',
    uploadButton: 'Upload golden',
    uploadReady: 'Golden uploaded and confirmed.',
    storedFromServer: 'A golden solution already exists on the server for this problem.',
    syncPreview: 'Sync tests from preview',
    verifyButton: 'Run golden & verify',
    verifyWorkerHint: 'If you see service errors, ensure the worker is running (golden-verify queue).',
    modeInline: 'Paste code',
    modeStored: 'Uploaded / server golden',
    addCase: 'Add test',
    remove: 'Remove',
    caseN: (n) => `Test #${n}`,
    noCasesForVerify: 'Need at least one test with non-empty input and expected output.',
    needGolden: 'Paste code, load a file into the editor, or use uploaded / server golden.',
  },
};

const COPY: Record<
  Locale,
  {
    title: string;
    description: string;
    model: string;
    provider: string;
    prompt: string;
    parseTitle: string;
    notesTitle: string;
    revNotesTitle: string;
    emptyFiltered: string;
    preview: (n: number) => string;
    emptyInput: string;
    input: string;
    output: string;
    noData: string;
    close: string;
    append: string;
    replace: string;
  }
> = {
  vi: {
    title: 'Test case từ AI (bản nháp)',
    description:
      'Kiểm tra input/output trước khi ghi vào form. Có thể chỉnh sửa lại sau khi áp dụng.',
    model: 'Model:',
    provider: 'Provider:',
    prompt: 'Prompt:',
    parseTitle: 'Parse',
    notesTitle: 'Ghi chú AI',
    revNotesTitle: 'Ghi chú revision',
    emptyFiltered:
      'Không có test case nào sau khi lọc. Thử bổ sung đề bài rõ hơn hoặc chỉnh ioSpec ở bản sau.',
    preview: (n) => `Xem trước (${n} case)`,
    emptyInput: '(trống)',
    input: 'Input',
    output: 'Output',
    noData: 'Chưa có dữ liệu.',
    close: 'Đóng',
    append: 'Thêm vào cuối',
    replace: 'Thay thế toàn bộ',
  },
  en: {
    title: 'AI test cases (draft)',
    description: 'Review input/output before merging into the form. You can edit after applying.',
    model: 'Model:',
    provider: 'Provider:',
    prompt: 'Prompt:',
    parseTitle: 'Parse',
    notesTitle: 'AI notes',
    revNotesTitle: 'Revision notes',
    emptyFiltered:
      'No test cases after filtering. Try a clearer statement or adjust ioSpec and generate again.',
    preview: (n) => `Preview (${n} cases)`,
    emptyInput: '(empty)',
    input: 'Input',
    output: 'Output',
    noData: 'No data yet.',
    close: 'Close',
    append: 'Append to end',
    replace: 'Replace all',
  },
};

function previewCasesFingerprint(cases: PreviewCase[]): string {
  return JSON.stringify(
    cases.map((c) => ({ i: c.input, o: c.expectedOutput, h: c.isHidden, w: c.weight })),
  );
}

export function AiTestCaseDraftSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftResult: GenerateTestCasesDraftResult | null;
  previewCases: PreviewCase[];
  onApplyReplace: () => void;
  onApplyAppend: () => void;
  /** Khi đã lưu problem — cho upload golden và quyền verify inline (creator). */
  problemId?: string;
  locale?: Locale;
}) {
  const {
    open,
    onOpenChange,
    draftResult,
    previewCases,
    onApplyReplace,
    onApplyAppend,
    problemId,
    locale = 'vi',
  } = props;
  const t = COPY[locale];
  const g = GOLDEN_COPY[locale];

  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [editableCases, setEditableCases] = useState<Array<{ input: string; expectedOutput: string }>>([]);
  const [goldenMode, setGoldenMode] = useState<'inline' | 'stored'>('inline');
  const [goldenInline, setGoldenInline] = useState('');
  const [goldenLanguage, setGoldenLanguage] = useState<(typeof GOLDEN_LANG_OPTIONS)[number]['value']>('python');
  const [uploadBusy, setUploadBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyTestcasesWithGoldenResult | null>(null);
  /** Session upload OK in this sheet */
  const [sessionUploadOk, setSessionUploadOk] = useState(false);
  /** Listed goldens with object key on server */
  const [serverGoldenReady, setServerGoldenReady] = useState(false);

  const previewKey = useMemo(() => previewCasesFingerprint(previewCases), [previewCases]);

  const syncFromPreview = useCallback(() => {
    setEditableCases(
      previewCases.map((c) => ({
        input: c.input,
        expectedOutput: c.expectedOutput,
      })),
    );
  }, [previewCases]);

  useEffect(() => {
    if (!open) return;
    syncFromPreview();
    setVerifyResult(null);
  }, [open, previewKey, syncFromPreview]);

  useEffect(() => {
    if (!open || !problemId) {
      setServerGoldenReady(false);
      return;
    }
    let cancelled = false;
    goldenSolutionsApi
      .listForProblem(problemId)
      .then((list) => {
        if (cancelled) return;
        const ready = list.some((row) => Boolean(row.sourceCodeObjectKey));
        setServerGoldenReady(ready);
      })
      .catch(() => {
        if (!cancelled) setServerGoldenReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, problemId]);

  useEffect(() => {
    if (!open) {
      setSessionUploadOk(false);
      setGoldenInline('');
      setGoldenMode('inline');
    }
  }, [open]);

  useEffect(() => {
    setSessionUploadOk(false);
  }, [problemId]);

  useEffect(() => {
    setSessionUploadOk(false);
    setVerifyResult(null);
  }, [goldenLanguage]);

  const canShowInline = isAdmin || Boolean(problemId);
  const canUploadFile = Boolean(problemId);
  const storedGoldenUsable = sessionUploadOk || serverGoldenReady;

  const filteredCasesForVerify = editableCases.filter(
    (c) => c.input.trim() !== '' && c.expectedOutput.trim() !== '',
  );

  const canRunVerify =
    filteredCasesForVerify.length > 0 &&
    ((goldenMode === 'inline' && goldenInline.trim() !== '' && canShowInline) ||
      (goldenMode === 'stored' && storedGoldenUsable && Boolean(problemId)));

  const handleUploadGolden = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !problemId) return;
    setUploadBusy(true);
    try {
      await uploadGoldenSolutionForProblem({
        problemId,
        file,
        language: goldenLanguage,
        isPrimary: true,
      });
      setSessionUploadOk(true);
      setGoldenMode('stored');
      setServerGoldenReady(true);
      toast.success(locale === 'vi' ? 'Đã upload golden.' : 'Golden uploaded.', { position: 'top-center' });
    } catch (err) {
      const msg =
        err instanceof ApiRequestError ? err.body.message : err instanceof Error ? err.message : String(err);
      toast.error(msg, { position: 'top-center' });
    } finally {
      setUploadBusy(false);
    }
  };

  const handleGoldenInlineFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await readSourceFileAsUtf8Text(file);
      setGoldenInline(text);
      toast.success(locale === 'vi' ? `Đã nạp: ${file.name}` : `Loaded: ${file.name}`, {
        position: 'top-center',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg, { position: 'top-center' });
    }
  };

  const handleVerify = async () => {
    if (!canRunVerify) {
      toast.error(filteredCasesForVerify.length === 0 ? g.noCasesForVerify : g.needGolden, {
        position: 'top-center',
      });
      return;
    }
    setVerifyBusy(true);
    setVerifyResult(null);
    try {
      const body: Parameters<typeof aiTestcaseApi.verifyTestcasesWithGolden>[0] = {
        testCases: filteredCasesForVerify.map((c) => ({
          input: c.input.trimEnd(),
          expectedOutput: c.expectedOutput.trimEnd(),
        })),
      };
      if (goldenMode === 'inline') {
        body.language = goldenLanguage;
        body.goldenSourceCode = goldenInline.trim();
        if (problemId) body.problemId = problemId;
      } else if (problemId) {
        body.problemId = problemId;
      }
      const res = await aiTestcaseApi.verifyTestcasesWithGolden(body);
      setVerifyResult(res);
      if (res.summary.failed > 0) {
        toast.warning(
          locale === 'vi'
            ? `${res.summary.passed}/${res.summary.total} đúng`
            : `${res.summary.passed}/${res.summary.total} passed`,
          { position: 'top-center', description: g.verifyWorkerHint },
        );
      } else {
        toast.success(
          locale === 'vi'
            ? `Tất cả ${res.summary.total} test khớp golden.`
            : `All ${res.summary.total} tests match golden.`,
          { position: 'top-center' },
        );
      }
    } catch (err) {
      const msg =
        err instanceof ApiRequestError ? err.body.message : err instanceof Error ? err.message : String(err);
      toast.error(msg, { position: 'top-center', description: g.verifyWorkerHint });
    } finally {
      setVerifyBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col gap-0 p-0 h-full max-h-dvh"
      >
        <SheetHeader className="border-b shrink-0 text-left px-4 py-3 pr-12">
          <SheetTitle>{t.title}</SheetTitle>
          <SheetDescription>{t.description}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4">
          {draftResult ? (
            <>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium text-foreground">{t.model}</span> {draftResult.model}{' '}
                  · <span className="font-medium text-foreground">{t.provider}</span>{' '}
                  {draftResult.provider}
                </p>
                <p>
                  <span className="font-medium text-foreground">{t.prompt}</span>{' '}
                  {draftResult.promptVersion}
                </p>
              </div>

              {draftResult.parseError ? (
                <div
                  role="alert"
                  className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
                >
                  <p className="font-medium">{t.parseTitle}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words">{draftResult.parseError}</p>
                </div>
              ) : null}

              {draftResult.parsed?.notes ? (
                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                  <p className="font-medium text-foreground mb-1">{t.notesTitle}</p>
                  <p className="whitespace-pre-wrap break-words text-muted-foreground">
                    {draftResult.parsed.notes}
                  </p>
                </div>
              ) : null}

              {draftResult.parsed?.revisionNotes ? (
                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                  <p className="font-medium text-foreground mb-1">{t.revNotesTitle}</p>
                  <p className="whitespace-pre-wrap break-words text-muted-foreground">
                    {draftResult.parsed.revisionNotes}
                  </p>
                </div>
              ) : null}

              {previewCases.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.emptyFiltered}</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium">{t.preview(previewCases.length)}</p>
                  {previewCases.map((tc, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">#{i + 1}</span>
                        <span className="text-muted-foreground">
                          {tc.isHidden ? 'Hidden' : 'Public'} · weight {tc.weight}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground mb-0.5">{t.input}</p>
                        <pre className="font-mono whitespace-pre-wrap break-words bg-muted/50 rounded p-2 max-h-28 overflow-y-auto">
                          {tc.input || t.emptyInput}
                        </pre>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground mb-0.5">{t.output}</p>
                        <pre className="font-mono whitespace-pre-wrap break-words bg-muted/50 rounded p-2 max-h-28 overflow-y-auto">
                          {tc.expectedOutput || t.emptyInput}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!problemId && !isAdmin ? (
                <p className="text-xs text-muted-foreground border-t pt-3">{g.saveFirstHint}</p>
              ) : null}

              {previewCases.length > 0 ? (
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <h3 className="text-sm font-semibold">{g.goldenTitle}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{g.goldenHint}</p>
                  </div>

                  <div className="grid gap-2 md:max-w-xs">
                    <Label className="text-xs">{g.languageLabel}</Label>
                    <Select
                      value={goldenLanguage}
                      onValueChange={(v) => {
                        if (GOLDEN_LANG_OPTIONS.some((o) => o.value === v)) {
                          setGoldenLanguage(v as (typeof GOLDEN_LANG_OPTIONS)[number]['value']);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOLDEN_LANG_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {goldenMode === 'stored' && problemId ? (
                    <p className="text-xs text-muted-foreground">{g.storedUsesDbLang}</p>
                  ) : null}

                  {!problemId && isAdmin ? (
                    <p className="text-xs text-amber-700 dark:text-amber-200 bg-amber-500/10 rounded-md px-2 py-1.5">
                      {g.saveFirstHint}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={goldenMode === 'inline' ? 'default' : 'outline'}
                      onClick={() => setGoldenMode('inline')}
                      disabled={!canShowInline}
                    >
                      {g.modeInline}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={goldenMode === 'stored' ? 'default' : 'outline'}
                      onClick={() => setGoldenMode('stored')}
                      disabled={!problemId}
                    >
                      {g.modeStored}
                    </Button>
                  </div>

                  {goldenMode === 'inline' && canShowInline ? (
                    <div className="grid gap-2">
                      <Label className="text-xs">{g.inlineLabel}</Label>
                      <div className="grid gap-1.5">
                        <Label className="text-[10px] font-normal text-muted-foreground">
                          {g.inlineFileLabel}
                        </Label>
                        <p className="text-[10px] text-muted-foreground leading-snug">{g.inlineFileHint}</p>
                        <Input
                          type="file"
                          accept=".py,.js,.mjs,.ts,.tsx,.jsx,.java,.cpp,.cc,.cxx,.c,.h,.go,.rs,.kt,.cs,text/plain,application/octet-stream"
                          className="max-w-sm cursor-pointer text-xs"
                          onChange={handleGoldenInlineFile}
                        />
                      </div>
                      <Textarea
                        value={goldenInline}
                        onChange={(e) => setGoldenInline(e.target.value)}
                        className="min-h-[120px] font-mono text-xs"
                        spellCheck={false}
                      />
                    </div>
                  ) : goldenMode === 'inline' && !canShowInline ? (
                    <p className="text-xs text-muted-foreground">{g.saveFirstHint}</p>
                  ) : null}

                  {goldenMode === 'stored' && problemId ? (
                    <div className="space-y-2">
                      {(sessionUploadOk || serverGoldenReady) && (
                        <p className="text-xs text-green-700 dark:text-green-300">
                          {sessionUploadOk ? g.uploadReady : g.storedFromServer}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <Label className="text-xs shrink-0">{g.uploadLabel}</Label>
                        <Input
                          type="file"
                          accept=".py,.js,.mjs,.ts,.java,.cpp,.cc,.cxx,.c,.go,.rs,text/plain,application/octet-stream"
                          className="max-w-[220px] text-xs"
                          disabled={uploadBusy || !canUploadFile}
                          onChange={handleUploadGolden}
                        />
                        {uploadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      </div>
                    </div>
                  ) : goldenMode === 'stored' && !problemId ? (
                    <p className="text-xs text-muted-foreground">{g.saveFirstHint}</p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={syncFromPreview}>
                      {g.syncPreview}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditableCases((prev) => [...prev, { input: '', expectedOutput: '' }])}>
                      {g.addCase}
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-[min(40vh,360px)] overflow-y-auto pr-1">
                    {editableCases.map((tc, i) => (
                      <div key={i} className="rounded-lg border bg-muted/20 p-2 space-y-2">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">{g.caseN(i + 1)}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive"
                            onClick={() => setEditableCases((prev) => prev.filter((_, j) => j !== i))}
                          >
                            {g.remove}
                          </Button>
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-[10px] text-muted-foreground">{t.input}</Label>
                          <Textarea
                            value={tc.input}
                            onChange={(e) =>
                              setEditableCases((prev) =>
                                prev.map((row, j) => (j === i ? { ...row, input: e.target.value } : row)),
                              )
                            }
                            className="min-h-[56px] font-mono text-[11px]"
                            spellCheck={false}
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-[10px] text-muted-foreground">{t.output}</Label>
                          <Textarea
                            value={tc.expectedOutput}
                            onChange={(e) =>
                              setEditableCases((prev) =>
                                prev.map((row, j) =>
                                  j === i ? { ...row, expectedOutput: e.target.value } : row,
                                ),
                              )
                            }
                            className="min-h-[56px] font-mono text-[11px]"
                            spellCheck={false}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button type="button" disabled={verifyBusy || !canRunVerify} onClick={handleVerify}>
                    {verifyBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {g.verifyButton}
                  </Button>

                  {verifyResult ? (
                    <div className="space-y-2 rounded-lg border p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {locale === 'vi' ? 'Kết quả' : 'Result'}
                        </span>
                        <Badge variant={verifyResult.summary.failed === 0 ? 'default' : 'destructive'}>
                          {verifyResult.summary.passed}/{verifyResult.summary.total} OK
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({verifyResult.goldenSource}
                          {verifyResult.goldenSolutionId ? ` · id=${verifyResult.goldenSolutionId.slice(0, 8)}…` : ''})
                        </span>
                      </div>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto">
                        {verifyResult.results.map((r) => (
                          <div
                            key={r.index}
                            className={`rounded border p-2 text-xs ${
                              r.passed
                                ? 'border-green-600/30 bg-green-500/5'
                                : 'border-destructive/30 bg-destructive/5'
                            }`}
                          >
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className="font-medium">#{r.index + 1}</span>
                              <Badge variant={r.passed ? 'secondary' : 'destructive'}>{r.verdict}</Badge>
                            </div>
                            {!r.passed && r.expectedOutput ? (
                              <div className="mt-1 space-y-0.5">
                                <p className="text-[10px] font-medium text-muted-foreground">Expected</p>
                                <pre className="max-h-16 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
                                  {r.expectedOutput}
                                </pre>
                              </div>
                            ) : null}
                            {r.actualOutput !== undefined && r.actualOutput !== '' ? (
                              <div className="mt-1 space-y-0.5">
                                <p className="text-[10px] font-medium text-muted-foreground">
                                  {locale === 'vi' ? 'Actual (stdout)' : 'Actual (stdout)'}
                                </p>
                                <pre className="max-h-20 overflow-auto whitespace-pre-wrap font-mono text-[11px]">
                                  {r.actualOutput}
                                </pre>
                              </div>
                            ) : r.actualOutput === '' && !r.passed ? (
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {locale === 'vi' ? '(Không có stdout)' : '(No stdout)'}
                              </p>
                            ) : null}
                            {r.stderr ? (
                              <pre className="mt-1 text-destructive whitespace-pre-wrap font-mono">{r.stderr}</pre>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t.noData}</p>
          )}
        </div>

        <SheetFooter className="border-t shrink-0 flex-col sm:flex-row gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t.close}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={previewCases.length === 0}
            onClick={onApplyAppend}
          >
            {t.append}
          </Button>
          <Button type="button" disabled={previewCases.length === 0} onClick={onApplyReplace}>
            {t.replace}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
