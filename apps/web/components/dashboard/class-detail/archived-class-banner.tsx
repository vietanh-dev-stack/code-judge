'use client';

import { useState } from 'react';
import { Archive, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { restoreClassroom } from '@/services/classroom.apis';
import { useClassroomStore } from '@/store/classroom-store';
import { useClassDetail } from './class-detail-context';

export default function ArchivedClassBanner() {
  const router = useRouter();
  const { classId, className, isOwner } = useClassDetail();
  const fetchClassrooms = useClassroomStore((s) => s.fetchClassrooms);
  const [restoring, setRestoring] = useState(false);

  const handleRestore = async () => {
    if (!isOwner) return;
    setRestoring(true);
    try {
      await restoreClassroom(classId);
      await fetchClassrooms();
      toast.success('Classroom restored successfully');
      router.refresh();
    } catch {
      toast.error('Failed to restore classroom');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Archive className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="font-semibold">This class is archived</p>
          <p className="text-sm text-amber-800">
            {isOwner
              ? `"${className}" is read-only. Restore the class to create, edit, or delete content.`
              : `"${className}" is read-only. Only the class owner can restore it.`}
          </p>
        </div>
      </div>
      {isOwner && (
        <Button
          type="button"
          variant="outline"
          className="shrink-0 border-amber-300 bg-white hover:bg-amber-100"
          onClick={handleRestore}
          disabled={restoring}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${restoring ? 'animate-spin' : ''}`} />
          Restore class
        </Button>
      )}
    </div>
  );
}
