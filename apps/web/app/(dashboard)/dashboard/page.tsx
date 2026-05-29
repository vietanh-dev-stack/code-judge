'use client';

import { useState, useMemo, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import Link from 'next/link';
import { History } from 'lucide-react';

import { archiveClassroom, restoreClassroom, leaveClassroom } from '@/services/classroom.apis';
import { useClassroomStore } from '@/store/classroom-store';
import { useAuthStore } from '@/store/auth-store';

import TeachingClassCard from '@/components/dashboard/classroom/teaching-class-card';
import EnrolledClassCard from '@/components/dashboard/classroom/enrolled-class-card';
import CreateClassCard from '@/components/dashboard/classroom/create-class-card';
import { CreateClassroomModal } from '@/components/dashboard/classroom/create-classroom-modal';
import { JoinClassroomModal } from '@/components/dashboard/classroom/join-classroom-modal';
import { Button } from '@/components/ui/button';

export default function StudentDashboardPage() {
  const { teaching, enrolled, loading, fetchClassrooms } = useClassroomStore(
    useShallow((s) => ({
      teaching: s.teaching,
      enrolled: s.enrolled,
      loading: s.loading,
      fetchClassrooms: s.fetchClassrooms,
    })),
  );

  const user = useAuthStore((s) => s.user);

  // Client-side lazy loading limits
  const [teachingLimit, setTeachingLimit] = useState(4);
  const [enrolledLimit, setEnrolledLimit] = useState(4);

  // Visible sliced classrooms
  const visibleTeaching = useMemo(
    () => teaching.slice(0, teachingLimit),
    [teaching, teachingLimit],
  );
  const visibleEnrolled = useMemo(
    () => enrolled.slice(0, enrolledLimit),
    [enrolled, enrolledLimit],
  );

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Scroll detection for Teaching section
  const handleTeachingScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollWidth - target.scrollLeft <= target.clientWidth + 150) {
      if (teachingLimit < teaching.length) {
        setTeachingLimit((prev) => Math.min(prev + 4, teaching.length));
      }
    }
  };

  // Scroll detection for Enrolled section
  const handleEnrolledScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollWidth - target.scrollLeft <= target.clientWidth + 150) {
      if (enrolledLimit < enrolled.length) {
        setEnrolledLimit((prev) => Math.min(prev + 4, enrolled.length));
      }
    }
  };

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
      title: 'Leave Class?',
      description: 'Are you sure you want to leave this class from your list?',
      variant: 'destructive',
      loading: false,
      onConfirm: async () => {
        setConfirmConfig((p) => ({ ...p, loading: true }));
        try {
          await leaveClassroom(id);
          // Logic for member to leave
          toast.info('Leaving class is being processed...');
          await fetchClassrooms();
          toast.success('Successfully left the classroom');
          closeDialog();
        } catch (error: any) {
          console.error(error);
          toast.error(error?.message || 'Failed to leave class');
          setConfirmConfig((p) => ({ ...p, loading: false }));
        }
      },
    });
  };

  if (loading && teaching.length === 0 && enrolled.length === 0) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading classrooms...</span>
        </div>
      </div>
    );
  }

  const isWorkspaceEmpty = teaching.length === 0 && enrolled.length === 0;

  if (isWorkspaceEmpty) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            My Learning Workspace
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Manage your dual-role ecosystem. Coordinate curriculum as an instructor while tracking
            your personal upskilling progress across technical modules.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center h-[50vh] border border-dashed border-white/10 rounded-3xl bg-white/[0.02] p-8 text-center max-w-3xl mx-auto mt-8 animate-in fade-in zoom-in-95 duration-500">
          <p className="text-xl font-bold text-white mb-2">No active classrooms yet</p>
          <p className="text-sm text-muted-foreground mb-8 max-w-md">
            Get started by creating your own classroom as an instructor or joining an existing one
            with a code.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 py-3 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold rounded-xl transition duration-300 shadow-md cursor-pointer"
            >
              Create Classroom
            </button>
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition duration-300 cursor-pointer"
            >
              Join with Code
            </button>
          </div>
        </div>

        <CreateClassroomModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
        <JoinClassroomModal open={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            My Learning Workspace
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Manage your dual-role ecosystem. Coordinate curriculum as an instructor while tracking
            your personal upskilling progress across technical modules.
          </p>
        </div>
      </div>

      {/* Teaching Section */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-[#f97316] rounded-full"></div>
            <h3 className="text-2xl font-bold text-white tracking-tight">Teaching</h3>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20 rounded-full">
              Active: {teaching.length}
            </span>
          </div>
        </div>

        {/* Teaching List - Horizontal Scroll with stationary Create New Class Card */}
        <div className="flex gap-6 items-stretch w-full overflow-hidden">
          <div
            onScroll={handleTeachingScroll}
            className="flex-1 flex gap-6 overflow-x-auto pb-4 scroll-smooth no-scrollbar"
          >
            {visibleTeaching.map((item) => (
              <TeachingClassCard
                key={item.id}
                classroom={item}
                onArchive={() => handleArchive(item.id)}
                onRestore={() => handleRestore(item.id)}
                onLeave={() => handleLeave(item.id)}
              />
            ))}
          </div>

          <div className="shrink-0 pb-4">
            <CreateClassCard onClick={() => setIsCreateModalOpen(true)} />
          </div>
        </div>
      </div>

      {/* Enrolled Section */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-[#10b981] rounded-full"></div>
            <h3 className="text-2xl font-bold text-white tracking-tight">Enrolled</h3>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 rounded-full">
              Learning: {enrolled.length}
            </span>
          </div>
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl text-sm transition cursor-pointer shadow-sm"
          >
            Join with Code
          </button>
        </div>

        {/* Enrolled List - Horizontal Scroll */}
        {enrolled.length === 0 ? (
          <div className="h-[190px] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-muted-foreground bg-white/[0.01]">
            <p className="text-sm font-medium text-muted-foreground">
              You haven't joined any classrooms yet.
            </p>
            <Button
              variant={'link'}
              onClick={() => setIsJoinModalOpen(true)}
              className="text-[#10b981] hover:underline cursor-pointer text-sm mt-1 font-semibold"
            >
              Join one now
            </Button>
          </div>
        ) : (
          <div className="relative">
            <div
              onScroll={handleEnrolledScroll}
              className="flex gap-6 overflow-x-auto pb-4 scroll-smooth no-scrollbar"
            >
              {visibleEnrolled.map((item) => (
                <EnrolledClassCard
                  key={item.id}
                  classroom={item}
                  onLeave={() => handleLeave(item.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals and Dialogs */}
      <CreateClassroomModal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <JoinClassroomModal open={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} />

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
