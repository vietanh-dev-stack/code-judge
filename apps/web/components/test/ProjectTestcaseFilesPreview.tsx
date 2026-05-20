'use client';

import { useMemo, useState } from 'react';
import { EyeIcon, FileCode2Icon, Loader2Icon, SparklesIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProjectTestFileExplanationView } from '@/components/test/ProjectTestFileExplanationView';
import {
  aiTestcaseApi,
  type ExplainProjectTestFileResult,
  type GeneratedProjectTestcaseParsed,
  type ProjectTestManifestItem,
} from '@/services/ai-testcase.apis';

function sortFilePaths(paths: string[]): string[] {
  const order = (p: string) => {
    if (p === 'package.json') return 0;
    if (p.includes('config')) return 1;
    if (p.startsWith('tests/') || p.startsWith('e2e/')) return 2;
    return 3;
  };
  return [...paths].sort((a, b) => order(a) - order(b) || a.localeCompare(b));
}

function languageHint(path: string): string {
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.js')) return 'javascript';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.sql')) return 'sql';
  return 'text';
}

type Props = {
  parsed: GeneratedProjectTestcaseParsed;
  provider?: 'openai' | 'google';
  model?: string;
};

export function ProjectTestcaseFilesPreview({ parsed, provider, model }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [explainBusy, setExplainBusy] = useState(false);
  const [explainResult, setExplainResult] = useState<ExplainProjectTestFileResult | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [explainedPath, setExplainedPath] = useState<string | null>(null);

  const filesByPath = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of parsed.files) {
      map.set(f.path, f.content);
    }
    return map;
  }, [parsed.files]);

  const sortedPaths = useMemo(
    () => sortFilePaths(parsed.files.map((f) => f.path)),
    [parsed.files],
  );

  const manifestByFile = useMemo(() => {
    const map = new Map<string, ProjectTestManifestItem[]>();
    for (const item of parsed.testManifest) {
      const list = map.get(item.filePath) ?? [];
      list.push(item);
      map.set(item.filePath, list);
    }
    return map;
  }, [parsed.testManifest]);

  const activePath = selectedPath ?? sortedPaths[0] ?? null;
  const activeContent = activePath ? filesByPath.get(activePath) ?? '' : '';
  const activeManifest = activePath ? manifestByFile.get(activePath) ?? [] : [];
  const lineCount = activeContent ? activeContent.split('\n').length : 0;

  function openPreview() {
    setSelectedPath(sortedPaths[0] ?? null);
    setExplainResult(null);
    setExplainError(null);
    setExplainedPath(null);
    setOpen(true);
  }

  async function onExplainFile(path: string) {
    const content = filesByPath.get(path);
    if (!content) return;

    setExplainBusy(true);
    setExplainError(null);
    setExplainResult(null);
    setExplainedPath(path);
    setSelectedPath(path);

    const related = manifestByFile.get(path) ?? [];

    try {
      const res = await aiTestcaseApi.explainProjectTestFile({
        filePath: path,
        fileContent: content,
        problemSummary: `${parsed.problemBrief.title}\n${parsed.problemBrief.summary}`,
        relatedTestsJson: JSON.stringify(related, null, 2),
        provider,
        model,
      });
      setExplainResult(res);
    } catch (e) {
      setExplainError(e instanceof Error ? e.message : String(e));
    } finally {
      setExplainBusy(false);
    }
  }

  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-2')}>
        <Button type="button" variant="default" size="sm" onClick={openPreview}>
          <EyeIcon className={cn('mr-2 h-4 w-4')} />
          Preview bundle ({parsed.files.length} file)
        </Button>
        <span className={cn('text-xs text-muted-foreground')}>
          Mở popup xem file — cuộn dọc và ngang để đọc đủ nội dung
        </span>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className={cn(
            'flex h-[min(92vh,920px)] w-[min(96vw,1280px)] max-w-none flex-col gap-0 p-0',
            'sm:max-w-none',
          )}
        >
          <DialogHeader className={cn('shrink-0 border-b px-5 py-4 text-left')}>
            <DialogTitle className={cn('flex items-center gap-2')}>
              <FileCode2Icon className={cn('h-5 w-5')} />
              Preview hidden tests
            </DialogTitle>
            <DialogDescription>
              {parsed.problemBrief.stack} · {parsed.files.length} files ·{' '}
              {parsed.testManifest.length} tests — cuộn trong khung mã để xem hết
            </DialogDescription>
          </DialogHeader>

          <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row')}>
            <aside
              className={cn(
                'flex max-h-[22vh] shrink-0 flex-col overflow-y-auto border-b md:max-h-none',
                'md:w-56 md:border-b-0 md:border-r',
              )}
            >
              <div className={cn('px-3 py-2 text-xs font-medium text-muted-foreground')}>
                Files
              </div>
              <ul className={cn('space-y-0.5 px-2 pb-3')}>
                {sortedPaths.map((path) => {
                  const tests = manifestByFile.get(path);
                  const isActive = path === activePath;
                  return (
                    <li key={path}>
                      <button
                        type="button"
                        className={cn(
                          'w-full rounded-md px-2 py-1.5 text-left text-xs font-mono transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted',
                        )}
                        onClick={() => {
                          setSelectedPath(path);
                          if (explainedPath !== path) {
                            setExplainResult(null);
                            setExplainError(null);
                          }
                        }}
                      >
                        <span className={cn('block break-all')}>{path}</span>
                        {tests?.length ? (
                          <span
                            className={cn(
                              'mt-0.5 block text-[10px] opacity-80',
                              !isActive && 'text-muted-foreground',
                            )}
                          >
                            {tests.length} test
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col')}>
              {activePath ? (
                <>
                  <div
                    className={cn(
                      'flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2',
                    )}
                  >
                    <code className={cn('text-xs font-medium break-all')}>{activePath}</code>
                    <Badge variant="secondary" className={cn('text-[10px]')}>
                      {languageHint(activePath)}
                    </Badge>
                    <span className={cn('text-[10px] text-muted-foreground')}>
                      {lineCount} dòng
                    </span>
                    <div className={cn('ml-auto flex gap-2')}>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={explainBusy}
                        onClick={() => void onExplainFile(activePath)}
                      >
                        {explainBusy && explainedPath === activePath ? (
                          <Loader2Icon className={cn('mr-2 h-3.5 w-3.5 animate-spin')} />
                        ) : (
                          <SparklesIcon className={cn('mr-2 h-3.5 w-3.5')} />
                        )}
                        Giải thích file này
                      </Button>
                    </div>
                  </div>

                  {activeManifest.length > 0 ? (
                    <div
                      className={cn(
                        'max-h-[100px] shrink-0 overflow-y-auto border-b bg-muted/30 px-4 py-2',
                      )}
                    >
                      <p className={cn('text-xs font-medium text-muted-foreground mb-1')}>
                        Test trong file
                      </p>
                      <ul className={cn('space-y-1 text-xs')}>
                        {activeManifest.map((t) => (
                          <li key={t.testName}>
                            <strong>{t.testName}</strong>
                            <span className={cn('text-muted-foreground')}>
                              {' '}
                              — {t.requirementIds.join(', ')} · {t.rationale}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div
                    className={cn(
                      'flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/20 px-3 pb-3',
                    )}
                  >
                    <p className={cn('shrink-0 py-2 text-[10px] text-muted-foreground')}>
                      Cuộn dọc / ngang trong khung mã để xem toàn bộ nội dung file
                    </p>
                    <pre
                      className={cn(
                        'min-h-[200px] flex-1 overflow-auto rounded-md border',
                        'bg-background p-4 text-xs leading-relaxed font-mono',
                        'whitespace-pre text-foreground',
                      )}
                    >
                      {activeContent}
                    </pre>
                  </div>

                  {explainError && explainedPath === activePath ? (
                    <div className={cn('shrink-0 border-t bg-destructive/10 px-4 py-3')}>
                      <p className={cn('text-xs text-destructive')}>{explainError}</p>
                    </div>
                  ) : null}

                  {explainResult && explainedPath === activePath ? (
                    <ProjectTestFileExplanationView
                      source={activeContent}
                      result={explainResult}
                      parseError={explainResult.parseError}
                    />
                  ) : null}
                </>
              ) : (
                <p className={cn('p-4 text-sm text-muted-foreground')}>Không có file.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
