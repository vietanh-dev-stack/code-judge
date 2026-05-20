'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import AssignmentItem from '@/components/dashboard/class-detail/assignment-item';
import { Problem, problemsApi } from '@/services/problem.apis';
import { useDebounce } from '@/hooks/use-debounce';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

export default function ClassworkList({
  classId,
  initialProblems,
  isOwner,
  canManage,
}: {
  classId: string;
  initialProblems: Problem[];
  isOwner: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [problems, setProblems] = useState<Problem[]>(initialProblems);
  const [search, setSearch] = useState('');
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [problemToDelete, setProblemToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const loadProblems = async () => {
    try {
      const result = await problemsApi.findAll({ limit: 50, classRoomId: classId });
      setProblems(result.items);
    } catch (error) {
      console.error('Failed to load problems:', error);
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const problem = await problemsApi.findById(id);
      setEditingProblem(problem);
      router.push(`/dashboard/${classId}/classwork/create?edit=${id}`);
    } catch (error) {
      console.error('Failed to fetch problem for edit:', error);
      toast.error('Failed to load problem for editing.', { position: 'top-center' });
    }
  };

  const handleDelete = (id: string) => {
    setProblemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!problemToDelete) return;
    setDeleteLoading(true);
    try {
      await problemsApi.delete(problemToDelete);
      loadProblems();
      toast.success('Problem deleted successfully.', { position: 'top-center' });
      setDeleteConfirmOpen(false);
    } catch (error) {
      console.error('Failed to delete problem:', error);
      toast.error('Failed to delete problem.', { position: 'top-center' });
    } finally {
      setDeleteLoading(false);
      setProblemToDelete(null);
    }
  };

  const filteredProblems = problems.filter((p) => {
    if (!isOwner && p.visibility === 'CONTEST_ONLY') {
      return false;
    }
    return p.title.toLowerCase().includes(debouncedSearch.toLowerCase());
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Only Owner of the Class has the access to create new problem */}
        {canManage && (
          <Link
            href={`/dashboard/${classId}/classwork/create`}
            className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Create Problem
          </Link>
        )}

        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm w-full max-w-md">
          <Search className="w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search assignments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 shadow-none h-auto p-1 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProblems.length > 0 ? (
          filteredProblems.map((problem) => (
            <AssignmentItem
              key={problem.id}
              {...problem}
              onEdit={handleEdit}
              onDelete={handleDelete}
              showActions={canManage}
            />
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200 text-gray-400">
            <h2 className="text-xl font-medium">No assignments found.</h2>
            <p className="text-sm">Create your first problem to get started.</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Problem"
        description="Are you sure you want to delete this problem? This action cannot be undone."
        loading={deleteLoading}
      />
    </div>
  );
}
