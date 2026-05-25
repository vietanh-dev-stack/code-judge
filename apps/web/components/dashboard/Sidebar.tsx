'use client';

import { useEffect, useState } from 'react';
import {
  Home,
  Calendar,
  Users,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Settings,
  Archive,
  Library,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useSidebarStore } from '@/store/sidebar-store';
import { useClassroomStore } from '@/store/classroom-store';
import Link from 'next/link';
import { useScrollbarHover } from '@/hooks/useScrollbarHandle';

const menuItems = [
  { icon: Home, label: 'Classroom', path: '/dashboard' },
  { icon: Calendar, label: 'Schedule', path: '/dashboard/schedule' },
  { icon: Library, label: 'Problems', path: '/dashboard/problems' },
  { icon: Trophy, label: 'Contests', path: '/dashboard/contests' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isOpen = useSidebarStore((state) => state.isOpen);
  const ref = useScrollbarHover();

  const [isTeachingExpanded, setIsTeachingExpanded] = useState(true);
  const [isEnrolledExpanded, setIsEnrolledExpanded] = useState(true);
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);

  const teaching = useClassroomStore((s) => s.teaching);
  const enrolled = useClassroomStore((s) => s.enrolled);
  const archived = useClassroomStore((s) => s.archived);

  const fetchClassrooms = useClassroomStore((s) => s.fetchClassrooms);

  // INITIAL LOAD (SAFE - ONLY ON MOUNT)
  useEffect(() => {
    fetchClassrooms();
  }, []);

  // RENDER ITEM
  const renderItem = (item: any, key: string | number) => (
    <Link
      href={item.path}
      key={key}
      className={cn(
        'flex items-center h-12 px-3 hover:border-l-3 hover:border-primary cursor-pointer text-gray-500 hover:text-primary transition-colors',
        pathname === item.path ? 'border-l-2 border-primary text-primary' : '',
      )}
    >
      {item.icon ? (
        <item.icon className="w-6 h-6 min-w-[24px]" strokeWidth={1.5} />
      ) : (
        <div
          className={cn(
            'w-6 h-6 min-w-[24px] rounded-full flex items-center justify-center text-[11px] font-bold',
            item.color,
          )}
        >
          {item.avatar}
        </div>
      )}

      <span
        className={cn(
          'ml-4 font-medium whitespace-nowrap truncate transition-all duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 invisible',
          'group-hover:opacity-100 group-hover:visible',
        )}
      >
        {item.label}
      </span>
    </Link>
  );

  // MAP DATA → UI
  const teachingList = teaching.slice(0, 3).map((c) => ({
    avatar: c.name?.charAt(0)?.toUpperCase() ?? 'C',
    label: c.name,
    path: `/dashboard/${c.id}`,
    color: 'bg-teal-100 text-teal-700',
  }));

  const enrolledList = enrolled.slice(0, 3).map((c) => ({
    avatar: c.name?.charAt(0)?.toUpperCase() ?? 'C',
    label: c.name,
    path: `/dashboard/${c.id}`,
    color: 'bg-green-100 text-green-700',
  }));

  const archivedList = archived.map((c) => ({
    avatar: c.name?.charAt(0)?.toUpperCase() ?? 'C',
    label: c.name,
    path: `/dashboard/${c.id}`,
    color: 'bg-slate-100 text-slate-500',
  }));

  // UI
  return (
    <aside
      className={cn(
        'fixed left-0 top-16 h-[calc(100vh-64px)] bg-slate-900 transition-all duration-300 ease-in-out group shadow-sm z-40 flex flex-col hover:bg-slate-900',
        isOpen ? 'w-64' : 'w-[72px] hover:w-64',
      )}
    >
      <div
        ref={ref}
        className="custom-scrollbar sidebar-scrollbar flex-1 min-h-0 flex flex-col gap-2 p-3 overflow-y-auto overflow-x-hidden"
      >
        {/* MAIN MENU */}
        {menuItems.map((item, index) => renderItem(item, index))}

        <div className="my-1 border-t border-primary" />

        {/* TEACHING */}
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setIsTeachingExpanded(!isTeachingExpanded)}
            className="flex items-center justify-between w-full h-12 px-3 hover:border-l-2 hover:border-primary hover:text-primary text-gray-500 cursor-pointer"
          >
            <div className="flex items-center">
              <Users className="w-6 h-6 min-w-[24px]" />
              <span
                className={cn(
                  'ml-4 font-medium',
                  isOpen ? 'opacity-100' : 'opacity-0 invisible',
                  'group-hover:opacity-100 group-hover:visible',
                )}
              >
                Teaching
              </span>
            </div>

            {(isOpen || isTeachingExpanded) &&
              (isTeachingExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              ))}
          </button>

          {isTeachingExpanded && (
            <div className="flex flex-col gap-1">
              {teachingList.length === 0 ? (
                <div className="hidden px-3 text-sm text-primary group-hover:block">
                  No classrooms
                </div>
              ) : (
                teachingList.map((item, index) => renderItem(item, `teach-${index}`))
              )}
            </div>
          )}
        </div>

        <div className="my-1 border-t border-primary" />

        {/* ENROLLED */}
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setIsEnrolledExpanded(!isEnrolledExpanded)}
            className="flex items-center justify-between w-full h-12 px-3 hover:border-l-2 hover:border-primary hover:text-primary text-gray-500 cursor-pointer"
          >
            <div className="flex items-center">
              <GraduationCap className="w-6 h-6 min-w-[24px]" />
              <span
                className={cn(
                  'ml-4 font-medium',
                  isOpen ? 'opacity-100' : 'opacity-0 invisible',
                  'group-hover:opacity-100 group-hover:visible',
                )}
              >
                Enrolled
              </span>
            </div>

            {(isOpen || isEnrolledExpanded) &&
              (isEnrolledExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              ))}
          </button>

          {isEnrolledExpanded && (
            <div className="flex flex-col gap-1">
              {enrolledList.length === 0 ? (
                <div className="hidden px-3 text-sm text-gray-400 group-hover:block">
                  No enrolled classes
                </div>
              ) : (
                enrolledList.map((item, index) => renderItem(item, `enrolled-${index}`))
              )}
            </div>
          )}
        </div>

        <div className="my-1 border-t border-primary" />

        {/* ARCHIVED */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center">
            <Link
              href="/dashboard/archived"
              className={cn(
                'flex items-center w-full h-12 px-3 border-l-2 border-transparent transition-all duration-200 text-gray-500',
                'hover:text-primary hover:border-primary',
                pathname === '/dashboard/archived'
                  ? 'border-primary text-primary dark:bg-slate-800 font-semibold'
                  : '',
              )}
            >
              <Archive
                className={cn(
                  'w-6 h-6 min-w-[24px]',
                  pathname === '/dashboard/archived' ? 'text-primary' : 'text-gray-500',
                )}
              />
              <span
                className={cn(
                  'ml-4 font-medium cursor-pointer ',
                  isOpen ? 'opacity-100' : 'opacity-0 invisible',
                  'group-hover:opacity-100 group-hover:visible',
                  pathname === '/dashboard/archived' ? 'text-primary' : 'text-gray-500',
                )}
              >
                Archived classes
              </span>
            </Link>

            {(isOpen || isArchivedExpanded) && (
              <button
                onClick={() => setIsArchivedExpanded(!isArchivedExpanded)}
                className="p-2 hover:bg-slate-200 rounded-lg mr-1 transition-colors"
              >
                {isArchivedExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
            )}
          </div>

          {isArchivedExpanded && (
            <div className="flex flex-col gap-1">
              {archivedList.length === 0 ? (
                <div className="hidden px-3 text-sm text-gray-400 group-hover:block ml-10">
                  No archived classes
                </div>
              ) : (
                archivedList.map((item, index) => renderItem(item, `archived-${index}`))
              )}
            </div>
          )}
        </div>

        {/* PROFILE */}
        <div className="mt-auto">
          {renderItem(
            {
              icon: Settings,
              label: 'Profile',
              path: '/dashboard/profile',
            },
            'profile-nav',
          )}
        </div>
      </div>
    </aside>
  );
}
