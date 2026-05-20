'use client';

import AdminContestEditor from '@/components/admin/contests/ContestEditor';
import { use } from 'react';

export default function AdminContestEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AdminContestEditor contestId={id} />;
}
