'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function ClassTabs({ classId }: { classId: string }) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Class Posts', href: `/dashboard/${classId}` },
    { name: 'Class Assignments', href: `/dashboard/${classId}/classwork` },
    { name: 'Contests', href: `/dashboard/${classId}/contests` },
    { name: 'People', href: `/dashboard/${classId}/people` },
  ];

  return (
    <div className="flex items-center space-x-2">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              'px-4 py-3 text-sm font-medium transition-colors border-b-4',
              isActive
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-black hover:border-gray-300',
            )}
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
