'use client';

import type { ReactNode } from 'react';
import { useScrollbarHover } from '@/hooks/useScrollbarHandle';
import { cn } from '@/lib/utils';

type ProblemFormPageVariant = 'classroom' | 'admin';

export function ProblemFormPageShell({
  children,
  variant = 'classroom',
}: {
  children: ReactNode;
  variant?: ProblemFormPageVariant;
}) {
  const scrollRef = useScrollbarHover();

  return (
    <div
      ref={scrollRef}
      className={cn(
        'problem-form-page custom-scrollbar w-full min-w-0',
        variant === 'classroom' && 'problem-form-page--classroom',
        variant === 'admin' && 'problem-form-page--admin',
      )}
    >
      <div
        className={cn(
          'mx-auto w-full max-w-5xl space-y-8',
          variant === 'classroom' &&
            'animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12',
          variant === 'admin' && 'pb-10',
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Scroll region for long testcase lists (stable dark scrollbar from globals.css). */
export function ProblemFormTestCasesScroll({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const scrollRef = useScrollbarHover();

  return (
    <div
      ref={scrollRef}
      className={cn(
        'custom-scrollbar max-h-[min(70vh,42rem)] overflow-y-auto overflow-x-hidden pr-1',
        className,
      )}
    >
      {children}
    </div>
  );
}
