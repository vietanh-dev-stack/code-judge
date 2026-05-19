'use client';

import { useParams, useSearchParams } from 'next/navigation';
import ProblemWorkspace from './components/ProblemWorkspace';

export default function ProblemPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const contestId = searchParams.get('contestId') || undefined;

  return <ProblemWorkspace initialProblemId={id} contestId={contestId} />;
}