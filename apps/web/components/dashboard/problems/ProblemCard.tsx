import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getDifficultyColor } from '@/lib/utils';
import { Problem } from '@/services/problem.apis';
import { reportsApi } from '@/services/reports.apis';
import { ArrowRight, Clock, Cpu, Edit2, FileSpreadsheet, MoreVertical, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export interface ProblemCardProps {
  problem: Problem;
  classRoomId?: string;
  canExportReport?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
  onTagClick?: (slug: string) => void;
}

export default function ProblemCard({
  problem,
  classRoomId,
  canExportReport = false,
  onTagClick,
  onEdit,
  onDelete,
  showActions,
}: ProblemCardProps) {
  const diffColor = getDifficultyColor(problem.difficulty);

  const handleExport = async () => {
    if (!classRoomId) return;
    try {
      await reportsApi.downloadProblemReport(classRoomId, problem.id);
      toast.success('Problem report ready', { position: 'top-center' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Export failed', {
        position: 'top-center',
      });
    }
  };
  return (
    <div
      key={problem.id}
      className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200"
    >
      {/* PHẦN TRÊN: Tiêu đề + Action (nếu là owner) */}
      <div>
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-200 text-2xl line-clamp-1">{problem.title}</h3>
            {(showActions || canExportReport) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full cursor-pointer"
                  >
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 p-1 rounded-xl shadow-xl">
                  {canExportReport && classRoomId && (
                    <DropdownMenuItem
                      onClick={handleExport}
                      className="rounded-lg gap-2 cursor-pointer py-2 text-sm"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Export report
                    </DropdownMenuItem>
                  )}
                  {showActions && (
                    <>
                      <DropdownMenuItem
                        onClick={() => onEdit?.(problem.id)}
                        className="rounded-lg gap-2 cursor-pointer py-2 text-sm focus:bg-primary focus:text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete?.(problem.id)}
                        className="rounded-lg gap-2 cursor-pointer py-2 text-sm text-red-600 focus:text-red-600 focus:bg-red-50 mt-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-2 line-clamp-3">{problem.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-semibold tracking-wider px-2.5 py-0.5 rounded uppercase ${diffColor}`}
          >
            {problem.difficulty}
          </span>
          {/* DANH SÁCH TAGS */}

          {problem.tags && problem.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {problem.tags.slice(0, 4).map((t) => (
                <Badge
                  key={t.tag.id}
                  variant="secondary"
                  className="text-[11px] py-0.5 px-2 bg-slate-800 text-primary hover:bg-slate-700 rounded font-semibold cursor-pointer transition-colors border-none"
                  onClick={() => onTagClick?.(t.tag.slug)}
                >
                  {t.tag.name}
                </Badge>
              ))}
              {problem.tags.length > 4 && (
                <Badge className="text-[11px] py-0.5 px-2 bg-slate-800 text-primary hover:bg-slate-700 rounded font-semibold cursor-pointer transition-colors border-none">
                  +{problem.tags.length - 4}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border opacity-60 my-8"></div>

      {/* PHẦN DƯỚI: Nút Solve */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <p>{problem.timeLimitMs}ms</p>
          </div>
          <div className="flex items-center gap-1">
            <Cpu className="w-4 h-4" />
            <p>{problem.memoryLimitMb}MB</p>
          </div>
        </div>
        {/* Nút Solve thiết kế chuẩn theo hình gốc */}
        <Button
          size="sm"
          asChild
          className="h-9 rounded-xl border-none bg-transparent px-5 font-semibold text-primary transition-colors hover:bg-muted hover:text-primary"
        >
          <Link href={`/problem/${problem.id}`} className="flex items-center gap-2">
            <p className="font-semibold">Solve Problem</p>
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
