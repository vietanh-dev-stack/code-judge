import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string) {
  const date = new Date(dateString);

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return date.toLocaleDateString('en-US', options);
}

export function dateTimeLocalToUtcIso(value: string): string {
  return new Date(value).toISOString();
}

export function utcIsoToDateTimeLocal(value: string): string {
  const date = new Date(value);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

export const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);

  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
};

export const getDifficultyColor = (difficulty: string) => {
  return difficulty === 'EASY'
    ? 'bg-emerald-500/10 text-emerald-400'
    : difficulty === 'MEDIUM'
      ? 'bg-amber-500/10 text-amber-400'
      : 'bg-red-500/10 text-red-400';
};
