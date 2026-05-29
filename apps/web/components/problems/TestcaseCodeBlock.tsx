'use client';

import { cn } from '@/lib/utils';

export type TestcaseCodeBlockProps = {
  label: string;
  value: string;
  /** passed | failed | neutral */
  tone?: 'passed' | 'failed' | 'neutral';
  emptyPlaceholder?: string;
  className?: string;
  maxHeightClass?: string;
};

export function TestcaseCodeBlock({
  label,
  value,
  tone = 'neutral',
  emptyPlaceholder = '—',
  className,
  maxHeightClass = 'max-h-32',
}: TestcaseCodeBlockProps) {
  const display = value?.trim() ? value : emptyPlaceholder;
  const isEmpty = !value?.trim();

  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <pre
        className={cn(
          'overflow-auto rounded-lg border px-3 py-2.5 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words custom-scrollbar',
          maxHeightClass,
          isEmpty && 'italic text-muted-foreground',
          tone === 'neutral' && 'border-border/60 bg-muted/25 text-foreground',
          tone === 'passed' &&
            'border-emerald-500/25 bg-emerald-500/10 text-foreground dark:text-emerald-50',
          tone === 'failed' &&
            'border-rose-500/25 bg-rose-500/10 text-foreground dark:text-rose-50',
        )}
      >
        {display}
      </pre>
    </div>
  );
}
