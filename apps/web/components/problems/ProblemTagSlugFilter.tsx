'use client';

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { tagsApi, type Tag } from '@/services/tags.apis';
import { ApiRequestError } from '@/services/api-client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export type ProblemTagSlugFilterProps = {
  /** Slug tag đang chọn; chuỗi rỗng = tất cả */
  value: string;
  onChange: (slug: string) => void;
  disabled?: boolean;
  label?: string;
  allLabel?: string;
  /** Nhãn khi đang tải danh sách tag */
  loadingLabel?: string;
  triggerClassName?: string;
};

export function ProblemTagSlugFilter({
  value,
  onChange,
  disabled = false,
  label = 'Tag',
  allLabel = 'Tất cả tag',
  loadingLabel = 'Đang tải…',
  triggerClassName = 'w-[200px]',
}: ProblemTagSlugFilterProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await tagsApi.findAll();
        if (!cancelled) setTags(list);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          const msg =
            e instanceof ApiRequestError ? e.body.message : 'Không tải được danh sách tag.';
          toast.error(msg, { position: 'top-center' });
          setTags([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectValue = value.trim() || 'all';

  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      {loading ? (
        <div
          className={`flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground ${triggerClassName}`}
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          {loadingLabel}
        </div>
      ) : (
        <Select
          value={selectValue}
          onValueChange={(v) => onChange(!v || v === 'all' ? '' : v)}
          disabled={disabled}
        >
          <SelectTrigger className={triggerClassName}>
            <SelectValue placeholder={allLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{allLabel}</SelectItem>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.slug}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
