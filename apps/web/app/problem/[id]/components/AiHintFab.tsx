'use client';

import { MessageCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type AiHintFabProps = {
  visible: boolean;
  loading?: boolean;
  ready?: boolean;
  pulse?: boolean;
  onClick: () => void;
};

export default function AiHintFab({
  visible,
  loading = false,
  ready = false,
  pulse = false,
  onClick,
}: AiHintFabProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label="Bạn cần trợ giúp không? Mở gợi ý AI"
      className={cn(
        'fixed bottom-6 right-6 z-[80] flex max-w-[min(100vw-2rem,320px)] items-center gap-2.5',
        'rounded-full border border-violet-500/50 bg-background/95 px-4 py-3',
        'text-sm font-medium text-foreground shadow-[0_8px_32px_rgba(139,92,246,0.35)]',
        'backdrop-blur-md transition-all hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(139,92,246,0.45)]',
        'active:scale-[0.98] disabled:opacity-80',
        'animate-in fade-in slide-in-from-bottom-4 duration-300',
        pulse && !loading && 'ring-2 ring-violet-400/60 ring-offset-2 ring-offset-background',
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          'bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-inner',
        )}
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <MessageCircle size={18} />
        )}
      </span>
      <span className="text-left leading-snug pr-1">
        <span className="block text-[13px] font-semibold text-violet-700 dark:text-violet-200">
          Bạn cần trợ giúp không ^^
        </span>
        <span className="block text-[11px] font-normal text-muted-foreground">
          {loading ? 'Đang chuẩn bị gợi ý...' : ready ? 'Gợi ý đã sẵn sàng — bấm xem' : 'Gợi ý hướng làm, không lộ đáp án'}
        </span>
      </span>
      {ready && !loading && (
        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
      )}
    </button>
  );
}
