'use client';

import DashboardHeader from '@/components/dashboard/header';
import Sidebar from '@/components/dashboard/Sidebar';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/store/sidebar-store';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const isOpen = useSidebarStore((state) => state.isOpen);
  return (
    <div>
      {/* Header */}
      <DashboardHeader />
      <div className="flex pt-16">
        <Sidebar />
        <main className={cn('flex-1 p-6 transition-all', isOpen ? 'ml-64' : 'ml-[72px]')}>
          {children}
        </main>
      </div>
    </div>
  );
}
