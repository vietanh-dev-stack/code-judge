'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { reportsApi } from '@/services/reports.apis';

type ExportKind = 'classroom' | 'problem' | 'contest';

export function ExportReportButton({
  kind,
  classRoomId,
  problemId,
  contestId,
  label,
  variant = 'outline',
  size = 'sm',
}: {
  kind: ExportKind;
  classRoomId?: string;
  problemId?: string;
  contestId?: string;
  label?: string;
  variant?: 'outline' | 'default' | 'secondary';
  size?: 'sm' | 'default';
}) {
  const [loading, setLoading] = useState(false);

  const defaultLabel =
    kind === 'classroom'
      ? 'Export class report'
      : kind === 'problem'
        ? 'Export problem report'
        : 'Export contest report';

  const handleExport = async () => {
    setLoading(true);
    try {
      if (kind === 'classroom' && classRoomId) {
        await reportsApi.downloadClassroomReport(classRoomId);
      } else if (kind === 'problem' && classRoomId && problemId) {
        await reportsApi.downloadProblemReport(classRoomId, problemId);
      } else if (kind === 'contest' && contestId) {
        await reportsApi.downloadContestReport(contestId);
      } else {
        throw new Error('Missing export parameters');
      }
      toast.success('Report ready', {
        description: 'Your XLSX file is downloading.',
        position: 'top-center',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not export report';
      toast.error(message, { position: 'top-center' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={loading}
      onClick={handleExport}
      className="gap-1.5"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {label ?? defaultLabel}
    </Button>
  );
}
