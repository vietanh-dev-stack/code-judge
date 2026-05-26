'use client';

import { AlertTriangle } from 'lucide-react';
import {
  LONG_STATEMENT_WARN_CHARS,
  statementLengthForAi,
} from '@/components/problems/ai-testcase-draft.shared';

type Locale = 'vi' | 'en';

const COPY: Record<
  Locale,
  {
    chars: (n: number) => string;
    longWarn: string;
    noIoSpec: string;
  }
> = {
  vi: {
    chars: (n) => `Độ dài đề gửi AI: ${n.toLocaleString('vi-VN')} ký tự`,
    longWarn:
      'Đề dài — server sẽ tóm tắt trước khi sinh testcase. Nên điền ioSpec; số testcase gợi ý tự giới hạn ≤8.',
    noIoSpec: 'Chưa có ioSpec — dễ sinh testcase sai format. Điền trong tùy chọn AI bên dưới.',
  },
  en: {
    chars: (n) => `Statement length sent to AI: ${n.toLocaleString()} chars`,
    longWarn:
      'Long statement — server summarizes before generating tests. Fill ioSpec; suggested cases capped at 8.',
    noIoSpec: 'Missing ioSpec — testcase format may be wrong. Add it in AI options below.',
  },
};

export function AiStatementLengthHint(props: {
  description?: string;
  statementMd?: string;
  ioSpec?: string;
  locale?: Locale;
  className?: string;
}) {
  const { description, statementMd, ioSpec, locale = 'vi', className = '' } = props;
  const t = COPY[locale];
  const len = statementLengthForAi({ description, statementMd });
  const isLong = len > LONG_STATEMENT_WARN_CHARS;
  const missingIo = !ioSpec?.trim();

  if (len === 0) return null;

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-xs space-y-1 ${
        isLong
          ? 'border-primary/70 bg-primary/10 text-red-500'
          : 'border-muted bg-muted/30 text-muted-foreground'
      } ${className}`}
    >
      <p className="font-medium">{t.chars(len)}</p>
      {isLong ? (
        <p className="flex items-start gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{t.longWarn}</span>
        </p>
      ) : null}
      {missingIo && (isLong || len > 2000) ? (
        <p className="text-[11px] opacity-90">{t.noIoSpec}</p>
      ) : null}
    </div>
  );
}
