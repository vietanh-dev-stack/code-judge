'use client';

import { useState, useMemo, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import ClassCard from '@/components/dashboard/ClassCard';
import { getClassroomBannerColor } from '@/lib/classroom-banner';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import Pagination from '@/components/shared/pagination';

import { archiveClassroom, restoreClassroom } from '@/services/classroom.apis';
import { useClassroomStore } from '@/store/classroom-store';
import { useAuthStore } from '@/store/auth-store';

export default function StudentDashboardPage() {
  const { teaching, enrolled, loading, fetchClassrooms } = useClassroomStore(
    useShallow((s) => ({
      teaching: s.teaching,
      enrolled: s.enrolled,
      loading: s.loading,
      fetchClassrooms: s.fetchClassrooms,
    })),
  );

  const classrooms = useMemo(() => [...teaching, ...enrolled], [teaching, enrolled]);
  const activeClasses = useMemo(() => classrooms.filter((c) => c.isActive), [classrooms]);
  const user = useAuthStore((s) => s.user);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const totalPages = Math.ceil(activeClasses.length / itemsPerPage);

  const paginatedClasses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return activeClasses.slice(startIndex, startIndex + itemsPerPage);
  }, [activeClasses, currentPage]);

  // Adjust page if it gets out of bounds (e.g. after archiving)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

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
      description: 'Are you sure you want to archive this class? You can restore it later.',
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
      description: 'This will bring the class back to your active list.',
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
      title: 'Archive (Leave) Class?',
      description: 'Are you sure you want to archive this class from your list?',
      variant: 'destructive',
      loading: false,
      onConfirm: async () => {
        setConfirmConfig((p) => ({ ...p, loading: true }));
        try {
          // Logic for member to "Archive" could be unenroll or just hiding it
          toast.info('Hành động Archive (Rời lớp) đang được xử lý...');
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

  if (loading && classrooms.length === 0) {
    return <div>Loading classrooms...</div>;
  }

  if (activeClasses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <p className="text-lg font-medium">No active classrooms yet.</p>
        <p className="text-sm">Join a class or check your archived classes in the sidebar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedClasses.map((item) => {
          const bannerColors = getClassroomBannerColor(item.id);
          const isOwner = item.owner.id === user?.id;

          return (
            <ClassCard
              key={item.id}
              id={item.id}
              title={item.name}
              subTitle={item.academicYear ?? ''}
              teacher={item.owner?.name ?? 'Unknown'}
              bannerBg={bannerColors}
              avatar={item.owner?.image}
              isActive={item.isActive}
              isOwner={isOwner}
              onArchive={() => handleArchive(item.id)}
              onRestore={() => handleRestore(item.id)}
              onLeave={() => handleLeave(item.id)}
            />
          );
        })}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

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
