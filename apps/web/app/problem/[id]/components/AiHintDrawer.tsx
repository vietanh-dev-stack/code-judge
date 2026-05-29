'use client';

import { useEffect } from 'react';
import { Lightbulb, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RequestHintResult } from '@/services/ai-hint.apis';

export type HintUiState = 'idle' | 'loading' | 'ready' | 'error';

type AiHintDrawerProps = {
  open: boolean;
  onClose: () => void;
  state: HintUiState;
  data: RequestHintResult | null;
  errorMessage?: string | null;
};

function HintSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-muted/80" />
        <div className="h-3 w-5/6 rounded bg-muted/80" />
        <div className="h-3 w-4/6 rounded bg-muted/80" />
      </div>
      <div className="h-20 rounded-lg bg-muted/60" />
    </div>
  );
}

function HintContent({ data }: { data: RequestHintResult }) {
  const { hints } = data;
  return (
    <div className="space-y-5">
      <section>
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
          Tóm tắt
        </h4>
        <p className="text-sm leading-relaxed">{hints.summary}</p>
      </section>

      {hints.approachHints.length > 0 && (
        <section>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Hướng làm
          </h4>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-foreground/90">
            {hints.approachHints.map((hint, i) => (
              <li key={i}>{hint}</li>
            ))}
          </ul>
        </section>
      )}

      {hints.syntaxNotes.length > 0 && (
        <section>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Cú pháp cần xem lại
          </h4>
          <ul className="space-y-2">
            {hints.syntaxNotes.map((note, i) => (
              <li
                key={i}
                className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm"
              >
                <span className="font-semibold text-violet-600 dark:text-violet-400">{note.area}</span>
                <span className="text-muted-foreground"> — </span>
                {note.note}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hints.examplePatterns.length > 0 && (
        <section>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Ví dụ minh họa (không phải đáp án bài)
          </h4>
          {hints.examplePatterns.map((ex, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <p className="text-xs font-semibold text-muted-foreground mb-1">{ex.title}</p>
              <pre className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                {ex.genericExample}
              </pre>
            </div>
          ))}
        </section>
      )}

      <p className="text-sm italic text-muted-foreground border-t border-border/40 pt-3">
        {hints.encouragement}
      </p>
    </div>
  );
}

export default function AiHintDrawer({
  open,
  onClose,
  state,
  data,
  errorMessage,
}: AiHintDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Đóng gợi ý"
        className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-hint-drawer-title"
        className={cn(
          'fixed top-0 right-0 z-[70] flex h-full w-full max-w-md flex-col',
          'border-l border-border/60 bg-background shadow-2xl',
          'animate-in slide-in-from-right duration-200',
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border/50 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-500">
              <Lightbulb size={18} />
            </div>
            <div>
              <h2 id="ai-hint-drawer-title" className="text-sm font-bold">
                Gợi ý AI
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Hướng làm và syntax — không phải lời giải
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
          {state === 'loading' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-violet-500" />
                Đang phân tích submission...
              </p>
              <HintSkeleton />
            </div>
          )}
          {state === 'error' && (
            <p className="text-sm text-rose-500 leading-relaxed">
              {errorMessage || 'Could not load hint. Please try again later.'}
            </p>
          )}
          {state === 'ready' && data?.hints && <HintContent data={data} />}
          {state === 'idle' && (
            <p className="text-sm text-muted-foreground">Chưa có gợi ý cho lần chạy này.</p>
          )}
        </div>

        <footer className="shrink-0 border-t border-border/50 px-5 py-3 text-[11px] text-muted-foreground">
          Gợi ý mang tính định hướng. Hãy tự hoàn thiện lời giải của bạn.
        </footer>
      </aside>
    </>
  );
}
