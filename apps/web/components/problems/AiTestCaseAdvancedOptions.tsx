'use client';

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
import { Sparkles } from 'lucide-react';
import type { AiGenOptionsState } from './ai-testcase-draft.shared';

type Locale = 'vi' | 'en';

const COPY: Record<
  Locale,
  {
    summaryTitle: string;
    summaryHint: string;
    ioSpec: string;
    ioSpecHelp: string;
    ioPlaceholder: string;
    supplementary: string;
    supplementaryPh: string;
    maxSuggestions: string;
    maxHint: (cap: number) => string;
    provider: string;
    model: string;
    modelPh: string;
    revisionTitle: string;
    revisionHelp: string;
    revSummaryPh: string;
    revFeedbackPh: string;
    revValidatorPh: string;
    provDefault: string;
    provGoogle: string;
    provOpenai: string;
  }
> = {
  vi: {
    summaryTitle: 'Tùy chọn gửi kèm cho AI',
    summaryHint: 'ioSpec, provider, chỉnh từ lần trước…',
    ioSpec: 'Đặc tả I/O (ioSpec)',
    ioSpecHelp:
      'Mô tả rõ định dạng input/output (một dòng, nhiều số, v.v.). Giúp AI khớp đúng format thay vì chỉ đoán từ đề bài.',
    ioPlaceholder: 'Ví dụ: "Một dòng chứa chuỗi S. In một số nguyên trên một dòng."',
    supplementary: 'Bổ sung / ràng buộc thêm',
    supplementaryPh: 'Giới hạn ẩn, ví dụ cấm, hoặc ghi chú không nằm trong statement…',
    maxSuggestions: 'Số testcase gợi ý (tối đa 25)',
    maxHint: (cap) => `Không vượt quá max testcase của đề (${cap}).`,
    provider: 'Provider',
    model: 'Model (tuỳ chọn)',
    modelPh: 'Để trống = model mặc định (vd. gemini-2.5-flash, gpt-4.1-mini)',
    revisionTitle: 'Chỉnh sau lần chạy trước (revision)',
    revisionHelp:
      'Điền khi muốn AI sửa bản nháp trước: tóm tắt output cũ, feedback, hoặc lỗi parse / validator.',
    revSummaryPh: 'Tóm tắt lần trước (vd. thiếu biên, sai format output)…',
    revFeedbackPh: 'Yêu cầu cụ thể cho lần chạy này…',
    revValidatorPh: 'validatorIssues — mỗi dòng một mục (tuỳ chọn)',
    provDefault: 'Mặc định (theo server)',
    provGoogle: 'Google (Gemini)',
    provOpenai: 'OpenAI',
  },
  en: {
    summaryTitle: 'Advanced options for AI',
    summaryHint: 'ioSpec, provider, revision…',
    ioSpec: 'I/O specification (ioSpec)',
    ioSpecHelp:
      'Describe input/output format clearly so the model matches your grader instead of guessing.',
    ioPlaceholder: 'e.g. "Single line with string S. Print one integer on one line."',
    supplementary: 'Extra constraints / notes',
    supplementaryPh: 'Hidden limits, forbidden cases, or notes not in the statement…',
    maxSuggestions: 'Number of suggested cases (max 25)',
    maxHint: (cap) => `Cannot exceed problem max test cases (${cap}).`,
    provider: 'Provider',
    model: 'Model (optional)',
    modelPh: 'Leave empty for server default (e.g. gemini-2.5-flash, gpt-4.1-mini)',
    revisionTitle: 'Revise from last run',
    revisionHelp:
      'Use when refining a previous draft: summarize last output, feedback, or parse/validator issues.',
    revSummaryPh: 'Summary of last run (e.g. missing edge case, wrong output format)…',
    revFeedbackPh: 'Concrete instructions for this run…',
    revValidatorPh: 'validatorIssues — one line per item (optional)',
    provDefault: 'Server default',
    provGoogle: 'Google (Gemini)',
    provOpenai: 'OpenAI',
  },
};

export function AiTestCaseAdvancedOptions(props: {
  aiGenOptions: AiGenOptionsState;
  setAiGenOptions: React.Dispatch<React.SetStateAction<AiGenOptionsState>>;
  maxTestCasesForProblem: number;
  locale?: Locale;
  idPrefix?: string;
}) {
  const { aiGenOptions, setAiGenOptions, maxTestCasesForProblem, locale = 'vi', idPrefix = '' } =
    props;
  const t = COPY[locale];
  const cap = Math.min(maxTestCasesForProblem ?? 100, 25);

  return (
    <details className="group rounded-xl border border-violet-200/70 bg-violet-50/35 dark:bg-violet-950/20 dark:border-violet-800/50 mb-6 overflow-hidden">
      <summary className="cursor-pointer select-none list-none px-4 py-3 text-sm font-semibold text-violet-950 dark:text-violet-100 flex items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-violet-600" />
          {t.summaryTitle}
        </span>
        <span className="text-xs font-normal text-violet-700/80 dark:text-violet-300/80">
          {t.summaryHint}
        </span>
      </summary>
      <div className="border-t border-violet-200/60 dark:border-violet-800/40 px-4 py-4 space-y-4 text-sm">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}ai-io-spec`} className="text-xs font-semibold text-foreground">
            {t.ioSpec}
          </Label>
          <p className="text-[11px] text-muted-foreground leading-snug">{t.ioSpecHelp}</p>
          <Textarea
            id={`${idPrefix}ai-io-spec`}
            value={aiGenOptions.ioSpec}
            onChange={(e) => setAiGenOptions((o) => ({ ...o, ioSpec: e.target.value }))}
            placeholder={t.ioPlaceholder}
            className="min-h-[72px] rounded-lg border-violet-200/80 bg-white/90 dark:bg-background font-mono text-xs"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}ai-supplementary`} className="text-xs font-semibold">
            {t.supplementary}
          </Label>
          <Textarea
            id={`${idPrefix}ai-supplementary`}
            value={aiGenOptions.supplementaryText}
            onChange={(e) => setAiGenOptions((o) => ({ ...o, supplementaryText: e.target.value }))}
            placeholder={t.supplementaryPh}
            className="min-h-[56px] rounded-lg border-violet-200/80 bg-white/90 dark:bg-background text-xs"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">{t.maxSuggestions}</Label>
            <Input
              type="number"
              min={1}
              max={25}
              value={aiGenOptions.maxSuggestions}
              onChange={(e) => {
                const n = Number(e.target.value);
                setAiGenOptions((o) => ({
                  ...o,
                  maxSuggestions: Number.isFinite(n) ? Math.min(25, Math.max(1, n)) : 10,
                }));
              }}
              className="h-9 rounded-lg border-violet-200/80"
            />
            <p className="text-[11px] text-muted-foreground">{t.maxHint(cap)}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">{t.provider}</Label>
            <Select
              value={aiGenOptions.provider || 'default'}
              onValueChange={(v) =>
                setAiGenOptions((o) => ({
                  ...o,
                  provider: v === 'default' ? '' : (v as 'openai' | 'google'),
                }))
              }
            >
              <SelectTrigger className="h-9 rounded-lg border-violet-200/80">
                <SelectValue placeholder={t.provDefault} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t.provDefault}</SelectItem>
                <SelectItem value="google">{t.provGoogle}</SelectItem>
                <SelectItem value="openai">{t.provOpenai}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}ai-model`} className="text-xs font-semibold">
            {t.model}
          </Label>
          <Input
            id={`${idPrefix}ai-model`}
            value={aiGenOptions.model}
            onChange={(e) => setAiGenOptions((o) => ({ ...o, model: e.target.value }))}
            placeholder={t.modelPh}
            className="h-9 rounded-lg border-violet-200/80 font-mono text-xs"
          />
        </div>

        <div className="space-y-2 pt-2 border-t border-violet-200/50 dark:border-violet-800/40">
          <p className="text-xs font-semibold text-foreground">{t.revisionTitle}</p>
          <p className="text-[11px] text-muted-foreground">{t.revisionHelp}</p>
          <Textarea
            value={aiGenOptions.revisionSummary}
            onChange={(e) => setAiGenOptions((o) => ({ ...o, revisionSummary: e.target.value }))}
            placeholder={t.revSummaryPh}
            className="min-h-[48px] rounded-lg text-xs"
            rows={2}
          />
          <Textarea
            value={aiGenOptions.revisionFeedback}
            onChange={(e) => setAiGenOptions((o) => ({ ...o, revisionFeedback: e.target.value }))}
            placeholder={t.revFeedbackPh}
            className="min-h-[48px] rounded-lg text-xs"
            rows={2}
          />
          <Textarea
            value={aiGenOptions.revisionValidatorLines}
            onChange={(e) =>
              setAiGenOptions((o) => ({ ...o, revisionValidatorLines: e.target.value }))
            }
            placeholder={t.revValidatorPh}
            className="min-h-[40px] rounded-lg font-mono text-[11px]"
            rows={2}
          />
        </div>
      </div>
    </details>
  );
}
