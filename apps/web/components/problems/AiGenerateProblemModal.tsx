'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { problemsApi, type GenerateProblemStatementResult } from '@/services/problem.apis';
import { ApiRequestError } from '@/services/api-client';
import { toast } from 'sonner';

type Locale = 'vi' | 'en';

export type AiGeneratedProblemApplyPayload = {
  title: string;
  description: string;
  statementMd: string;
  ioSpec: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimitMs?: number;
  memoryLimitMb?: number;
};

const COPY: Record<
  Locale,
  {
    title: string;
    description: string;
    topic: string;
    topicPh: string;
    difficulty: string;
    diffDefault: string;
    supplementary: string;
    supplementaryPh: string;
    provider: string;
    provDefault: string;
    provGoogle: string;
    provOpenai: string;
    generate: string;
    generating: string;
    apply: string;
    applyHint: string;
    previewTitle: string;
    previewDesc: string;
    previewStatement: string;
    previewIo: string;
    previewLimits: string;
    parseWarn: string;
    needTopic: string;
    notes: string;
    revisionPh: string;
    reviseLabel: string;
  }
> = {
  vi: {
    title: 'AI tạo đề bài',
    description:
      'Mô tả ý tưởng hoặc chủ đề — AI sẽ viết tiêu đề, mô tả ngắn, đề markdown (stdin/stdout) và ioSpec cho sinh testcase.',
    topic: 'Ý tưởng / chủ đề bài *',
    topicPh:
      'Ví dụ: Đếm số cách đi từ góc trên-trái xuống góc dưới-phải lưới n×m, chỉ đi phải hoặc xuống. Giới hạn n,m ≤ 10^6.',
    difficulty: 'Độ khó mong muốn',
    diffDefault: 'Để AI chọn',
    supplementary: 'Ghi chú thêm (tuỳ chọn)',
    supplementaryPh: 'Tag, giới hạn đặc biệt, không dùng recursion, v.v.',
    provider: 'Provider',
    provDefault: 'Mặc định server',
    provGoogle: 'Google (Gemini)',
    provOpenai: 'OpenAI',
    generate: 'Sinh đề bằng AI',
    generating: 'Đang sinh đề…',
    apply: 'Áp dụng vào form',
    applyHint: 'Ghi đè title, mô tả, statement và ioSpec trong form tạo bài.',
    previewTitle: 'Tiêu đề',
    previewDesc: 'Mô tả ngắn',
    previewStatement: 'Đề bài (markdown)',
    previewIo: 'ioSpec',
    previewLimits: 'Gợi ý limit',
    parseWarn: 'AI trả về nhưng không parse được JSON.',
    needTopic: 'Nhập ý tưởng / chủ đề trước.',
    notes: 'Ghi chú AI',
    revisionPh: 'Yêu cầu chỉnh sửa lần này (nếu đã có bản nháp)…',
    reviseLabel: 'Chỉnh sửa từ bản trước',
  },
  en: {
    title: 'AI generate problem',
    description:
      'Describe the idea — AI writes title, short description, markdown statement (stdin/stdout), and ioSpec for testcase generation.',
    topic: 'Topic / idea *',
    topicPh:
      'e.g. Count paths from top-left to bottom-right on an n×m grid, moving only right or down. Constraints n,m ≤ 10^6.',
    difficulty: 'Target difficulty',
    diffDefault: 'Let AI choose',
    supplementary: 'Extra notes (optional)',
    supplementaryPh: 'Tags, special limits, no recursion, etc.',
    provider: 'Provider',
    provDefault: 'Server default',
    provGoogle: 'Google (Gemini)',
    provOpenai: 'OpenAI',
    generate: 'Generate with AI',
    generating: 'Generating…',
    apply: 'Apply to form',
    applyHint: 'Overwrites title, description, statement, and ioSpec in the create form.',
    previewTitle: 'Title',
    previewDesc: 'Short description',
    previewStatement: 'Statement (markdown)',
    previewIo: 'ioSpec',
    previewLimits: 'Suggested limits',
    parseWarn: 'AI responded but JSON parse failed.',
    needTopic: 'Enter a topic or idea first.',
    notes: 'AI notes',
    revisionPh: 'Revision request for this run (if refining a draft)…',
    reviseLabel: 'Revise previous draft',
  },
};

export function AiGenerateProblemModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale?: Locale;
  existingTitle?: string;
  existingStatement?: string;
  defaultDifficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  onApply: (payload: AiGeneratedProblemApplyPayload) => void;
}) {
  const {
    open,
    onOpenChange,
    locale = 'en',
    existingTitle,
    existingStatement,
    defaultDifficulty,
    onApply,
  } = props;
  const t = COPY[locale];

  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<string>('auto');
  const [supplementary, setSupplementary] = useState('');
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [provider, setProvider] = useState<'default' | 'google' | 'openai'>('default');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GenerateProblemStatementResult | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error(t.needTopic, { position: 'top-center' });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await problemsApi.generateStatementDraft({
        topic: topic.trim(),
        locale,
        difficulty: difficulty === 'auto' ? undefined : difficulty,
        supplementaryText: supplementary.trim() || undefined,
        existingTitle: existingTitle?.trim() || undefined,
        existingStatement: existingStatement?.trim() || undefined,
        provider: provider === 'default' ? undefined : provider,
        revision: revisionFeedback.trim() ? { userFeedback: revisionFeedback.trim() } : undefined,
      });
      setResult(res);
      if (!res.parsed) {
        toast.warning(t.parseWarn, {
          position: 'top-center',
          description: res.parseError,
        });
      }
    } catch (err) {
      const msg =
        err instanceof ApiRequestError
          ? err.body.message
          : err instanceof Error
            ? err.message
            : String(err);
      toast.error(msg, { position: 'top-center' });
    } finally {
      setBusy(false);
    }
  };

  const handleApply = () => {
    const parsed = result?.parsed;
    if (!parsed) return;
    onApply({
      title: parsed.title,
      description: parsed.description,
      statementMd: parsed.statementMd,
      ioSpec: parsed.ioSpec,
      difficulty: parsed.suggestedDifficulty ?? defaultDifficulty,
      timeLimitMs: parsed.suggestedTimeLimitMs ?? 1000,
      memoryLimitMb: parsed.suggestedMemoryLimitMb ?? 256,
    });
    toast.success(locale === 'vi' ? 'Đã áp dụng đề vào form.' : 'Applied problem draft to form.', {
      position: 'top-center',
    });
    onOpenChange(false);
  };

  const parsed = result?.parsed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(92vh,820px)] w-[min(96vw,720px)] max-w-none flex-col gap-0 border-border bg-card p-4 sm:max-w-none"
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            {t.title}
          </DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-2">
            <Label className="text-primary">{t.topic}</Label>
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t.topicPh}
              className="min-h-[100px] text-sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-primary">{t.difficulty}</Label>
              <Select
                value={difficulty}
                onValueChange={(v) => {
                  if (v) setDifficulty(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t.diffDefault}</SelectItem>
                  <SelectItem value="EASY">EASY</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                  <SelectItem value="HARD">HARD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-primary">{t.supplementary}</Label>
            <Textarea
              value={supplementary}
              onChange={(e) => setSupplementary(e.target.value)}
              placeholder={t.supplementaryPh}
              className="min-h-[56px] text-sm"
            />
          </div>

          {result ? (
            <div className="grid gap-2">
              <Label className="text-primary">{t.reviseLabel}</Label>
              <Textarea
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                placeholder={t.revisionPh}
                className="min-h-[48px] text-sm"
              />
            </div>
          ) : null}

          {parsed ? (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3 text-sm">
              <p className="text-xs text-muted-foreground">
                {result?.provider}/{result?.model}
                {parsed.suggestedDifficulty ? ` · ${parsed.suggestedDifficulty}` : ''}
              </p>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t.previewTitle}</p>
                <p className="font-medium">{parsed.title}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t.previewDesc}</p>
                <p className="text-sm">{parsed.description}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t.previewIo}</p>
                <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap font-mono text-[11px]">
                  {parsed.ioSpec}
                </pre>
              </div>
              {parsed.suggestedTimeLimitMs ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t.previewLimits}</p>
                  <p className="text-sm font-medium">
                    {parsed.suggestedTimeLimitMs} ms · {parsed.suggestedMemoryLimitMb ?? 256} MB
                    {parsed.suggestedDifficulty ? ` · ${parsed.suggestedDifficulty}` : ''}
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t.previewStatement}</p>
                <pre className="mt-1 max-h-[min(32vh,280px)] overflow-auto whitespace-pre-wrap font-mono text-[11px]">
                  {parsed.statementMd}
                </pre>
              </div>
              {parsed.notes ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t.notes}</p>
                  <p className="text-xs">{parsed.notes}</p>
                </div>
              ) : null}
            </div>
          ) : result?.parseError ? (
            <pre className="max-h-32 overflow-auto rounded border p-2 text-[10px] text-destructive">
              {result.parseError}
            </pre>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2 border-t border-border bg-card px-5 py-4 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground sm:max-w-[55%]">{t.applyHint}</p>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer border-primary/70 text-primary hover:text-primary hover:bg-primary/20"
            >
              {locale === 'vi' ? 'Đóng' : 'Close'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer border-primary/70 text-primary hover:text-primary hover:bg-primary/20"
              disabled={busy}
              onClick={() => void handleGenerate()}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {busy
                ? t.generating
                : result
                  ? locale === 'vi'
                    ? 'Sinh lại'
                    : 'Regenerate'
                  : t.generate}
            </Button>
            <Button
              className="cursor-pointer"
              type="button"
              disabled={!parsed || busy}
              onClick={handleApply}
            >
              {t.apply}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
