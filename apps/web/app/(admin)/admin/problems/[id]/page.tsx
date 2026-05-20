'use client';

import AdminProblemEditor from '@/components/admin/problems/ProblemEditor';
import { use } from 'react';

export default function AdminProblemEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AdminProblemEditor problemId={id} />;
}
