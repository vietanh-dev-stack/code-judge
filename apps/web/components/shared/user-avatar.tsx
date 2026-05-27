'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type UserAvatarProps = {
  name: string;
  imageUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
};

/** Chỉ dùng URL có thể load trong <img> (presigned / OAuth). Bỏ qua object key thô trong DB. */
function isDisplayableAvatarUrl(url: string | null | undefined): boolean {
  const trimmed = url?.trim();
  if (!trimmed) return false;
  return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:');
}

/**
 * Avatar dùng thẻ img (presigned MinIO / URL ngoài), không dùng next/image.
 * Presigned URL đổi theo TTL — reset lỗi khi imageUrl thay đổi.
 */
export function UserAvatar({ name, imageUrl, className, fallbackClassName }: UserAvatarProps) {
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
  }, [imageUrl]);

  const initial = (name?.trim().charAt(0) || '?').toUpperCase();
  const showImage = isDisplayableAvatarUrl(imageUrl) && !loadError;

  if (!showImage) {
    return (
      <div
        className={cn(
          'flex size-full min-h-0 min-w-0 items-center justify-center bg-muted text-sm font-semibold text-foreground/80',
          fallbackClassName,
        )}
        aria-hidden
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={imageUrl!.trim()}
      alt={name}
      className={cn('size-full min-h-0 min-w-0 object-cover', className)}
      referrerPolicy="no-referrer"
      onError={() => setLoadError(true)}
    />
  );
}
