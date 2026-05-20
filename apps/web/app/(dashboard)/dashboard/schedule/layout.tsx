'use client';

import { Suspense } from 'react';
import ClassDropdown from '@/components/dashboard/schedule/ClassDropdown';
import WeekNavigation from '@/components/dashboard/schedule/WeekNavigation';

function ScheduleToolbar() {
  return (
    <div className="flex items-center justify-between gap-5 mb-4">
      <ClassDropdown />
      <WeekNavigation />
      <div />
    </div>
  );
}

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={<div className="h-10 mb-4 animate-pulse rounded-md bg-muted" />}>
        <ScheduleToolbar />
      </Suspense>
      <div className="flex-1">{children}</div>
    </div>
  );
}
