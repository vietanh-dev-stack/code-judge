'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProblemWorkspace from './components/ProblemWorkspace';
import { Problem, problemsApi } from '@/services/problem.apis';
import { Loader2 } from 'lucide-react';

export default function ProblemPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const contestId = searchParams.get('contestId') || undefined;
  
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchProblem = async () => {
      try {
        setLoading(true);
        const data = await problemsApi.findById(id);
        setProblem(data);
      } catch (err: any) {
        console.error('Failed to fetch problem:', err);
        setError(err.message || 'Failed to load problem');
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0c]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-lg font-medium text-muted-foreground animate-pulse">
            Loading problem workspace...
          </p>
        </div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0a0a0c] p-6 text-center">
        <h1 className="mb-4 text-3xl font-bold text-white">Oops! Problem not found</h1>
        <p className="mb-8 max-w-md text-muted-foreground">
          {error || "The problem you're looking for doesn't exist or you don't have permission to view it."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full bg-blue-600 px-8 py-3 font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]"
        >
          Try Again
        </button>
      </div>
    );
  }

  return <ProblemWorkspace problem={problem} contestId={contestId} />;
}