'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type UserAvatarProps = {
  name: string;
  imageUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
};

/**
 * Avatar dùng thẻ img (presigned MinIO / URL ngoài), không dùng next/image.
 * Presigned URL đổi theo TTL — reset lỗi khi imageUrl thay đổi.
 */
export function UserAvatar({ name, imageUrl, className, fallbackClassName }: UserAvatarProps) {
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
  }, [imageUrl]);

  const initial = (name?.charAt(0) ?? '?').toUpperCase();
  const showImage = Boolean(imageUrl?.trim()) && !loadError;

  if (!showImage) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center bg-muted font-semibold text-foreground/80',
          fallbackClassName,
        )}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={imageUrl!}
      alt={name}
      className={cn('h-full w-full object-cover', className)}
      referrerPolicy="no-referrer"
      onError={() => setLoadError(true)}
    />
  );
}
