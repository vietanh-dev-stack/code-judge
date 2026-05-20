'use client';

import { Suspense } from 'react';
import AdminProblemCreate from '@/components/admin/problems/AdminProblemCreate';
import { Loader2 } from 'lucide-react';

export default function AdminProblemCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Đang tải...</p>
        </div>
      }
    >
      <div className="p-4 pt-6 md:p-8">
        <AdminProblemCreate />
      </div>
    </Suspense>
  );
}
