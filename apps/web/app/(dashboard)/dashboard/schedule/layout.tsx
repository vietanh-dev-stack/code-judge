'use client';

import ClassDropdown from '@/components/dashboard/schedule/ClassDropdown';
import WeekNavigation from '@/components/dashboard/schedule/WeekNavigation';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-5 mb-4">
        <ClassDropdown />
        <WeekNavigation />
        <div></div>
      </div>

      <div className="flex-1">{children}</div>
    </div>
  );
}
