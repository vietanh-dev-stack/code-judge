import { Suspense } from 'react';
import ProblemsBankPage from '@/components/dashboard/problems/ProblemsBankPage';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

function BankFallback() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="text-sm">Loading Problem Bank...</p>
    </div>
  );
}

export default function DashboardProblemsPage() {
  return (
    <Suspense fallback={<BankFallback />}>
      <ProblemsBankPage />
    </Suspense>
  );
}
