'use client';

import { FolderOpen, Contact2, MoreVertical, Archive, RefreshCw, LogOut } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface ClassCardProps {
  id: string;
  title: string;
  subTitle?: string;
  teacher: string;
  bannerBg?: string;
  avatar?: string | null;
  isOwner?: boolean;
  isActive?: boolean;
  onArchive?: () => void;
  onRestore?: () => void;
  onLeave?: () => void;
}

export default function ClassCard({
  id,
  title,
  subTitle,
  teacher,
  bannerBg = 'bg-slate-700',
  avatar,
  isOwner,
  isActive = true,
  onArchive,
  onRestore,
  onLeave,
}: ClassCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow group relative h-[280px] flex flex-col">
      {/* Banner */}
      <div className={`${bannerBg} p-4 h-[100px] relative text-white`}>
        <div className="flex justify-between items-start">
          <Link
            href={`/dashboard/${id}`}
            className="font-bold text-xl hover:underline truncate pr-6"
          >
            {title}
          </Link>
        </div>

        <p className="text-sm truncate">{subTitle}</p>

        <p className="text-xs mt-2 hover:underline">{teacher}</p>

        <img
          src={avatar || 'https://i.pravatar.cc/150'}
          alt="teacher"
          className="absolute -bottom-8 right-4 w-16 h-16 rounded-full border-4 border-white object-cover"
        />
      </div>

      <div className="flex-1" />

      {/* Footer */}
      <div className="border-t border-gray-100 p-3 flex justify-end items-center gap-4 text-gray-500">
        <Link href={`/dashboard/${id}/people`}>
          <Contact2 className="w-5 h-5 hover:text-blue-500" />
        </Link>

        <Link href={`/dashboard/${id}/classwork`}>
          <FolderOpen className="w-5 h-5 hover:text-blue-500" />
        </Link>

        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full cursor-pointer">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isActive ? (
                <DropdownMenuItem className="cursor-pointer" onClick={onArchive}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="cursor-pointer" onClick={onRestore}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Restore
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
