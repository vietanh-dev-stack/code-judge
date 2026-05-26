'use client';

import { useEffect, useState } from 'react';
import { X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getClassroomDetail, joinClassroom } from '@/services/classroom.apis';
import { useRouter } from 'next/navigation';
import { useClassroomStore } from '@/store/classroom-store';

interface JoinClassroomModalProps {
  open: boolean;
  onClose: () => void;
}

export function JoinClassroomModal({ open, onClose }: JoinClassroomModalProps) {
  const [classCode, setClassCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const addClassroom = useClassroomStore((s) => s.addClassroom);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const handleJoinClassroom = async () => {
    if (!classCode.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // 1. join classroom
      const res = await joinClassroom({
        classCode: classCode.trim(),
      });

      // 2. fetch full classroom info (QUAN TRỌNG)
      const classroom = await getClassroomDetail(res.classRoomId);

      // 3. update zustand
      addClassroom(classroom, 'MEMBER');

      // 4. close + redirect
      setClassCode('');
      onClose();

      router.push(`/dashboard/${classroom.id}`);
    } catch (err: any) {
      // Don't log expected business errors to console
      if (err?.status !== 400 && err?.status !== 403) {
        console.error('Join classroom error:', err);
      }
      setError(err?.message || 'Failed to join classroom');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="relative px-6 py-5">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1 rounded-full hover:bg-gray-500 cursor-pointer transition"
          >
            <X className="w-5 h-5 text-muted-foreground hover:text-gray-200" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Join Classroom</h2>
              <p className="text-sm text-muted-foreground">Enter classroom code to join</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Classroom Code</label>

          <input
            type="text"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value.toUpperCase())}
            placeholder="ABCD1234"
            maxLength={12}
            className="h-12 w-full rounded-xl border border-border bg-background px-4 text-center text-lg font-semibold uppercase tracking-[0.25em] text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />

          <p className="mt-2 text-xs text-muted-foreground">
            Ask your teacher or classroom owner for the invite code.
          </p>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              className="cursor-pointer text-md"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              className="cursor-pointer text-md"
              onClick={handleJoinClassroom}
              disabled={isSubmitting || classCode.trim().length < 6}
            >
              {isSubmitting ? 'Joining...' : 'Join Classroom'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
