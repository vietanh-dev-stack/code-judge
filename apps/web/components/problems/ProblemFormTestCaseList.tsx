'use client';

import { Beaker, Globe, Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type FormTestCaseItem = {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
  weight?: number;
};

export type ProblemFormTestCaseListProps = {
  variant: 'classroom' | 'admin';
  locale?: 'vi' | 'en';
  testCases: FormTestCaseItem[];
  errors: Record<string, string>;
  onUpdate: (
    index: number,
    field: keyof FormTestCaseItem,
    value: string | number | boolean,
  ) => void;
  onRemove: (index: number) => void;
  onClearError: (key: string) => void;
};

const copy = {
  vi: {
    emptyTitle: 'Chưa có testcase',
    emptyHint: 'Bấm «Thêm testcase» hoặc dùng AI để tạo.',
    case: 'Testcase',
    input: 'Input',
    output: 'Expected output',
    inputPh: 'Dữ liệu vào cho testcase này',
    outputPh: 'Kết quả mong đợi',
    public: 'Công khai',
    hidden: 'Ẩn',
    weight: 'Trọng số',
    delete: 'Xóa',
    hiddenLoadError: 'Hidden test case data was not loaded — refresh before saving.',
  },
  en: {
    emptyTitle: 'No test cases yet',
    emptyHint: 'Click «Add Case» or use AI to generate cases.',
    case: 'Case',
    input: 'Input',
    output: 'Expected output',
    inputPh: 'Input for this case',
    outputPh: 'Expected output',
    public: 'Public',
    hidden: 'Hidden',
    weight: 'Weight',
    delete: 'Delete',
    hiddenLoadError: 'Hidden case data was not loaded — refresh before saving.',
  },
} as const;

function variantStyles(variant: 'classroom' | 'admin') {
  if (variant === 'classroom') {
    return {
      empty: 'border-dashed border-border bg-muted/20 text-muted-foreground',
      card: 'border-border bg-card shadow-sm',
      cardHeader: 'border-border/80',
      caseBadge: 'border border-primary/30 bg-primary/15 text-primary',
      fieldLabel: 'text-muted-foreground',
      textarea:
        'min-h-[96px] rounded-lg border-border bg-background font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/40',
      textareaError: 'border-destructive/60 bg-destructive/10 focus-visible:ring-destructive/40',
      footer: 'border-border/80',
      weightInput: 'border-border bg-background text-foreground',
      deleteBtn:
        'text-destructive hover:bg-destructive/10 hover:text-destructive',
      alert: 'border-destructive/40 bg-destructive/10 text-destructive',
    };
  }
  return {
    empty: 'border-border bg-muted/20 text-muted-foreground',
    card: 'border-border bg-card shadow-sm',
    cardHeader: 'border-border/80',
    caseBadge: 'bg-muted text-foreground border-border',
    fieldLabel: 'text-muted-foreground',
    textarea:
      'min-h-[96px] rounded-lg border-border bg-background font-mono text-xs leading-relaxed focus-visible:ring-ring',
    textareaError: 'border-destructive bg-destructive/5 focus-visible:ring-destructive/30',
    footer: 'border-border/80',
    weightInput: 'border-border bg-background',
    deleteBtn: 'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
    alert: 'border-destructive/30 bg-destructive/10 text-destructive',
  };
}

export function ProblemFormTestCaseList({
  variant,
  locale = 'en',
  testCases,
  errors,
  onUpdate,
  onRemove,
  onClearError,
}: ProblemFormTestCaseListProps) {
  const t = copy[locale];
  const s = variantStyles(variant);

  if (!testCases.length) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-14 text-center',
          s.empty,
          errors.testCases && 'border-destructive/50',
        )}
      >
        <Beaker className="h-11 w-11 opacity-60" aria-hidden />
        <p className="text-sm font-medium">{t.emptyTitle}</p>
        <p className="text-xs opacity-80">{t.emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="problem-form-testcase-list space-y-4">
      {errors.testCases && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium',
            s.alert,
          )}
          role="alert"
        >
          <Trash2 className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
          <span>{errors.testCases}</span>
        </div>
      )}

      {testCases.map((tc, index) => {
        const inputKey = `testCase_${index}_input`;
        const outputKey = `testCase_${index}_output`;
        const hiddenKey = `testCase_${index}_hidden`;
        const inputErr = errors[inputKey];
        const outputErr = errors[outputKey];
        const hiddenErr = errors[hiddenKey];

        return (
          <article
            key={index}
            className={cn('overflow-hidden rounded-xl border', s.card)}
          >
            <header
              className={cn(
                'flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5',
                s.cardHeader,
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold',
                    s.caseBadge,
                  )}
                >
                  {t.case} {index + 1}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium',
                    tc.isHidden
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
                  )}
                >
                  {tc.isHidden ? (
                    <Lock className="h-3 w-3" aria-hidden />
                  ) : (
                    <Globe className="h-3 w-3" aria-hidden />
                  )}
                  {tc.isHidden ? t.hidden : t.public}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className={cn('h-8 gap-1.5 px-2.5 text-xs', s.deleteBtn)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t.delete}
              </Button>
            </header>

            <div className="space-y-3 p-4">
              {hiddenErr && (
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400" role="alert">
                  {t.hiddenLoadError}
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-1.5 min-w-0">
                  <Label className={cn('text-xs font-semibold uppercase tracking-wide', s.fieldLabel)}>
                    {t.input}
                  </Label>
                  <Textarea
                    value={tc.input}
                    onChange={(e) => {
                      onUpdate(index, 'input', e.target.value);
                      if (inputErr) onClearError(inputKey);
                    }}
                    placeholder={t.inputPh}
                    spellCheck={false}
                    className={cn(s.textarea, inputErr && s.textareaError)}
                  />
                  {inputErr && (
                    <p className="text-[11px] font-medium text-destructive">{inputErr}</p>
                  )}
                </div>

                <div className="space-y-1.5 min-w-0">
                  <Label className={cn('text-xs font-semibold uppercase tracking-wide', s.fieldLabel)}>
                    {t.output}
                  </Label>
                  <Textarea
                    value={tc.expectedOutput}
                    onChange={(e) => {
                      onUpdate(index, 'expectedOutput', e.target.value);
                      if (outputErr) onClearError(outputKey);
                    }}
                    placeholder={t.outputPh}
                    spellCheck={false}
                    className={cn(s.textarea, outputErr && s.textareaError)}
                  />
                  {outputErr && (
                    <p className="text-[11px] font-medium text-destructive">{outputErr}</p>
                  )}
                </div>
              </div>

              <footer
                className={cn(
                  'flex flex-wrap items-center justify-between gap-4 border-t pt-3',
                  s.footer,
                )}
              >
                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`tc-hidden-${variant}-${index}`}
                      checked={tc.isHidden ?? false}
                      onCheckedChange={(checked) => onUpdate(index, 'isHidden', checked)}
                    />
                    <Label
                      htmlFor={`tc-hidden-${variant}-${index}`}
                      className="cursor-pointer text-sm font-medium"
                    >
                      {tc.isHidden ? t.hidden : t.public}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">{t.weight}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={tc.weight ?? 1}
                      onChange={(e) =>
                        onUpdate(index, 'weight', Number(e.target.value) || 1)
                      }
                      className={cn('h-8 w-16 text-center text-xs font-semibold', s.weightInput)}
                    />
                  </div>
                </div>
              </footer>
            </div>
          </article>
        );
      })}
    </div>
  );
}
