'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
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
import {
  aiTestcaseApi,
  type GoldenVerifyFailureDiagnosis,
  type VerifyTestcasesWithGoldenResult,
} from '@/services/ai-testcase.apis';
import { GoldenVerifyDiagnosisModal } from '@/components/problems/GoldenVerifyDiagnosisModal';
import {
  loadSavedGoldenVerifyDiagnosis,
  saveSavedGoldenVerifyDiagnosis,
  type SavedGoldenVerifyDiagnosis,
} from '@/lib/golden-verify-diagnosis-storage';
import { goldenSolutionsApi } from '@/services/golden-solutions.apis';
import { ApiRequestError } from '@/services/api-client';
import type { GenerateTestCasesDraftResult } from '@/services/problem.apis';
import { toast } from 'sonner';
import { isLikelyPlaceholderIoClient, type AiDraftSheetCase } from './ai-testcase-draft.shared';

type Locale = 'vi' | 'en';

type GoldenCopy = {
  goldenTitle: string;
  goldenHint: string;
  languageLabel: string;
  storedUsesDbLang: string;
  saveFirstHint: string;
  draftVerifyBanner: string;
  storedNeedsProblemId: string;
  inlineLabel: string;
  inlineFileLabel: string;
  inlineFileHint: string;
  uploadLabel: string;
  uploadButton: string;
  uploadReady: string;
  storedFromServer: string;
  restoreFromAi: string;
  restoreFromAiHint: string;
  editableSectionTitle: string;
  aiOriginalSectionTitle: string;
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
      'Chưa lưu bài: dán mã golden bên dưới để verify ngay. Upload golden lên MinIO cần lưu bài một lần (có problemId).',
    draftVerifyBanner:
      'Verify nháp: test từ AI (chưa lưu đề) được gửi thẳng lên server — không cần problemId. Chỉnh test bên dưới, dán golden, rồi «Chạy golden & kiểm tra». Muốn bỏ hết chỉnh sửa → «Khôi phục bản AI gốc».',
    storedNeedsProblemId:
      'Chế độ golden trên server cần lưu bài trước — dùng "Dán mã" để verify khi đang tạo mới.',
    inlineLabel: 'Mã golden',
    inlineFileLabel: 'Tải file mã (tuỳ chọn)',
    inlineFileHint:
      'Chọn .py, .java, .cpp, … — nội dung sẽ điền vào ô bên dưới để verify (không lưu MinIO).',
    uploadLabel: 'File golden',
    uploadButton: 'Upload golden',
    uploadReady: 'Đã upload & xác nhận golden.',
    storedFromServer: 'Đã có golden trên server cho bài này.',
    restoreFromAi: 'Khôi phục bản AI gốc',
    restoreFromAiHint: 'Ghi đè danh sách đang sửa bằng testcase AI sinh ra ban đầu (mất chỉnh sửa tay).',
    editableSectionTitle: 'Test case đang chỉnh (áp dụng vào form)',
    aiOriginalSectionTitle: 'Bản gốc từ AI (chỉ xem)',
    verifyButton: 'Chạy golden & kiểm tra',
    verifyWorkerHint: 'Nếu lỗi timeout/service: kiểm tra worker đang chạy và queue golden-verify.',
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
      'Problem not saved yet: paste golden code below to verify now. Uploading golden to the server requires saving the problem first.',
    draftVerifyBanner:
      'Draft verify: AI-generated tests (problem not saved yet) are sent directly to the API — no problemId. Edit tests below, paste golden code, then run verify. To discard edits → «Restore AI original».',
    storedNeedsProblemId:
      'Server golden mode requires a saved problem — use "Paste code" while creating a new problem.',
    inlineLabel: 'Golden source',
    inlineFileLabel: 'Load code from file (optional)',
    inlineFileHint:
      'Pick .py, .java, .cpp, … — contents fill the box below for verify (not stored on MinIO).',
    uploadLabel: 'Golden file',
    uploadButton: 'Upload golden',
    uploadReady: 'Golden uploaded and confirmed.',
    storedFromServer: 'A golden solution already exists on the server for this problem.',
    restoreFromAi: 'Restore AI original',
    restoreFromAiHint: 'Overwrite your edits with the first AI-generated test list (discards manual changes).',
    editableSectionTitle: 'Tests you are editing (applied to form)',
    aiOriginalSectionTitle: 'AI original (read-only)',
    verifyButton: 'Run golden & verify',
    verifyWorkerHint:
      'If you see service errors, ensure the worker is running (golden-verify queue).',
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
    truncHint: string;
    placeholderHint: string;
    expandIo: string;
    collapseIo: string;
    ioChars: (n: number, lines: number) => string;
    genModeSummarized: string;
    genModeDirect: string;
    showRaw: string;
    hideRaw: string;
    notesTitle: string;
    revNotesTitle: string;
    emptyFiltered: string;
    aiOriginalSectionTitle: (n: number) => string;
    emptyInput: string;
    input: string;
    output: string;
    noData: string;
    close: string;
    append: string;
    replace: string;
    limitsTitle: string;
    limitsHint: string;
    applyLimits: string;
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
    truncHint:
      'Phản hồi AI có thể bị cắt (thiếu token). Thử giảm số testcase gợi ý, điền ioSpec, hoặc rút gọn đề bài.',
    placeholderHint:
      'Một số test có input/output dạng "..." — không chạy được. Bật «Sinh đủ dữ liệu I/O» trong tùy chọn AI và sinh lại, hoặc dán đủ lưới/ma trận tay.',
    expandIo: 'Mở rộng',
    collapseIo: 'Thu gọn',
    ioChars: (n, lines) => `${n.toLocaleString('vi-VN')} ký tự · ${lines} dòng`,
    genModeSummarized: 'Chế độ: tóm tắt đề dài rồi sinh testcase',
    genModeDirect: 'Chế độ: đề ngắn — sinh trực tiếp',
    showRaw: 'Xem raw JSON',
    hideRaw: 'Ẩn raw',
    notesTitle: 'Ghi chú AI',
    revNotesTitle: 'Ghi chú revision',
    emptyFiltered:
      'Không có test case nào sau khi lọc. Thử bổ sung đề bài rõ hơn hoặc chỉnh ioSpec ở bản sau.',
    aiOriginalSectionTitle: (n) => `Bản gốc từ AI — ${n} test (chỉ xem)`,
    emptyInput: '(trống)',
    input: 'Input',
    output: 'Output',
    noData: 'Chưa có dữ liệu.',
    close: 'Đóng',
    append: 'Thêm vào cuối',
    replace: 'Thay thế toàn bộ',
    limitsTitle: 'Gợi ý time / memory (AI)',
    limitsHint:
      'Dựa trên ràng buộc đề và testcase. Sau khi có golden, dùng «Measure limits (golden)» trên form để đo chính xác hơn.',
    applyLimits: 'Áp dụng limit vào form',
  },
  en: {
    title: 'AI test cases (draft)',
    description: 'Review input/output before merging into the form. You can edit after applying.',
    model: 'Model:',
    provider: 'Provider:',
    prompt: 'Prompt:',
    parseTitle: 'Parse',
    truncHint:
      'AI output may be truncated. Try fewer suggested cases, fill ioSpec, or shorten the statement.',
    placeholderHint:
      'Some tests use "..." placeholders — not runnable. Enable «Generate full I/O» in AI options and regenerate, or paste full grid data manually.',
    expandIo: 'Expand',
    collapseIo: 'Collapse',
    ioChars: (n, lines) => `${n.toLocaleString()} chars · ${lines} lines`,
    genModeSummarized: 'Mode: summarized long statement, then generated tests',
    genModeDirect: 'Mode: direct generation',
    showRaw: 'Show raw JSON',
    hideRaw: 'Hide raw',
    notesTitle: 'AI notes',
    revNotesTitle: 'Revision notes',
    emptyFiltered:
      'No test cases after filtering. Try a clearer statement or adjust ioSpec and generate again.',
    aiOriginalSectionTitle: (n) => `AI original — ${n} test(s) (read-only)`,
    emptyInput: '(empty)',
    input: 'Input',
    output: 'Output',
    noData: 'No data yet.',
    close: 'Close',
    append: 'Append to end',
    replace: 'Replace all',
    limitsTitle: 'Suggested time / memory (AI)',
    limitsHint:
      'Based on constraints and test cases. After golden exists, use «Measure limits (golden)» on the form for precise values.',
    applyLimits: 'Apply limits to form',
  },
};

function previewCasesFingerprint(cases: AiDraftSheetCase[]): string {
  return JSON.stringify(
    cases.map((c) => ({ i: c.input, o: c.expectedOutput, h: c.isHidden, w: c.weight })),
  );
}

function TestCaseIoBlock(props: {
  label: string;
  value: string;
  emptyLabel: string;
  expandLabel: string;
  collapseLabel: string;
  metaLabel: (chars: number, lines: number) => string;
  suspectPlaceholder?: boolean;
}) {
  const { label, value, emptyLabel, expandLabel, collapseLabel, metaLabel, suspectPlaceholder } =
    props;
  const [expanded, setExpanded] = useState(false);
  const text = value || '';
  const lines = text ? text.split('\n').length : 0;
  const large = text.length > 480 || lines > 14;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-0.5">
        <p className="font-medium text-muted-foreground">{label}</p>
        {text ? (
          <span className="text-[10px] text-muted-foreground">{metaLabel(text.length, lines)}</span>
        ) : null}
        {suspectPlaceholder ? (
          <Badge
            variant="outline"
            className="text-[10px] border-amber-500/50 text-amber-800 dark:text-amber-200"
          >
            placeholder
          </Badge>
        ) : null}
        {large ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] ml-auto"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? collapseLabel : expandLabel}
          </Button>
        ) : null}
      </div>
      <pre
        className={`font-mono whitespace-pre-wrap break-words bg-muted/50 rounded p-2 overflow-y-auto ${
          expanded ? 'max-h-[min(50vh,420px)]' : 'max-h-28'
        }`}
      >
        {text || emptyLabel}
      </pre>
    </div>
  );
}

export function AiTestCaseDraftSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftResult: GenerateTestCasesDraftResult | null;
  previewCases: AiDraftSheetCase[];
  onApplyReplace: (cases: AiDraftSheetCase[]) => void;
  onApplyAppend: (cases: AiDraftSheetCase[]) => void;
  /** Gọi khi đóng sheet — lưu chỉnh sửa testcase vào parent / sessionStorage. */
  onPersistEditableCases?: (cases: AiDraftSheetCase[]) => void;
  onApplySuggestedLimits?: (limits: { timeLimitMs: number; memoryLimitMb: number }) => void;
  /** Khi đã lưu problem — cho upload golden và quyền verify inline (creator). */
  problemId?: string;
  problemTitle?: string;
  problemStatement?: string;
  ioSpec?: string;
  locale?: Locale;
}) {
  const {
    open,
    onOpenChange,
    draftResult,
    previewCases,
    onApplyReplace,
    onApplyAppend,
    onPersistEditableCases,
    onApplySuggestedLimits,
    problemId,
    problemTitle,
    problemStatement,
    ioSpec,
    locale = 'en',
  } = props;
  const t = COPY[locale];
  const g = GOLDEN_COPY[locale];

  const user = useAuthStore((s) => s.user);

  const [editableCases, setEditableCases] = useState<AiDraftSheetCase[]>([]);
  const [goldenMode, setGoldenMode] = useState<'inline' | 'stored'>('inline');
  const [goldenInline, setGoldenInline] = useState('');
  const [goldenLanguage, setGoldenLanguage] =
    useState<(typeof GOLDEN_LANG_OPTIONS)[number]['value']>('python');
  const [uploadBusy, setUploadBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyTestcasesWithGoldenResult | null>(null);
  const [diagnoseBusy, setDiagnoseBusy] = useState(false);
  const [diagnosisModalOpen, setDiagnosisModalOpen] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [lastSavedDiagnosis, setLastSavedDiagnosis] = useState<SavedGoldenVerifyDiagnosis | null>(
    null,
  );

  const diagnosisStorageScope = problemId ?? 'draft';
  /** Session upload OK in this sheet */
  const [sessionUploadOk, setSessionUploadOk] = useState(false);
  /** Listed goldens with object key on server */
  const [serverGoldenReady, setServerGoldenReady] = useState(false);

  const previewKey = useMemo(() => previewCasesFingerprint(previewCases), [previewCases]);
  const lastSyncedPreviewKeyRef = useRef<string | null>(null);
  const editableCasesRef = useRef(editableCases);
  editableCasesRef.current = editableCases;

  const loadAiOriginalIntoEditable = useCallback(() => {
    setEditableCases(previewCases.map((c) => ({ ...c })));
  }, [previewCases]);

  const handleRestoreFromAi = useCallback(() => {
    loadAiOriginalIntoEditable();
    toast.message(
      locale === 'vi'
        ? 'Đã khôi phục testcase từ bản AI gốc.'
        : 'Restored tests from the original AI output.',
      { position: 'top-center' },
    );
  }, [loadAiOriginalIntoEditable, locale]);

  const casesReadyToApply = useMemo(
    () =>
      editableCases.filter(
        (c) => c.input.trim().length > 0 || c.expectedOutput.trim().length > 0,
      ),
    [editableCases],
  );

  useEffect(() => {
    if (lastSyncedPreviewKeyRef.current !== previewKey) {
      loadAiOriginalIntoEditable();
      lastSyncedPreviewKeyRef.current = previewKey;
    }
  }, [previewKey, loadAiOriginalIntoEditable]);

  useEffect(() => {
    if (!open) return;
    setVerifyResult(null);
    setLastSavedDiagnosis(loadSavedGoldenVerifyDiagnosis(diagnosisStorageScope));
    if (!problemId) {
      setGoldenMode('inline');
    }
  }, [open, problemId, diagnosisStorageScope]);

  useEffect(() => {
    if (open) return;
    onPersistEditableCases?.(editableCasesRef.current);
  }, [open, onPersistEditableCases]);

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
    if (!open) return;
    setLastSavedDiagnosis(loadSavedGoldenVerifyDiagnosis(diagnosisStorageScope));
  }, [open, diagnosisStorageScope]);

  useEffect(() => {
    setSessionUploadOk(false);
    setVerifyResult(null);
  }, [goldenLanguage]);

  /** Dán mã golden: mọi user đã đăng nhập (khớp API verify nháp). */
  const canShowInline = Boolean(user);
  const canUploadFile = Boolean(problemId);
  const storedGoldenUsable = sessionUploadOk || serverGoldenReady;

  const filteredCasesForVerify = editableCases.filter(
    (c) => c.input.trim() !== '' && c.expectedOutput.trim() !== '',
  );

  const verifyIndexToEditableIndex = useMemo(
    () =>
      editableCases
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => c.input.trim() !== '' && c.expectedOutput.trim() !== '')
        .map(({ i }) => i),
    [editableCases],
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
      toast.success(locale === 'vi' ? 'Đã upload golden.' : 'Golden uploaded.', {
        position: 'top-center',
      });
    } catch (err) {
      const msg =
        err instanceof ApiRequestError
          ? err.body.message
          : err instanceof Error
            ? err.message
            : String(err);
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
        const infraFail = res.results.some(
          (r) =>
            !r.passed &&
            (r.verdict === 'RUNTIME_ERROR' || r.verdict === 'PYTHON_NOT_FOUND') &&
            (r.stderr?.includes('Lambda') ||
              r.stderr?.includes('Worker không có Lambda') ||
              r.stderr?.includes('Không tìm thấy Python')),
        );
        toast.warning(
          locale === 'vi'
            ? `${res.summary.passed}/${res.summary.total} đúng — xem chi tiết từng test bên dưới`
            : `${res.summary.passed}/${res.summary.total} passed — see per-test details below`,
          {
            position: 'top-center',
            description: infraFail ? g.verifyWorkerHint : undefined,
          },
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
        err instanceof ApiRequestError
          ? err.body.message
          : err instanceof Error
            ? err.message
            : String(err);
      toast.error(msg, { position: 'top-center', description: g.verifyWorkerHint });
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleAnalyzeFailures = async () => {
    if (!verifyResult || verifyResult.summary.failed === 0) return;
    setDiagnoseBusy(true);
    setDiagnosisModalOpen(true);
    try {
      const res = await aiTestcaseApi.analyzeGoldenVerifyFailures({
        problemId,
        title: problemTitle?.trim() || undefined,
        statement: problemStatement?.trim() || undefined,
        ioSpec: ioSpec?.trim() || undefined,
        language: verifyResult.language,
        testCases: filteredCasesForVerify.map((c) => ({
          input: c.input.trimEnd(),
          expectedOutput: c.expectedOutput.trimEnd(),
        })),
        verifyResult,
      });
      const saved: SavedGoldenVerifyDiagnosis = {
        savedAt: new Date().toISOString(),
        verifySummary: { ...verifyResult.summary },
        language: verifyResult.language,
        diagnosis: res,
      };
      setLastSavedDiagnosis(saved);
      saveSavedGoldenVerifyDiagnosis(diagnosisStorageScope, saved);
      if (!res.structured) {
        toast.warning(
          locale === 'vi'
            ? 'AI trả về nhưng parse JSON thất bại.'
            : 'AI responded but JSON parse failed.',
          { position: 'top-center', description: res.parseError },
        );
      }
    } catch (err) {
      const msg =
        err instanceof ApiRequestError
          ? err.body.message
          : err instanceof Error
            ? err.message
            : String(err);
      toast.error(msg, { position: 'top-center' });
    } finally {
      setDiagnoseBusy(false);
    }
  };

  const applySuggestionAtVerifyIndex = (
    verifyIndex: number,
    fix: { input?: string; expectedOutput?: string } | undefined,
  ) => {
    if (!fix) return;
    const editableIndex = verifyIndexToEditableIndex[verifyIndex];
    if (editableIndex === undefined) return;
    setEditableCases((prev) =>
      prev.map((row, j) =>
        j === editableIndex
          ? {
              ...row,
              input: fix.input !== undefined ? fix.input : row.input,
              expectedOutput:
                fix.expectedOutput !== undefined ? fix.expectedOutput : row.expectedOutput,
            }
          : row,
      ),
    );
    toast.success(
      locale === 'vi'
        ? `Đã áp dụng gợi ý test #${verifyIndex + 1}`
        : `Applied suggestion for test #${verifyIndex + 1}`,
      {
        position: 'top-center',
      },
    );
  };

  const applyAllSuggestions = (structured: GoldenVerifyFailureDiagnosis) => {
    let count = 0;
    setEditableCases((prev) => {
      const next = [...prev];
      for (const d of structured.caseDiagnoses) {
        if (!d.suggestedFix) continue;
        const editableIndex = verifyIndexToEditableIndex[d.index];
        if (editableIndex === undefined) continue;
        const row = next[editableIndex]!;
        next[editableIndex] = {
          ...row,
          input: d.suggestedFix.input !== undefined ? d.suggestedFix.input : row.input,
          expectedOutput:
            d.suggestedFix.expectedOutput !== undefined
              ? d.suggestedFix.expectedOutput
              : row.expectedOutput,
        };
        count++;
      }
      return next;
    });
    if (count === 0) {
      toast.info(locale === 'vi' ? 'Không có gợi ý để áp dụng.' : 'No suggestions to apply.', {
        position: 'top-center',
      });
    } else {
      toast.success(
        locale === 'vi' ? `Đã áp dụng ${count} gợi ý` : `Applied ${count} suggestion(s)`,
        { position: 'top-center' },
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col gap-0 p-0 h-full max-h-dvh"
      >
        <SheetHeader className="border-b shrink-0 text-left px-4 py-3 pr-12">
          <SheetTitle className="text-primary">{t.title}</SheetTitle>
          <SheetDescription>{t.description}</SheetDescription>
        </SheetHeader>

        <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-4">
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
                {draftResult.statementCharCount !== undefined ? (
                  <p>
                    {locale === 'vi' ? 'Độ dài đề' : 'Statement length'}:{' '}
                    {draftResult.statementCharCount.toLocaleString()}
                    {draftResult.maxTokensUsed ? ` · maxTokens≈${draftResult.maxTokensUsed}` : ''}
                  </p>
                ) : null}
                {draftResult.generationMode ? (
                  <p>
                    {draftResult.generationMode === 'summarized'
                      ? t.genModeSummarized
                      : t.genModeDirect}
                  </p>
                ) : null}
              </div>

              {draftResult.truncationSuspected && draftResult.parseError ? (
                <p className="text-xs text-amber-800 dark:text-amber-200">{t.truncHint}</p>
              ) : null}

              {draftResult.placeholderWarnings?.length ? (
                <div
                  role="alert"
                  className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100 space-y-1"
                >
                  {draftResult.placeholderWarnings.map((w) => (
                    <p key={w}>{w}</p>
                  ))}
                  <p className="opacity-90">{t.placeholderHint}</p>
                </div>
              ) : null}

              {draftResult.parseError ? (
                <div
                  role="alert"
                  className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
                >
                  <p className="font-medium">{t.parseTitle}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words">{draftResult.parseError}</p>
                  {draftResult.raw ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 text-xs"
                      onClick={() => setShowRawJson((v) => !v)}
                    >
                      {showRawJson ? t.hideRaw : t.showRaw}
                    </Button>
                  ) : null}
                  {showRawJson && draftResult.raw ? (
                    <pre className="mt-2 max-h-40 overflow-auto rounded bg-background/80 p-2 text-[10px] font-mono">
                      {draftResult.raw.slice(0, 8000)}
                    </pre>
                  ) : null}
                </div>
              ) : null}

              {draftResult.parsed?.notes ? (
                <div className="rounded-lg border bg-muted/40 border-primary bg-primary/10 px-3 py-2 text-sm">
                  <p className="font-medium text-primary mb-1">{t.notesTitle}</p>
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

              {draftResult.parsed?.suggestedTimeLimitMs &&
              onApplySuggestedLimits ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm space-y-2">
                  <p className="font-medium">{t.limitsTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    <strong>{draftResult.parsed.suggestedTimeLimitMs} ms</strong>
                    {' · '}
                    <strong>{draftResult.parsed.suggestedMemoryLimitMb ?? 256} MB</strong>
                  </p>
                  <p className="text-[11px] text-muted-foreground">{t.limitsHint}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onApplySuggestedLimits({
                        timeLimitMs: draftResult.parsed!.suggestedTimeLimitMs!,
                        memoryLimitMb: draftResult.parsed!.suggestedMemoryLimitMb ?? 256,
                      })
                    }
                  >
                    {t.applyLimits}
                  </Button>
                </div>
              ) : null}

              {previewCases.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.emptyFiltered}</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    {t.aiOriginalSectionTitle(previewCases.length)}
                  </p>
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
                      <TestCaseIoBlock
                        label={t.input}
                        value={tc.input}
                        emptyLabel={t.emptyInput}
                        expandLabel={t.expandIo}
                        collapseLabel={t.collapseIo}
                        metaLabel={t.ioChars}
                        suspectPlaceholder={isLikelyPlaceholderIoClient(tc.input)}
                      />
                      <TestCaseIoBlock
                        label={t.output}
                        value={tc.expectedOutput}
                        emptyLabel={t.emptyInput}
                        expandLabel={t.expandIo}
                        collapseLabel={t.collapseIo}
                        metaLabel={t.ioChars}
                        suspectPlaceholder={isLikelyPlaceholderIoClient(tc.expectedOutput)}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 border-t pt-4">
                {!problemId ? (
                  <p className="text-xs text-primary  bg-primary/10 border border-primary/80 rounded-md px-2.5 py-2 leading-relaxed">
                    {g.draftVerifyBanner}
                  </p>
                ) : null}
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
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        {g.inlineFileHint}
                      </p>
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
                  <p className="text-xs text-muted-foreground">{g.storedNeedsProblemId}</p>
                ) : null}

                <div className="space-y-2 border-t pt-4">
                  <p className="text-sm font-semibold">{g.editableSectionTitle}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{g.restoreFromAiHint}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="cursor-pointer border-amber-500/50 text-amber-800 dark:text-amber-200 hover:bg-amber-500/10"
                    onClick={handleRestoreFromAi}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    {g.restoreFromAi}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-primary text-primary bg-primary/10 hover:text-primary cursor-pointer"
                    onClick={() =>
                      setEditableCases((prev) => [
                        ...prev,
                        { input: '', expectedOutput: '', isHidden: false, weight: 1 },
                      ])
                    }
                  >
                    {g.addCase}
                  </Button>
                </div>
                </div>

                <div className="custom-scrollbar space-y-3 max-h-[min(40vh,360px)] overflow-y-auto overflow-x-hidden pr-1">
                  {editableCases.map((tc, i) => (
                    <div key={i} className="rounded-lg border bg-muted/20 p-2 space-y-2">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-xs font-medium text-primary">{g.caseN(i + 1)}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-white bg-red-500 hover:bg-red-500 hover:text-white cursor-pointer"
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
                              prev.map((row, j) =>
                                j === i ? { ...row, input: e.target.value } : row,
                              ),
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
                      <span className="font-medium">{locale === 'vi' ? 'Kết quả' : 'Result'}</span>
                      <Badge
                        variant={verifyResult.summary.failed === 0 ? 'default' : 'destructive'}
                      >
                        {verifyResult.summary.passed}/{verifyResult.summary.total} OK
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({verifyResult.goldenSource}
                        {verifyResult.goldenSolutionId
                          ? ` · id=${verifyResult.goldenSolutionId.slice(0, 8)}…`
                          : ''}
                        )
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
                            <Badge variant={r.passed ? 'secondary' : 'destructive'}>
                              {r.verdict}
                            </Badge>
                          </div>
                          {!r.passed && r.expectedOutput ? (
                            <div className="mt-1 space-y-0.5">
                              <p className="text-[10px] font-medium text-muted-foreground">
                                Expected
                              </p>
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
                            <pre className="mt-1 text-destructive whitespace-pre-wrap font-mono">
                              {r.stderr}
                            </pre>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(verifyResult?.summary.failed ?? 0) > 0 || lastSavedDiagnosis ? (
                  <GoldenVerifyDiagnosisModal
                    locale={locale}
                    open={diagnosisModalOpen}
                    onOpenChange={setDiagnosisModalOpen}
                    lastSaved={lastSavedDiagnosis}
                    canAnalyze={Boolean(verifyResult && verifyResult.summary.failed > 0)}
                    diagnoseBusy={diagnoseBusy}
                    verifyBusy={verifyBusy}
                    onAnalyze={handleAnalyzeFailures}
                    onRecheck={handleVerify}
                    onApplySuggestion={applySuggestionAtVerifyIndex}
                    onApplyAllSuggestions={applyAllSuggestions}
                  />
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t.noData}</p>
          )}
        </div>

        <SheetFooter className="border-t shrink-0 flex-col sm:flex-row gap-2 sm:justify-end">
          <Button
            type="button"
            className="cursor-pointer border-primary text-primary hover:text-primary"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t.close}
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={casesReadyToApply.length === 0}
            onClick={() => onApplyAppend(casesReadyToApply)}
          >
            {t.append}
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={casesReadyToApply.length === 0}
            onClick={() => onApplyReplace(casesReadyToApply)}
          >
            {t.replace}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
