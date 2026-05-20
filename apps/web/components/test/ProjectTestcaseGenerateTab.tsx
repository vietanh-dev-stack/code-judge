'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getApiBaseUrl } from '@/services/api-client';
import { ProjectTestcaseFilesPreview } from '@/components/test/ProjectTestcaseFilesPreview';
import {
  aiTestcaseApi,
  type GenerateAiProjectTestcaseBody,
  type GenerateProjectDraftResult,
  type ProjectTestcaseSampleKey,
  type TestGenerateProjectSampleResult,
} from '@/services/ai-testcase.apis';

const SAMPLE_KEYS: ProjectTestcaseSampleKey[] = ['backend', 'frontend', 'fullstack'];

function emptyForm(): GenerateAiProjectTestcaseBody {
  return {
    title: '',
    statement: '',
    stack: 'backend',
    framework: '',
    maxTestCases: 8,
    provider: 'google',
  };
}

export function ProjectTestcaseGenerateTab() {
  const coreUrl = useMemo(() => getApiBaseUrl().replace(/\/+$/, ''), []);

  const [samplesLoading, setSamplesLoading] = useState(true);
  const [sampleMeta, setSampleMeta] = useState<
    Record<ProjectTestcaseSampleKey, { label: string; description: string }>
  >({
    backend: { label: 'Backend', description: '' },
    frontend: { label: 'Frontend', description: '' },
    fullstack: { label: 'Fullstack', description: '' },
  });

  const [selectedSample, setSelectedSample] = useState<ProjectTestcaseSampleKey | 'custom'>('backend');
  const [form, setForm] = useState<GenerateAiProjectTestcaseBody>(emptyForm());
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState('');
  const [draftResult, setDraftResult] = useState<GenerateProjectDraftResult | null>(null);
  const [batchResult, setBatchResult] = useState<TestGenerateProjectSampleResult | null>(null);
  const loadSamples = useCallback(async () => {
    setSamplesLoading(true);
    try {
      const res = await aiTestcaseApi.listProjectTestcaseSamples();
      setSampleMeta((prev) => {
        const meta = { ...prev };
        for (const s of res.samples) {
          meta[s.key] = { label: s.label, description: s.description };
        }
        return meta;
      });
      const backend = res.samples.find((s) => s.key === 'backend');
      if (backend) {
        setForm({ ...backend.dto, provider: backend.dto.provider ?? 'google' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLog(`Không tải được samples: ${msg}`);
    } finally {
      setSamplesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSamples();
  }, [loadSamples]);

  async function applySample(key: ProjectTestcaseSampleKey) {
    setSelectedSample(key);
    setDraftResult(null);
    setBatchResult(null);
    try {
      const res = await aiTestcaseApi.listProjectTestcaseSamples();
      const found = res.samples.find((s) => s.key === key);
      if (found) {
        setForm({ ...found.dto, provider: found.dto.provider ?? form.provider ?? 'google' });
        setLog(`Đã nạp sample "${found.label}".`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLog(`Lỗi nạp sample: ${msg}`);
    }
  }

  async function onGenerateCustom() {
    if (!form.title?.trim() || !form.statement?.trim()) {
      setLog('Cần title và statement.');
      return;
    }
    setBusy(true);
    setDraftResult(null);
    setBatchResult(null);
    setLog('Đang gọi generate-project-draft…');
    try {
      const res = await aiTestcaseApi.generateProjectDraft(form);
      setDraftResult(res);
      if (res.parseError) {
        setLog(`Parse/validate lỗi: ${res.parseError}`);
      } else if (res.parsed) {
        setLog(
          `OK — ${res.parsed.testManifest.length} tests, ${res.parsed.files.length} files (${res.provider}/${res.model}).`,
        );
      } else {
        setLog('Không có parsed output.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLog(`Lỗi: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  async function onTestSample(sample: ProjectTestcaseSampleKey) {
    setBusy(true);
    setDraftResult(null);
    setBatchResult(null);
    setLog(`Đang chạy test sample "${sample}"…`);
    try {
      const res = await aiTestcaseApi.testGenerateProjectSample({
        sample,
        provider: form.provider,
        model: form.model,
      });
      setBatchResult(res);
      const row = res.results[0];
      if (row?.ok) {
        setLog(`Sample ${sample}: OK — ${row.testCount} tests, ${row.fileCount} files.`);
      } else {
        setLog(`Sample ${sample}: FAIL — ${row?.parseError ?? 'unknown'}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLog(`Lỗi: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  async function onTestAllSamples() {
    setBusy(true);
    setDraftResult(null);
    setBatchResult(null);
    setLog('Đang chạy cả 3 sample (có thể mất vài phút)…');
    try {
      const res = await aiTestcaseApi.testGenerateProjectSample({
        provider: form.provider,
        model: form.model,
      });
      setBatchResult(res);
      const okCount = res.results.filter((r) => r.ok).length;
      setLog(`Hoàn tất: ${okCount}/${res.results.length} sample pass.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLog(`Lỗi: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  const parsed = draftResult?.parsed;

  return (
    <div className={cn('space-y-8')}>
      <p className={cn('text-sm text-muted-foreground')}>
        Sinh <strong>hidden tests PROJECT</strong> (problemBrief + file bundle). Cần JWT role{' '}
        <code className={cn('rounded bg-muted px-1')}>ADMIN</code> và API key AI. Core:{' '}
        <code className={cn('rounded bg-muted px-1')}>{coreUrl}</code>
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Sample &amp; provider</CardTitle>
          <CardDescription>
            Chọn sample tích hợp sẵn hoặc chỉnh form tuỳ chỉnh rồi Generate.
          </CardDescription>
        </CardHeader>
        <CardContent className={cn('space-y-4')}>
          <div className={cn('flex flex-wrap gap-2')}>
            {SAMPLE_KEYS.map((key) => (
              <Button
                key={key}
                type="button"
                variant={selectedSample === key ? 'default' : 'outline'}
                size="sm"
                disabled={samplesLoading || busy}
                onClick={() => void applySample(key)}
              >
                {sampleMeta[key]?.label ?? key}
              </Button>
            ))}
            <Button
              type="button"
              variant={selectedSample === 'custom' ? 'default' : 'outline'}
              size="sm"
              disabled={busy}
              onClick={() => setSelectedSample('custom')}
            >
              Tuỳ chỉnh
            </Button>
          </div>

          {selectedSample !== 'custom' && sampleMeta[selectedSample as ProjectTestcaseSampleKey] ? (
            <p className={cn('text-xs text-muted-foreground')}>
              {sampleMeta[selectedSample as ProjectTestcaseSampleKey].description}
            </p>
          ) : null}

          <div className={cn('grid gap-2 md:max-w-xs')}>
            <Label>Provider</Label>
            <Select
              value={form.provider ?? 'google'}
              onValueChange={(v) => {
                if (v === 'openai' || v === 'google') {
                  setForm((f) => ({ ...f, provider: v }));
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google">google</SelectItem>
                <SelectItem value="openai">openai</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={cn('flex flex-wrap gap-2')}>
            <Button
              type="button"
              disabled={busy || samplesLoading || selectedSample === 'custom'}
              onClick={() => {
                if (selectedSample !== 'custom') {
                  void onTestSample(selectedSample);
                }
              }}
            >
              {busy ? <Loader2Icon className={cn('mr-2 h-4 w-4 animate-spin')} /> : null}
              Test sample đang chọn
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void onTestAllSamples()}>
              Test cả 3 sample
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void onGenerateCustom()}>
              Generate (form hiện tại)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Đề bài &amp; ngữ cảnh</CardTitle>
          <CardDescription>Gửi tới POST /ai-testcase/generate-project-draft</CardDescription>
        </CardHeader>
        <CardContent className={cn('space-y-4')}>
          <div className={cn('grid gap-4 md:grid-cols-3')}>
            <div className={cn('grid gap-2')}>
              <Label>Stack</Label>
              <Select
                value={form.stack ?? 'backend'}
                onValueChange={(v) => {
                  if (v === 'backend' || v === 'frontend' || v === 'fullstack') {
                    setForm((f) => ({ ...f, stack: v }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backend">backend</SelectItem>
                  <SelectItem value="frontend">frontend</SelectItem>
                  <SelectItem value="fullstack">fullstack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={cn('grid gap-2')}>
              <Label>Framework</Label>
              <Input
                value={form.framework ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, framework: e.target.value }))}
                placeholder="nest, react, …"
              />
            </div>
            <div className={cn('grid gap-2')}>
              <Label>maxTestCases</Label>
              <Input
                type="number"
                min={1}
                max={25}
                value={form.maxTestCases ?? 8}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxTestCases: Number(e.target.value) || 8 }))
                }
              />
            </div>
          </div>

          <div className={cn('grid gap-2')}>
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className={cn('grid gap-2')}>
            <Label>Statement</Label>
            <Textarea
              value={form.statement}
              onChange={(e) => setForm((f) => ({ ...f, statement: e.target.value }))}
              className={cn('min-h-[140px] font-mono text-sm')}
            />
          </div>

          <div className={cn('grid gap-2')}>
            <Label>Golden summary (tuỳ chọn)</Label>
            <Textarea
              value={form.goldenSummary ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, goldenSummary: e.target.value }))}
              className={cn('min-h-[80px] text-sm')}
            />
          </div>

          <div className={cn('grid gap-2')}>
            <Label>Rubric (tuỳ chọn)</Label>
            <Textarea
              value={form.rubric ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, rubric: e.target.value }))}
              className={cn('min-h-[60px] text-sm')}
            />
          </div>
        </CardContent>
        <CardFooter className={cn('flex-wrap gap-2')}>
          <Button type="button" disabled={busy} onClick={() => void onGenerateCustom()}>
            {busy ? <Loader2Icon className={cn('mr-2 h-4 w-4 animate-spin')} /> : null}
            Generate project draft
          </Button>
        </CardFooter>
      </Card>

      {batchResult ? (
        <Card>
          <CardHeader>
            <CardTitle>Kết quả test sample</CardTitle>
            <CardDescription>mode: {batchResult.mode}</CardDescription>
          </CardHeader>
          <CardContent className={cn('space-y-3')}>
            {batchResult.results.map((r) => (
              <div
                key={r.sample}
                className={cn('rounded-lg border p-3 text-sm space-y-1')}
              >
                <div className={cn('flex flex-wrap items-center gap-2')}>
                  <span className={cn('font-medium')}>{r.label}</span>
                  <Badge variant={r.ok ? 'default' : 'destructive'}>{r.ok ? 'OK' : 'FAIL'}</Badge>
                  <span className={cn('text-xs text-muted-foreground')}>
                    {r.testCount ?? 0} tests · {r.fileCount ?? 0} files
                  </span>
                </div>
                {r.parseError ? (
                  <p className={cn('text-xs text-destructive')}>{r.parseError}</p>
                ) : null}
                {r.problemBrief ? (
                  <p className={cn('text-xs text-muted-foreground line-clamp-2')}>
                    {r.problemBrief.summary}
                  </p>
                ) : null}
                {r.validation && !r.validation.valid ? (
                  <ul className={cn('text-xs text-destructive list-disc pl-4')}>
                    {r.validation.issues.slice(0, 5).map((i) => (
                      <li key={`${i.code}-${i.message}`}>
                        {i.code}: {i.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {draftResult ? (
        <Card>
          <CardHeader>
            <CardTitle>Kết quả generate draft</CardTitle>
            <CardDescription>
              {draftResult.provider} / {draftResult.model} · {draftResult.promptVersion}
            </CardDescription>
          </CardHeader>
          <CardContent className={cn('space-y-6')}>
            {draftResult.validation ? (
              <Badge variant={draftResult.validation.valid ? 'default' : 'destructive'}>
                Validator: {draftResult.validation.valid ? 'pass' : 'fail'}
              </Badge>
            ) : null}

            {draftResult.parseError ? (
              <p className={cn('text-sm text-destructive')}>{draftResult.parseError}</p>
            ) : null}

            {parsed ? (
              <>
                <div className={cn('space-y-2')}>
                  <h3 className={cn('text-sm font-semibold')}>problemBrief</h3>
                  <p className={cn('text-sm')}>{parsed.problemBrief.summary}</p>
                  <ul className={cn('text-xs space-y-1 list-disc pl-4')}>
                    {parsed.problemBrief.functionalRequirements.map((fr) => (
                      <li key={fr.id}>
                        <strong>{fr.id}</strong> ({fr.priority}): {fr.description}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={cn('space-y-2')}>
                  <h3 className={cn('text-sm font-semibold')}>testManifest</h3>
                  <div className={cn('overflow-x-auto')}>
                    <table className={cn('w-full text-xs border-collapse')}>
                      <thead>
                        <tr className={cn('border-b text-left')}>
                          <th className={cn('p-2')}>Test</th>
                          <th className={cn('p-2')}>FR</th>
                          <th className={cn('p-2')}>File</th>
                          <th className={cn('p-2')}>Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.testManifest.map((t) => (
                          <tr key={t.testName} className={cn('border-b border-border/50')}>
                            <td className={cn('p-2 font-medium')}>{t.testName}</td>
                            <td className={cn('p-2')}>{t.requirementIds.join(', ')}</td>
                            <td className={cn('p-2 font-mono')}>{t.filePath}</td>
                            <td className={cn('p-2')}>{t.weight}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <ProjectTestcaseFilesPreview
                  parsed={parsed}
                  provider={form.provider}
                  model={form.model}
                />

                <div className={cn('text-xs text-muted-foreground')}>
                  <code>install</code>: {parsed.runConfig.installCommand}
                  <br />
                  <code>test</code>: {parsed.runConfig.testCommand}
                  <br />
                  <code>parser</code>: {parsed.runConfig.resultParser}
                </div>
              </>
            ) : null}

            <details className={cn('text-xs')}>
              <summary className={cn('cursor-pointer font-medium')}>Raw JSON (rút gọn)</summary>
              <pre className={cn('mt-2 max-h-[200px] overflow-auto rounded border p-2')}>
                {draftResult.raw.length > 8000
                  ? `${draftResult.raw.slice(0, 8000)}…`
                  : draftResult.raw}
              </pre>
            </details>
          </CardContent>
        </Card>
      ) : null}

      <div className={cn('space-y-2')}>
        <Label>Log</Label>
        <Textarea
          readOnly
          value={log}
          className={cn('min-h-[100px] font-mono text-xs')}
          placeholder="Nhật ký thao tác…"
        />
      </div>
    </div>
  );
}
