'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ExplainProjectTestFileResult } from '@/services/ai-testcase.apis';

const BLOCK_COLORS = [
  'bg-sky-500/10 border-l-sky-500',
  'bg-emerald-500/10 border-l-emerald-500',
  'bg-amber-500/10 border-l-amber-500',
  'bg-violet-500/10 border-l-violet-500',
  'bg-rose-500/10 border-l-rose-500',
  'bg-cyan-500/10 border-l-cyan-500',
];

type ViewMode = 'annotated' | 'blocks' | 'tests';

function lineRangeLabel(start: number, end: number): string {
  return start === end ? `dòng ${start}` : `dòng ${start}–${end}`;
}

type Props = {
  source: string;
  result: ExplainProjectTestFileResult;
  parseError?: string | null;
};

export function ProjectTestFileExplanationView({ source, result, parseError }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('annotated');
  const lines = useMemo(() => source.split('\n'), [source]);
  const structured = result.structured;

  const blockIndexByLine = useMemo(() => {
    const map = new Map<number, number>();
    if (!structured) return map;
    structured.lineBlocks.forEach((block, idx) => {
      for (let ln = block.lineStart; ln <= block.lineEnd; ln++) {
        map.set(ln, idx);
      }
    });
    return map;
  }, [structured]);

  const coveredLineCount = useMemo(() => {
    const set = new Set<number>();
    structured?.lineBlocks.forEach((b) => {
      for (let ln = b.lineStart; ln <= b.lineEnd; ln++) set.add(ln);
    });
    return set.size;
  }, [structured]);

  if (!structured) {
    return (
      <div className={cn('space-y-2 border-t bg-muted/30 px-4 py-3')}>
        <p className={cn('text-xs font-semibold text-destructive')}>Không parse được cấu trúc giải thích</p>
        {parseError ? <p className={cn('text-xs text-destructive')}>{parseError}</p> : null}
        {result.explanation ? (
          <pre className={cn('text-xs whitespace-pre-wrap leading-relaxed')}>{result.explanation}</pre>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('flex min-h-0 flex-col border-t bg-muted/20')}>
      {parseError ? (
        <p className={cn('shrink-0 border-b bg-amber-500/10 px-3 py-1.5 text-[10px] text-amber-800 dark:text-amber-200')}>
          Cảnh báo: {parseError}
        </p>
      ) : null}

      <div className={cn('flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2')}>
        <span className={cn('text-xs font-semibold')}>Giải thích theo dòng</span>
        {(['annotated', 'blocks', 'tests'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={cn(
              'rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors',
              viewMode === mode ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80',
            )}
            onClick={() => setViewMode(mode)}
          >
            {mode === 'annotated' ? 'Mã + chú thích' : mode === 'blocks' ? 'Khối mã' : 'Test case'}
          </button>
        ))}
      </div>

      <div className={cn('shrink-0 space-y-2 border-b px-4 py-3 text-xs')}>
        <p>
          <span className={cn('font-semibold text-foreground')}>Mục đích: </span>
          {structured.filePurpose}
        </p>
        <p>
          <span className={cn('font-semibold text-foreground')}>Code học viên: </span>
          {structured.studentCodeInteraction}
        </p>
      </div>

      {viewMode === 'annotated' ? (
        <div
          className={cn(
            'min-h-[160px] max-h-[min(32vh,320px)] flex-1 overflow-auto font-mono text-[11px] leading-5',
          )}
        >
          <table className={cn('w-full border-collapse')}>
            <tbody>
              {lines.map((line, i) => {
                const lineNo = i + 1;
                const blockIdx = blockIndexByLine.get(lineNo);
                const block =
                  blockIdx !== undefined ? structured.lineBlocks[blockIdx] : undefined;
                const isBlockStart = block && block.lineStart === lineNo;
                const colorClass =
                  blockIdx !== undefined ? BLOCK_COLORS[blockIdx % BLOCK_COLORS.length] : '';

                return (
                  <tr
                    key={lineNo}
                    className={cn(
                      'align-top border-b border-border/30',
                      colorClass,
                      blockIdx !== undefined && 'border-l-2',
                    )}
                  >
                    <td
                      className={cn(
                        'w-10 shrink-0 select-none py-0.5 pr-2 text-right text-muted-foreground',
                        'sticky left-0 bg-inherit',
                      )}
                    >
                      {lineNo}
                    </td>
                    <td className={cn('min-w-0 py-0.5 pr-2 whitespace-pre text-foreground')}>
                      {line || ' '}
                    </td>
                    <td
                      className={cn(
                        'hidden w-[min(220px,38%)] shrink-0 py-0.5 pl-2 text-[10px] leading-snug sm:table-cell',
                        'text-muted-foreground border-l border-border/40',
                      )}
                    >
                      {isBlockStart && block ? (
                        <div className={cn('space-y-0.5 pr-2')}>
                          <span className={cn('font-semibold text-foreground')}>{block.label}</span>
                          <p>{block.responsibility}</p>
                          {block.relatedRequirementIds?.length ? (
                            <div className={cn('flex flex-wrap gap-1 pt-0.5')}>
                              {block.relatedRequirementIds.map((id) => (
                                <Badge key={id} variant="outline" className={cn('text-[9px] px-1 py-0')}>
                                  {id}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : block ? (
                        <span className={cn('opacity-40')}>↳</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {viewMode === 'blocks' ? (
        <div className={cn('max-h-[min(32vh,320px)] flex-1 overflow-y-auto p-3 space-y-2')}>
          {structured.lineBlocks.map((block, idx) => (
            <div
              key={`${block.lineStart}-${block.lineEnd}-${block.label}`}
              className={cn(
                'rounded-md border border-l-4 p-3 text-xs',
                BLOCK_COLORS[idx % BLOCK_COLORS.length],
              )}
            >
              <div className={cn('mb-1 flex flex-wrap items-center gap-2')}>
                <Badge variant="secondary" className={cn('font-mono text-[10px]')}>
                  {lineRangeLabel(block.lineStart, block.lineEnd)}
                </Badge>
                <span className={cn('font-semibold')}>{block.label}</span>
                {block.relatedRequirementIds?.map((id) => (
                  <Badge key={id} variant="outline" className={cn('text-[9px]')}>
                    {id}
                  </Badge>
                ))}
              </div>
              <p className={cn('leading-relaxed text-muted-foreground')}>{block.responsibility}</p>
              <pre className={cn('mt-2 max-h-24 overflow-auto rounded bg-background/80 p-2 font-mono text-[10px]')}>
                {lines.slice(block.lineStart - 1, block.lineEnd).join('\n')}
              </pre>
            </div>
          ))}
        </div>
      ) : null}

      {viewMode === 'tests' ? (
        <div className={cn('max-h-[min(32vh,320px)] flex-1 overflow-y-auto p-3')}>
          {structured.testBreakdown.length === 0 ? (
            <p className={cn('text-xs text-muted-foreground')}>Không có test breakdown từ AI.</p>
          ) : (
            <table className={cn('w-full text-xs border-collapse')}>
              <thead>
                <tr className={cn('border-b text-left text-muted-foreground')}>
                  <th className={cn('p-2 font-medium')}>Test</th>
                  <th className={cn('p-2 font-medium')}>Dòng</th>
                  <th className={cn('p-2 font-medium')}>Kiểm tra gì</th>
                </tr>
              </thead>
              <tbody>
                {structured.testBreakdown.map((t) => (
                  <tr key={t.testName} className={cn('border-b border-border/40 align-top')}>
                    <td className={cn('p-2 font-medium')}>{t.testName}</td>
                    <td className={cn('p-2 font-mono whitespace-nowrap')}>
                      {t.lineStart && t.lineEnd
                        ? lineRangeLabel(t.lineStart, t.lineEnd)
                        : '—'}
                    </td>
                    <td className={cn('p-2 text-muted-foreground')}>
                      {t.validates}
                      {t.expectedBehavior ? (
                        <span className={cn('mt-1 block text-foreground/80')}>
                          Kỳ vọng: {t.expectedBehavior}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {structured.reviewChecklist.length > 0 ? (
        <div className={cn('shrink-0 border-t px-4 py-2')}>
          <p className={cn('text-[10px] font-semibold text-muted-foreground mb-1')}>Checklist review</p>
          <ul className={cn('list-disc pl-4 text-[11px] text-muted-foreground space-y-0.5')}>
            {structured.reviewChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {coveredLineCount < lines.length ? (
        <p className={cn('shrink-0 px-4 py-1 text-[10px] text-amber-600 dark:text-amber-400')}>
          AI chưa gán đủ {lines.length - coveredLineCount} dòng — xem tab Khối mã.
        </p>
      ) : null}
    </div>
  );
}
