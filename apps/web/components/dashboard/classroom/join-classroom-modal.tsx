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
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="relative px-6 py-5 border-b border-gray-100">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1 rounded-full hover:bg-gray-100 cursor-pointer transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">Join Classroom</h2>
              <p className="text-sm text-gray-500">Enter classroom code to join</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Classroom Code</label>

          <input
            type="text"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value.toUpperCase())}
            placeholder="ABCD1234"
            maxLength={12}
            className="w-full h-12 rounded-xl border border-gray-300 px-4 text-center text-lg tracking-[0.25em] font-semibold uppercase outline-none focus:ring-2 focus:ring-black focus:border-black"
          />

          <p className="mt-2 text-xs text-gray-500">
            Ask your teacher or classroom owner for the invite code.
          </p>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              className="cursor-pointer"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              className="cursor-pointer"
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
