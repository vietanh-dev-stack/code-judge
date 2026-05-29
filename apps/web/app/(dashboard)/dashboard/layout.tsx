'use client';

import DashboardHeader from '@/components/dashboard/header';
import Sidebar from '@/components/dashboard/Sidebar';
import { useScrollbarHover } from '@/hooks/useScrollbarHandle';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/store/sidebar-store';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const isOpen = useSidebarStore((state) => state.isOpen);
  const mainScrollRef = useScrollbarHover();

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex min-h-0 flex-1 pt-16">
        <Sidebar />
        <main
          ref={mainScrollRef}
          className={cn(
            'custom-scrollbar flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-6 transition-[margin]',
            isOpen ? 'ml-64' : 'ml-[72px]',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
