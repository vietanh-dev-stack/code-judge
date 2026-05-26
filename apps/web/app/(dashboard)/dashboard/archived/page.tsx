'use client';

import { useState } from 'react';
import ClassCard from '@/components/dashboard/ClassCard';
import { getClassroomBannerColor } from '@/lib/classroom-banner';
import { archiveClassroom, restoreClassroom } from '@/services/classroom.apis';
import { useClassroomStore } from '@/store/classroom-store';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

import { useShallow } from 'zustand/react/shallow';
import TeachingClassCard from '@/components/dashboard/classroom/teaching-class-card';

export default function ArchivedDashboardPage() {
  const { archived, loading, fetchClassrooms } = useClassroomStore(
    useShallow((s) => ({
      archived: s.archived,
      loading: s.loading,
      fetchClassrooms: s.fetchClassrooms,
    })),
  );
  const user = useAuthStore((s) => s.user);

  // DIALOG STATE
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
    loading: boolean;
    variant: 'default' | 'destructive';
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {},
    loading: false,
    variant: 'destructive',
  });

  const closeDialog = () => setConfirmConfig((prev) => ({ ...prev, isOpen: false }));

  const handleArchive = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Archive Classroom?',
      description: 'Are you sure you want to archive this class?',
      variant: 'destructive',
      loading: false,
      onConfirm: async () => {
        setConfirmConfig((p) => ({ ...p, loading: true }));
        try {
          await archiveClassroom(id);
          await fetchClassrooms();
          toast.success('Classroom archived successfully');
          closeDialog();
        } catch (error) {
          console.error(error);
          toast.error('Failed to archive class');
          setConfirmConfig((p) => ({ ...p, loading: false }));
        }
      },
    });
  };

  const handleRestore = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Restore Classroom?',
      description: 'Are you sure you want to restore this class?',
      variant: 'default',
      loading: false,
      onConfirm: async () => {
        setConfirmConfig((p) => ({ ...p, loading: true }));
        try {
          await restoreClassroom(id);
          await fetchClassrooms();
          toast.success('Classroom restored successfully');
          closeDialog();
        } catch (error) {
          console.error(error);
          toast.error('Failed to restore class');
          setConfirmConfig((p) => ({ ...p, loading: false }));
        }
      },
    });
  };

  const handleLeave = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Leave Class?',
      description: 'Are you sure you want to leave this class from your list?',
      variant: 'destructive',
      loading: false,
      onConfirm: async () => {
        setConfirmConfig((p) => ({ ...p, loading: true }));
        try {
          // Logic for member to leave
          toast.info('Hành động Leave Class đang được xử lý...');
          await fetchClassrooms();
          closeDialog();
        } catch (error) {
          console.error(error);
          toast.error('Failed to leave class');
          setConfirmConfig((p) => ({ ...p, loading: false }));
        }
      },
    });
  };

  if (loading && archived.length === 0) {
    return <div>Loading archived classrooms...</div>;
  }

  if (archived.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <p className="text-lg font-medium">No archived classrooms.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Archived classes</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {archived.map((item) => {
          const bannerColors = getClassroomBannerColor(item.id);
          const isOwner = item.owner.id === user?.id;

          return (
            <TeachingClassCard
              key={item.id}
              classroom={item}
              onArchive={() => handleArchive(item.id)}
              onRestore={() => handleRestore(item.id)}
              onLeave={() => handleLeave(item.id)}
            />
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        onClose={closeDialog}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
        loading={confirmConfig.loading}
        variant={confirmConfig.variant}
      />
    </div>
  );
}
