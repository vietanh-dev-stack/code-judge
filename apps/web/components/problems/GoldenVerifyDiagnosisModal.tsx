'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { GoldenVerifyCaseDiagnosis, GoldenVerifyFailureDiagnosis } from '@/services/ai-testcase.apis';
import type { SavedGoldenVerifyDiagnosis } from '@/lib/golden-verify-diagnosis-storage';

type Locale = 'vi' | 'en';

const ROOT_CAUSE_LABELS: Record<Locale, Record<GoldenVerifyCaseDiagnosis['rootCause'], string>> = {
  vi: {
    wrong_expected: 'Expected sai',
    wrong_input: 'Input sai',
    io_format_mismatch: 'Sai định dạng I/O',
    golden_runtime: 'Lỗi golden/runtime',
    time_limit: 'Time limit',
    statement_ambiguous: 'Đề mơ hồ',
    other: 'Khác',
  },
  en: {
    wrong_expected: 'Wrong expected',
    wrong_input: 'Wrong input',
    io_format_mismatch: 'I/O format mismatch',
    golden_runtime: 'Golden/runtime error',
    time_limit: 'Time limit',
    statement_ambiguous: 'Ambiguous statement',
    other: 'Other',
  },
};

const COPY: Record<
  Locale,
  {
    analyzeButton: string;
    recheckButton: string;
    viewSavedButton: string;
    applyOne: string;
    applyAll: string;
    diagnosisTitle: string;
    globalNotes: string;
    suggestedInput: string;
    suggestedExpected: string;
    parseError: string;
    analyzing: string;
    close: string;
    savedMeta: (passed: number, total: number, at: string) => string;
    modalDesc: string;
  }
> = {
  vi: {
    analyzeButton: 'Phân tích lỗi bằng AI',
    recheckButton: 'Kiểm tra lại testcase',
    viewSavedButton: 'Xem chẩn đoán đã lưu',
    applyOne: 'Áp dụng',
    applyAll: 'Áp dụng tất cả gợi ý',
    diagnosisTitle: 'Chẩn đoán AI — golden verify',
    globalNotes: 'Ghi chú chung',
    suggestedInput: 'Gợi ý input',
    suggestedExpected: 'Gợi ý expected',
    parseError: 'Không parse được JSON từ AI',
    analyzing: 'Đang phân tích…',
    close: 'Đóng',
    savedMeta: (passed, total, at) =>
      `Lưu lúc ${at} · verify lúc đó: ${passed}/${total} OK`,
    modalDesc: 'Gợi ý sửa test case dựa trên golden. Có thể áp dụng từng case rồi chạy lại verify.',
  },
  en: {
    analyzeButton: 'Analyze failures with AI',
    recheckButton: 'Re-run golden verify',
    viewSavedButton: 'View saved diagnosis',
    applyOne: 'Apply',
    applyAll: 'Apply all suggestions',
    diagnosisTitle: 'AI diagnosis — golden verify',
    globalNotes: 'Global notes',
    suggestedInput: 'Suggested input',
    suggestedExpected: 'Suggested expected',
    parseError: 'Could not parse AI JSON response',
    analyzing: 'Analyzing…',
    close: 'Close',
    savedMeta: (passed, total, at) =>
      `Saved at ${at} · verify at that time: ${passed}/${total} OK`,
    modalDesc: 'Suggested test case fixes from golden output. Apply per case, then re-run verify.',
  },
};

function formatSavedAt(iso: string, locale: Locale): string {
  try {
    return new Date(iso).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function DiagnosisBody(props: {
  locale: Locale;
  saved: SavedGoldenVerifyDiagnosis;
  analyzing: boolean;
  onApplySuggestion: (index: number, fix: GoldenVerifyCaseDiagnosis['suggestedFix']) => void;
  onApplyAllSuggestions: (structured: GoldenVerifyFailureDiagnosis) => void;
}) {
  const { locale, saved, analyzing, onApplySuggestion, onApplyAllSuggestions } = props;
  const g = COPY[locale];
  const diagnosis = saved.diagnosis;
  const structured = diagnosis.structured;

  return (
    <div className="space-y-3 text-sm min-h-0 overflow-y-auto flex-1 pr-1">
      {analyzing ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {g.analyzing}
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {g.savedMeta(
          saved.verifySummary.passed,
          saved.verifySummary.total,
          formatSavedAt(saved.savedAt, locale),
        )}
        {' · '}
        {diagnosis.provider}/{diagnosis.model}
      </p>

      {diagnosis.parseError || !structured ? (
        <p className="text-xs text-destructive">
          {g.parseError}
          {diagnosis.parseError ? `: ${diagnosis.parseError}` : ''}
        </p>
      ) : null}

      {structured ? (
        <>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{structured.summary}</p>
          {structured.globalNotes ? (
            <div className="rounded border bg-muted/30 p-2 text-xs">
              <p className="font-medium text-muted-foreground">{g.globalNotes}</p>
              <p className="whitespace-pre-wrap">{structured.globalNotes}</p>
            </div>
          ) : null}
          <div className="space-y-2">
            {structured.caseDiagnoses.map((d) => (
              <div key={d.index} className="rounded border bg-muted/20 p-2 text-xs space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">#{d.index + 1}</span>
                  <Badge variant="outline">{d.verdict}</Badge>
                  <Badge variant="secondary">{ROOT_CAUSE_LABELS[locale][d.rootCause]}</Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {d.confidence}
                  </Badge>
                  {d.suggestedFix ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] ml-auto"
                      onClick={() => onApplySuggestion(d.index, d.suggestedFix)}
                    >
                      {g.applyOne}
                    </Button>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap">{d.explanation}</p>
                {d.suggestedFix?.input !== undefined ? (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground">{g.suggestedInput}</p>
                    <pre className="max-h-20 overflow-auto whitespace-pre-wrap font-mono text-[11px]">
                      {d.suggestedFix.input}
                    </pre>
                  </div>
                ) : null}
                {d.suggestedFix?.expectedOutput !== undefined ? (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground">{g.suggestedExpected}</p>
                    <pre className="max-h-20 overflow-auto whitespace-pre-wrap font-mono text-[11px]">
                      {d.suggestedFix.expectedOutput}
                    </pre>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : diagnosis.rawPreview ? (
        <pre className="max-h-32 overflow-auto text-[10px] font-mono text-muted-foreground">
          {diagnosis.rawPreview}
        </pre>
      ) : null}
    </div>
  );
}

export function GoldenVerifyDiagnosisModal(props: {
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lastSaved: SavedGoldenVerifyDiagnosis | null;
  canAnalyze: boolean;
  diagnoseBusy: boolean;
  verifyBusy: boolean;
  onAnalyze: () => void;
  onRecheck: () => void;
  onApplySuggestion: (index: number, fix: GoldenVerifyCaseDiagnosis['suggestedFix']) => void;
  onApplyAllSuggestions: (structured: GoldenVerifyFailureDiagnosis) => void;
}) {
  const {
    locale,
    open,
    onOpenChange,
    lastSaved,
    canAnalyze,
    diagnoseBusy,
    verifyBusy,
    onAnalyze,
    onRecheck,
    onApplySuggestion,
    onApplyAllSuggestions,
  } = props;
  const g = COPY[locale];
  const structured = lastSaved?.diagnosis.structured ?? null;
  const showToolbar = canAnalyze || Boolean(lastSaved);

  if (!showToolbar) {
    return null;
  }

  const handleAnalyze = () => {
    onAnalyze();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 rounded-lg border border-dashed p-3">
        {canAnalyze ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={diagnoseBusy || verifyBusy}
            onClick={handleAnalyze}
          >
            {diagnoseBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {diagnoseBusy ? g.analyzing : g.analyzeButton}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" disabled={verifyBusy} onClick={onRecheck}>
          {verifyBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {g.recheckButton}
        </Button>
        {lastSaved ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => onOpenChange(true)}>
            {g.viewSavedButton}
          </Button>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton
          className="flex h-[min(88vh,720px)] w-[min(96vw,640px)] max-w-none flex-col gap-0 p-0 sm:max-w-none"
        >
          <DialogHeader className="shrink-0 border-b px-5 py-4 text-left">
            <DialogTitle>{g.diagnosisTitle}</DialogTitle>
            <DialogDescription>{g.modalDesc}</DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-4">
            {diagnoseBusy && !lastSaved ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                {g.analyzing}
              </div>
            ) : lastSaved ? (
              <DiagnosisBody
                locale={locale}
                saved={lastSaved}
                analyzing={diagnoseBusy}
                onApplySuggestion={onApplySuggestion}
                onApplyAllSuggestions={onApplyAllSuggestions}
              />
            ) : null}
          </div>

          <DialogFooter className="shrink-0 sm:justify-between">
            {structured && structured.caseDiagnoses.some((c) => c.suggestedFix) ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  onApplyAllSuggestions(structured);
                }}
              >
                {g.applyAll}
              </Button>
            ) : (
              <span />
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {g.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
