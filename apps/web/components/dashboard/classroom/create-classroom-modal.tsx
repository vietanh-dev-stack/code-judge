'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClassroom, Classroom } from '@/services/classroom.apis';
import { useRouter } from 'next/navigation';
import { useClassroomStore } from '@/store/classroom-store';

interface CreateClassroomModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateClassroomModal({ open, onClose }: CreateClassroomModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  // zustand store
  const addClassroom = useClassroomStore((s) => s.addClassroom);

  // lock scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (name.trim().length < 3) return;

    try {
      setIsSubmitting(true);

      const payload = {
        name: name.trim(),
        description: description.trim(),
        academicYear: academicYear.trim(),
      };

      // API call
      const res: Classroom = await createClassroom(payload);

      /**
       * IMPORTANT:
       * Update global state immediately (NO REFETCH, NO EVENT)
       */
      addClassroom(res, 'OWNER');

      // reset form
      setName('');
      setDescription('');
      setAcademicYear('');

      onClose();

      // redirect to classroom detail
      router.push(`/dashboard/${res.id}`);
    } catch (error) {
      console.error('Create classroom failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 cursor-pointer rounded-full p-1 transition hover:bg-muted"
        >
          <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
        </button>

        {/* Header */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-foreground">Create Classroom</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a new classroom for your students
          </p>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <input
            className="w-full border p-3 rounded-lg focus:ring-1 focus:ring-primary outline-none"
            placeholder="Class name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />

          <textarea
            className="w-full border p-3 rounded-lg focus:ring-1 focus:ring-primary outline-none resize-none"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={1000}
          />

          <input
            className="w-full border p-3 rounded-lg focus:ring-1 focus:ring-primary outline-none"
            placeholder="Academic Year (e.g. 2025-2026)"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            maxLength={30}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button className="cursor-pointer text-md" variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button
            className="cursor-pointer text-md"
            onClick={handleSubmit}
            disabled={isSubmitting || name.trim().length < 3}
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}
