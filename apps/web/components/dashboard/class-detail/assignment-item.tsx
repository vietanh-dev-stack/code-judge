'use client';

import { ArrowRight, Gauge, MemoryStick, MoreVertical, Edit2, Trash2, FileSpreadsheet } from 'lucide-react';
import { reportsApi } from '@/services/reports.apis';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Problem } from '@/services/problem.apis';
import Link from 'next/link';

interface AssignmentItemProps extends Problem {
  classRoomId?: string;
  canExportReport?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

export default function AssignmentItem({
  id,
  title,
  timeLimitMs,
  memoryLimitMb,
  difficulty,
  tags,
  mode,
  classRoomId,
  canExportReport = false,
  onEdit,
  onDelete,
  showActions = true,
}: AssignmentItemProps) {
  const handleExport = async () => {
    if (!classRoomId) return;
    try {
      await reportsApi.downloadProblemReport(classRoomId, id);
      toast.success('Assignment report created', { position: 'top-center' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Export failed', {
        position: 'top-center',
      });
    }
  };
  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-black line-clamp-1">{title}</h2>
            {(showActions || canExportReport) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 p-1 rounded-xl shadow-xl">
                  {canExportReport && classRoomId && (
                    <DropdownMenuItem
                      onClick={handleExport}
                      className="rounded-lg gap-2 cursor-pointer py-2 text-sm"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Xuất báo cáo
                    </DropdownMenuItem>
                  )}
                  {showActions && (
                    <>
                      <DropdownMenuItem
                        onClick={() => onEdit?.(id)}
                        className="rounded-lg gap-2 cursor-pointer py-2 text-sm"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete?.(id)}
                        className="rounded-lg gap-2 cursor-pointer py-2 text-sm text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="mt-3 flex items-center gap-5 text-gray-500">
            <div className="flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium">{timeLimitMs}ms</span>
            </div>

            <div className="flex items-center gap-1.5">
              <MemoryStick className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium">{memoryLimitMb}MB</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div
          className={`
            rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider
            ${
              difficulty === 'EASY'
                ? 'bg-emerald-500'
                : difficulty === 'MEDIUM'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
            }
          `}
        >
          {difficulty}
        </div>
        <div className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-gray-400 border border-gray-200 uppercase tracking-wider">
          {mode}
        </div>
      </div>

      {tags && tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tagItem) => (
            <span
              key={tagItem.tag.id}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 border border-slate-200"
            >
              {tagItem.tag.name}
            </span>
          ))}
        </div>
      )}

      <Link
        href={`/problem/${id}`}
        className="flex items-center justify-center mt-5 cursor-pointer h-10 w-full rounded-xl border border-gray-200 bg-white text-sm font-semibold text-black hover:bg-gray-50 hover:border-black transition-all"
      >
        <span>Solve Problem</span>
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </div>
  );
}
