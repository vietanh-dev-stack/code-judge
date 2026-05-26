'use client';

import { Plus } from 'lucide-react';

interface CreateClassCardProps {
  onClick: () => void;
}

export default function CreateClassCard({ onClick }: CreateClassCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-[300px] h-[370px] bg-[#111b38]/30 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center p-6 shrink-0 hover:bg-[#111b38]/70 hover:border-[#f97316]/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all duration-300 group cursor-pointer"
    >
      {/* Circle Plus Icon Container */}
      <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white mb-4 group-hover:bg-[#f97316]/20 group-hover:border-[#f97316]/30 group-hover:text-[#f97316] transition-all duration-300">
        <Plus className="w-6 h-6" />
      </div>

      {/* Title */}
      <span className="text-lg font-bold text-white group-hover:text-[#f97316] transition-colors duration-300">
        Create New Class
      </span>

      {/* Subtext */}
      <span className="text-xs text-slate-400 mt-2 max-w-[200px] leading-relaxed">
        Set up a new curriculum and invite students
      </span>
    </button>
  );
}
