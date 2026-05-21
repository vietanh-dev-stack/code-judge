import { Suspense } from 'react';
import SchedulePageContent from '@/components/dashboard/schedule/SchedulePageContent';

type Props = {
  searchParams: Promise<{ filter?: string }>;
};

export default async function SchedulePage({ searchParams }: Props) {
  const { filter } = await searchParams;
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded-md bg-muted" />}>
      <SchedulePageContent filter={filter} />
    </Suspense>
  );
}