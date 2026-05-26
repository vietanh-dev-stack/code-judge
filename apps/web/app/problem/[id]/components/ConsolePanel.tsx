'use client';

import React from 'react';
import { CheckCircle2, Lock, Terminal, XCircle, Zap, Cpu } from 'lucide-react';
import type { SubmissionResult } from './ProblemWorkspace';
import { cn } from '@/lib/utils';
import { Problem } from '@/services/problem.apis';
import { TestcaseCodeBlock } from '@/components/problems/TestcaseCodeBlock';

type ConsolePanelProps = {
  isRunning: boolean;
  result: SubmissionResult | null;
  problem: Problem;
  isDarkMode?: boolean;
};

export default function ConsolePanel({
  isRunning,
  result,
  problem,
  isDarkMode = true,
}: ConsolePanelProps) {
  const [activeCaseTab, setActiveCaseTab] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (result?.caseResults?.testCases) {
      const firstPublic = result.caseResults.testCases.find((tc) => !tc.isHidden);
      if (firstPublic) {
        setActiveCaseTab(firstPublic.testCaseId);
      } else if (result.caseResults.testCases.length > 0) {
        setActiveCaseTab(result.caseResults.testCases[0].testCaseId);
      } else {
        setActiveCaseTab(null);
      }
    } else {
      setActiveCaseTab(null);
    }
  }, [result]);

  const publicCases = React.useMemo(() => {
    if (!result?.caseResults?.testCases) return [];
    return result.caseResults.testCases.filter((tc) => !tc.isHidden);
  }, [result]);

  const activeCase = result?.caseResults?.testCases?.find((t) => t.testCaseId === activeCaseTab);
  const activeCaseInfo = activeCase
    ? problem.testCases?.find((t) => t.id === activeCase.testCaseId)
    : undefined;

  const passedAll = result != null && result.testsPassed === result.testsTotal;

  return (
    <div
      className={cn(
        'flex min-h-[280px] max-h-[min(48vh,420px)] flex-col border-t',
        isDarkMode ? 'border-border/40 bg-[#0a0a0c]' : 'border-border bg-slate-50',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-between border-b px-4 py-2.5 sm:px-5',
          isDarkMode ? 'border-border/40 bg-muted/5' : 'border-border bg-white',
        )}
      >
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Terminal size={14} className="text-sky-500" />
          Console
        </div>

        {result && (
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide',
              passedAll
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
            )}
          >
            {passedAll ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            {result.status}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5">
        {isRunning ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-500/25 border-t-sky-500" />
              <Zap
                size={18}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sky-500"
              />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Judging submission…</p>
          </div>
        ) : result ? (
          <div className="mx-auto w-full max-w-4xl space-y-5 pb-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                icon={<CheckCircle2 size={12} className="text-sky-500" />}
                label="Testcases"
                isDarkMode={isDarkMode}
              >
                <span className={passedAll ? 'text-emerald-500' : 'text-amber-500'}>
                  {result.testsPassed}
                </span>
                <span className="text-muted-foreground"> / {result.testsTotal}</span>
              </StatCard>
              <StatCard
                icon={<Zap size={12} className="text-amber-500" />}
                label="Runtime"
                isDarkMode={isDarkMode}
              >
                {result.runtimeMs ?? '—'}
                <span className="ml-1 text-xs font-medium uppercase text-muted-foreground">ms</span>
              </StatCard>
              <StatCard
                icon={<Cpu size={12} className="text-violet-500" />}
                label="Memory"
                isDarkMode={isDarkMode}
              >
                {result.memoryMb != null && result.memoryMb > 0 ? result.memoryMb : '—'}
                <span className="ml-1 text-xs font-medium uppercase text-muted-foreground">mb</span>
              </StatCard>
            </div>

            {result.errorMessage && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-rose-500">
                  Error output
                </p>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-rose-500/20 bg-background/80 p-3 font-mono text-xs text-foreground custom-scrollbar">
                  {result.errorMessage}
                </pre>
              </div>
            )}

            {publicCases.length > 0 && (
              <section className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Testcase results
                </h4>

                <div className="flex flex-wrap gap-1.5">
                  {publicCases.map((tc, idx) => {
                    const active = activeCaseTab === tc.testCaseId;
                    const passed = tc.passed;
                    return (
                      <button
                        key={tc.testCaseId}
                        type="button"
                        onClick={() => setActiveCaseTab(tc.testCaseId)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                          active
                            ? 'border-sky-500 bg-sky-600 text-white shadow-sm'
                            : passed
                              ? 'border-emerald-500/35 bg-background text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400'
                              : 'border-rose-500/35 bg-background text-rose-600 hover:bg-rose-500/10 dark:text-rose-400',
                        )}
                      >
                        {passed ? (
                          <CheckCircle2 size={12} className={active ? 'text-white' : undefined} />
                        ) : (
                          <XCircle size={12} className={active ? 'text-white' : undefined} />
                        )}
                        Case {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {activeCase && (
                  <div
                    className={cn(
                      'space-y-4 rounded-xl border p-4 sm:p-5',
                      isDarkMode
                        ? 'border-border/50 bg-muted/10'
                        : 'border-border bg-white shadow-sm',
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                            activeCase.passed
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400',
                          )}
                        >
                          {activeCase.passed ? 'Passed' : 'Failed'}
                        </span>
                        {activeCase.isHidden && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                            <Lock size={10} />
                            Hidden
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {activeCase.runtimeMs != null && (
                          <span>
                            Runtime: <strong className="text-foreground">{activeCase.runtimeMs} ms</strong>
                          </span>
                        )}
                        {activeCase.memoryMb != null && activeCase.memoryMb > 0 && (
                          <span>
                            Memory:{' '}
                            <strong className="text-foreground">{activeCase.memoryMb} MB</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {activeCase.isHidden ? (
                      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center">
                        <Lock className="h-8 w-8 text-muted-foreground/60" />
                        <p className="text-sm font-semibold text-foreground">Hidden testcase</p>
                        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                          Input, expected output, and your program output are hidden. Pass all public
                          and hidden cases to get Accepted.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <TestcaseCodeBlock
                          label="Input"
                          value={activeCaseInfo?.input ?? ''}
                          emptyPlaceholder="(empty)"
                        />
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <TestcaseCodeBlock
                            label="Your output"
                            value={activeCase.output ?? ''}
                            tone={activeCase.passed ? 'passed' : 'failed'}
                            emptyPlaceholder="(no output)"
                            maxHeightClass="max-h-40"
                          />
                          <TestcaseCodeBlock
                            label="Expected output"
                            value={activeCaseInfo?.expectedOutput ?? ''}
                            tone="passed"
                            emptyPlaceholder="(empty)"
                            maxHeightClass="max-h-40"
                          />
                        </div>
                        {activeCase.error && (
                          <TestcaseCodeBlock
                            label="Stderr / error"
                            value={activeCase.error}
                            tone="failed"
                            maxHeightClass="max-h-32"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {result.status === 'Accepted' && !result.caseResults?.testCases && (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-6 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Accepted</h3>
                <p className="text-sm text-muted-foreground">All testcases passed.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center opacity-40">
            <Terminal size={40} className="text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Run or Submit to see results</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  children,
  isDarkMode,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  isDarkMode: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        isDarkMode
          ? 'border-border/50 bg-background/40'
          : 'border-border bg-white shadow-sm',
      )}
    >
      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="text-xl font-bold tabular-nums">{children}</p>
    </div>
  );
}
