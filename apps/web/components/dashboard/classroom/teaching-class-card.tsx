'use client';

import { Users, FileCode2, MoreVertical, Archive, RefreshCw, LogOut } from 'lucide-react';
import Link from 'next/link';
import { ClassroomListItem } from '@/services/classroom.apis';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { getClassroomBannerImage } from '@/lib/classroom-banner';

interface TeachingClassCardProps {
  classroom: ClassroomListItem;
  onArchive?: () => void;
  onRestore?: () => void;
  onLeave?: () => void;
}

export default function TeachingClassCard({
  classroom,
  onArchive,
  onRestore,
  onLeave,
}: TeachingClassCardProps) {
  const bannerImg = getClassroomBannerImage(classroom.id);

  // Calculate student count (enrollments - 1 to exclude the teacher owner, or fallback to 0)
  const totalStudents = classroom._count ? Math.max(0, classroom._count.enrollments - 1) : 0;

  // Number of labs/assignments
  const totalLabs = classroom.assignments ? classroom.assignments.length : 0;

  return (
    <div className="w-[300px] h-[370px] bg-[#111b38] border border-white/5 rounded-2xl overflow-hidden flex flex-col shrink-0 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all duration-300 hover:border-orange-500/20 group relative">
      {/* Top Banner with Image */}
      <div className="h-[140px] w-full relative overflow-hidden">
        <img
          src={bannerImg}
          alt={classroom.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111b38] via-transparent to-black/30" />

        {/* Code Badge overlay */}
        <span className="absolute bottom-3 left-4 px-2.5 py-1 text-xs font-semibold rounded bg-[#ea580c] text-white uppercase tracking-wider shadow-md">
          {classroom.classCode}
        </span>

        {/* Dropdown Options Menu */}
        <div className="absolute top-3 right-3 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/10 cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-[#16213f] border border-white/10 text-white"
            >
              {classroom.isActive ? (
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                  onClick={onArchive}
                >
                  <Archive className="w-4 h-4 mr-2 text-orange-400" />
                  Archive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                  onClick={onRestore}
                >
                  <RefreshCw className="w-4 h-4 mr-2 text-emerald-400" />
                  Restore
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Card Contents */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-xl font-bold text-white leading-tight line-clamp-1 group-hover:text-orange-400 transition-colors">
            {classroom.name}
          </h4>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
            {classroom.academicYear || 'No Academic Year'}
          </p>
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2 h-[40px] leading-relaxed">
            {classroom.description || 'No classroom description available.'}
          </p>
        </div>

        <div>
          {/* Divider line */}
          <div className="w-full h-px bg-white/10 my-4" />

          {/* Stats row */}
          <div className="flex justify-between items-center text-xs text-slate-300 font-semibold mb-4 px-1">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-orange-400" />
              <span>
                {totalStudents} {totalStudents === 1 ? 'Student' : 'Students'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileCode2 className="w-4 h-4 text-emerald-400" />
              <span>
                {totalLabs} {totalLabs === 1 ? 'Post' : 'Posts'}
              </span>
            </div>
          </div>

          {/* Manage Button */}
          <Link
            href={`/dashboard/${classroom.id}`}
            className="flex items-center justify-center w-full py-2.5 bg-[#dbeafe] hover:bg-[#bfdbfe] text-[#1e3a8a] font-bold rounded-xl transition duration-300 shadow-sm"
          >
            Manage Class
          </Link>
        </div>
      </div>
    </div>
  );
}
