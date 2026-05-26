'use client';

import { useCallback, useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, X } from 'lucide-react';
import { tagsApi, type Tag } from '@/services/tags.apis';
import { ApiRequestError } from '@/services/api-client';
import { toast } from 'sonner';

const MAX_TAGS = 40;

export type ProblemTagPickerProps = {
  value: string[];
  onChange: (ids: string[]) => void;
  /** Chỉ admin: gọi POST /tags để tạo tag mới. */
  allowCreate?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: string;
  locale?: 'vi' | 'en';
};

export function ProblemTagPicker({
  value,
  onChange,
  allowCreate = false,
  disabled = false,
  label,
  hint,
  locale = 'en',
}: ProblemTagPickerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await tagsApi.findAll();
      setTags(list);
    } catch (e) {
      console.error(e);
      const msg =
        e instanceof ApiRequestError
          ? e.body.message
          : locale === 'vi'
            ? 'Failed to fetch problem tags.'
            : 'Could not load tags.';
      toast.error(msg, { position: 'top-center' });
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => {
    if (disabled) return;
    const set = new Set(value);
    if (set.has(id)) {
      set.delete(id);
      onChange([...set]);
      return;
    }
    if (value.length >= MAX_TAGS) {
      toast.error(locale === 'vi' ? `Tối đa ${MAX_TAGS} tag.` : `At most ${MAX_TAGS} tags.`, {
        position: 'top-center',
      });
      return;
    }
    onChange([...value, id]);
  };

  const remove = (id: string) => {
    if (disabled) return;
    onChange(value.filter((x) => x !== id));
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || !allowCreate || disabled) return;
    setCreating(true);
    try {
      const created = await tagsApi.create({ name });
      setTags((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      if (!value.includes(created.id) && value.length < MAX_TAGS) {
        onChange([...value, created.id]);
      }
      toast.success(locale === 'vi' ? 'Đã tạo tag mới.' : 'Tag created.', {
        position: 'top-center',
      });
    } catch (e) {
      const msg =
        e instanceof ApiRequestError
          ? e.body.message
          : locale === 'vi'
            ? 'Không tạo được tag.'
            : 'Could not create tag.';
      toast.error(msg, { position: 'top-center' });
    } finally {
      setCreating(false);
    }
  };

  const byId = new Map(tags.map((t) => [t.id, t] as const));
  const selectedTags = value.map((id) => byId.get(id)).filter(Boolean) as Tag[];

  return (
    <div className="space-y-3">
      {label ? <Label className="text-sm font-semibold text-primary/70">{label}</Label> : null}
      {hint ? <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p> : null}

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 min-h-[28px]">
          {selectedTags.map((t) => (
            <Badge key={t.id} className="pl-2 pr-1 py-0.5 gap-1 font-normal">
              {t.name}
              <button
                type="button"
                disabled={disabled}
                className="rounded-full p-0.5 hover:bg-orange-300 disabled:opacity-50 cursor-pointer "
                aria-label={locale === 'vi' ? `Gỡ ${t.name}` : `Remove ${t.name}`}
                onClick={() => remove(t.id)}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {locale === 'vi' ? 'Đang tải tag…' : 'Loading tags…'}
        </div>
      ) : (
        <div className="max-h-40 overflow-y-auto rounded-xl border border-primary bg-slate-900 p-2">
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => {
              const on = value.includes(t.id);
              return (
                <Badge
                  key={t.id}
                  variant={on ? 'default' : 'outline'}
                  className={`cursor-pointer font-normal transition-all border-primary ${on ? 'bg-primary text-white' : 'text-primary hover:border-primary hover:scale-105 transition-transform'} ${disabled ? 'pointer-events-none opacity-50' : ''}`}
                  onClick={() => toggle(t.id)}
                >
                  {t.name}
                </Badge>
              );
            })}
          </div>
          {tags.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">
              {locale === 'vi' ? 'Chưa có tag trong hệ thống.' : 'No tags yet.'}
            </p>
          ) : null}
        </div>
      )}

      {allowCreate ? (
        <div className="flex gap-2 pt-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={locale === 'vi' ? 'Tên tag mới…' : 'New tag name…'}
            disabled={disabled || creating}
            className="rounded-xl h-9 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleCreate();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-xl h-9"
            disabled={disabled || creating || !newName.trim()}
            onClick={() => void handleCreate()}
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
