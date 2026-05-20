import { Suspense } from 'react';
import { ProblemPageClient } from './ProblemPageClient';

export default function ProblemPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <ProblemPageClient />
    </Suspense>
  );
}
