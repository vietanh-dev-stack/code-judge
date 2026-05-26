'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileStack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getSavedAiTestcaseDraftMeta,
  loadSavedAiTestcaseDraft,
  type SavedAiTestcaseDraft,
} from '@/lib/ai-testcase-draft-storage';

type Locale = 'vi' | 'en';

const COPY: Record<
  Locale,
  {
    reopen: (n: number) => string;
    title: string;
  }
> = {
  vi: {
    reopen: (n) => (n > 0 ? `Xem lại bản AI (${n} test)` : 'Xem lại bản AI'),
    title: 'Mở lại sheet testcase AI đã sinh (lưu tạm trong phiên trình duyệt)',
  },
  en: {
    reopen: (n) => (n > 0 ? `Review AI draft (${n} tests)` : 'Review AI draft'),
    title: 'Reopen the AI test-case draft saved for this browser session',
  },
};

export function AiTestcaseDraftReopenButton(props: {
  scope: string;
  locale?: Locale;
  disabled?: boolean;
  /** Tăng sau mỗi lần lưu/xóa bản nháp để refresh nút */
  refreshKey?: number;
  onRestore: (saved: SavedAiTestcaseDraft) => void;
}) {
  const { scope, locale = 'en', disabled, refreshKey = 0, onRestore } = props;
  const t = COPY[locale];
  const [meta, setMeta] = useState<{
    savedAt: string;
    caseCount: number;
    problemTitle?: string;
  } | null>(null);

  const refresh = useCallback(() => {
    setMeta(getSavedAiTestcaseDraftMeta(scope));
  }, [scope]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  if (!meta) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-lg cursor-pointer border-primary/70 text-primary hover:bg-primary/20 hover:text-primary"
      title={t.title}
      disabled={disabled}
      onClick={() => {
        const saved = loadSavedAiTestcaseDraft(scope);
        if (saved) {
          onRestore(saved);
        } else {
          refresh();
        }
      }}
    >
      <FileStack className="w-4 h-4 mr-2" />
      {t.reopen(meta.caseCount)}
    </Button>
  );
}
