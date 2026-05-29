'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import PersonItem from '@/components/dashboard/class-detail/person-item';
import { useClassDetail } from '@/components/dashboard/class-detail/class-detail-context';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { toast } from 'sonner';

import { authApi } from '@/services/auth.apis';
import { getClassroomPeople, removeMember } from '@/services/classroom.apis';

export default function PeoplePage() {
  const params = useParams();
  const classRoomId = params.id as string;
  const { canManage } = useClassDetail();

  const [data, setData] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const router = useRouter();

  const load = async () => {
    try {
      const [people, user] = await Promise.all([getClassroomPeople(classRoomId), authApi.me()]);
      setData(people);
      setMe(user);
    } catch (error: any) {
      if (error?.status === 403 || error?.status === 404) {
        router.replace('/dashboard');
      }
    }
  };

  useEffect(() => {
    load();
  }, [classRoomId]);

  const handleConfirmRemove = async () => {
    if (!removingId) return;

    try {
      setIsRemoving(true);
      await removeMember(classRoomId, removingId);
      toast.success('Member removed successfully');
      setRemovingId(null);
      await load();
    } catch (error: any) {
      if (error?.status !== 400 && error?.status !== 403) {
        console.error('Failed to remove member:', error);
      }
      toast.error(error?.message || 'Failed to remove member');
    } finally {
      setIsRemoving(false);
    }
  };

  if (!data) return <div>Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-10 mt-8 px-4">
      {/* Teachers */}
      <section>
        <div className="border-b border-border pb-3 mb-4">
          <h2 className="text-2xl font-extrabold text-primary flex items-center gap-2">Teachers</h2>
        </div>

        <div className="divide-y divide-border/60">
          {data.teachers.map((t: any) => (
            <PersonItem key={t.id} name={t.name} avatarUrl={t.image} />
          ))}
        </div>
      </section>

      {/* Students */}
      <section>
        <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
          <h2 className="text-2xl font-extrabold text-primary flex items-center gap-2">Students</h2>

          <div className="flex gap-4 items-center">
            <span className="text-xs text-primary border-primary font-semibold bg-primary/20 px-3 py-1 rounded-full border">
              {data.students.length} student{data.students.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="divide-y divide-border/60">
          {data.students.map((s: any) => (
            <PersonItem
              key={s.id}
              name={s.name}
              avatarUrl={s.image}
              showRemove={canManage && s.id !== me?.id}
              onRemove={() => setRemovingId(s.id)}
            />
          ))}
        </div>
      </section>

      <ConfirmDialog
        isOpen={!!removingId}
        onClose={() => setRemovingId(null)}
        onConfirm={handleConfirmRemove}
        loading={isRemoving}
        title="Remove Member"
        description="Are you sure you want to remove this member from the classroom? This action cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
