'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminToast } from '@/lib/admin-toast';
import { reportsApi } from '@/services/reports.apis';

type AdminExportKind = 'problem' | 'contest';

export function AdminExportReportButton({
  kind,
  problemId,
  contestId,
  label,
  variant = 'outline',
  size = 'sm',
}: {
  kind: AdminExportKind;
  problemId?: string;
  contestId?: string;
  label?: string;
  variant?: 'outline' | 'default' | 'secondary';
  size?: 'sm' | 'default';
}) {
  const [loading, setLoading] = useState(false);

  const defaultLabel =
    kind === 'problem' ? 'Export problem report' : 'Export contest report';

  const handleExport = async () => {
    setLoading(true);
    try {
      if (kind === 'problem' && problemId) {
        await reportsApi.downloadAdminProblemReport(problemId);
      } else if (kind === 'contest' && contestId) {
        await reportsApi.downloadAdminContestReport(contestId);
      } else {
        throw new Error('Missing export parameters');
      }
      adminToast.success('Report ready', {
        description: 'Your XLSX file is downloading.',
      });
    } catch (err: unknown) {
      adminToast.errorFrom(err, 'Could not export report.');
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
