'use client';

import { MoreVertical, LogOut } from 'lucide-react';
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

interface EnrolledClassCardProps {
  classroom: ClassroomListItem;
  onLeave?: () => void;
}

export default function EnrolledClassCard({ classroom, onLeave }: EnrolledClassCardProps) {
  const cardImg = getClassroomBannerImage(classroom.id);

  return (
    <div className="w-[460px] h-[190px] bg-[#111b38] border border-white/5 rounded-2xl flex shrink-0 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all duration-300 hover:border-emerald-500/20 group relative overflow-hidden">
      {/* Left side: Tech Image */}
      <div className="w-[140px] h-[158px] shrink-0 overflow-hidden relative rounded-xl ml-4 my-4">
        <img
          src={cardImg}
          alt={classroom.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#111b38]/40 to-transparent" />
      </div>

      {/* Right side: Details & Progress */}
      <div className="p-4 flex-1 flex flex-col justify-between overflow-hidden">
        {/* Header (Title, Badge & Dropdown) */}
        <div>
          <div className="flex justify-between items-start gap-1 pr-6 relative">
            <h4 className="text-lg font-bold text-white leading-tight line-clamp-1 group-hover:text-emerald-400 transition-colors">
              {classroom.name}
            </h4>

            {/* Options Dropdown */}
            <div className="absolute right-0 -top-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[#16213f] border border-white/10 text-white"
                >
                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-white/10 focus:bg-white/10 text-rose-400 focus:text-rose-400"
                    onClick={onLeave}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Leave Class
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Badge and Teacher Name */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 rounded uppercase tracking-wider">
              {classroom.classCode}
            </span>
            <span className="text-xs text-slate-400 truncate max-w-[150px]">
              by {classroom.owner?.name ?? 'Unknown'}
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
            {classroom.description || 'No classroom description available.'}
          </p>
        </div>

        {/* Progress and Action Button */}
        <div>
          {/* View Class Button */}
          <div className="flex gap-2">
            <Link
              href={`/dashboard/${classroom.id}`}
              className="flex-1 flex items-center justify-center py-2 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold rounded-xl text-xs transition duration-300 shadow-sm"
            >
              View Class
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
