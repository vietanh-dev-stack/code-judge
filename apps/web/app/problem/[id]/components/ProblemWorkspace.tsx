'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';
import { Problem } from '@/services/problem.apis';
import { submissionsApi, Submission } from '@/services/submission.apis';
import { storageApi } from '@/services/storage.apis';
import ProblemDescription from './ProblemDescription';
import CodeEditorPanel from './CodeEditorPanel';
import ConsolePanel from './ConsolePanel';
import { useSocket } from '@/providers/socket-provider';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// 1. CHUẨN HÓA TYPE THEO SCHEMA
export type ProblemType = {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string[];
  statementMd: string; // Dùng Markdown thay cho string thường
  timeLimitMs: number;
  memoryLimitMb: number;
  supportedLanguages: string[];
  publicTestCases: {
    id: string;
    input: string;
    expectedOutput: string;
  }[];
};

// 2. TYPE CHO KẾT QUẢ CHẤM ĐIỂM
export type TestCaseResult = {
  testCaseId: string;
  status: string;
  runtimeMs?: number;
  memoryMb?: number;
  output?: string | null;
  error?: string | null;
  passed: boolean;
  isHidden: boolean;
};

export type SubmissionResult = {
  status: string;
  testsPassed: number;
  testsTotal: number;
  runtimeMs?: number;
  memoryMb?: number;
  errorMessage?: string;
  language?: string | null;
  caseResults?: {
    testCases: TestCaseResult[];
  };
};

interface ProblemWorkspaceProps {
  problem: Problem;
  contestId?: string;
}

export default function ProblemWorkspace({ problem, contestId }: ProblemWorkspaceProps) {
  const user = useAuthStore((state) => state.user);
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const { socket } = useSocket();

  const loadSubmissions = useCallback(async () => {
    if (!user || !problem.id) return;
    try {
      const data = await submissionsApi.findAll({ userId: user.id, problemId: problem.id });
      setSubmissions(data);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    }
  }, [user, problem.id]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  useEffect(() => {
    if (socket) {
      const handleFinished = (data: any) => {
        setIsRunning(false);
        setIsSubmitting(false);
        setResult({
          status: data.status,
          testsPassed: data.testsPassed ?? 0,
          testsTotal: data.testsTotal ?? 0,
          runtimeMs: data.runtimeMs,
          memoryMb: data.memoryMb,
          errorMessage: data.error,
          language: data.language,
          caseResults: data.caseResults,
        });
        
        if (!data.isDryRun) {
          loadSubmissions();
        }
        
        if (data.status === 'Accepted') {
          toast.success(data.isDryRun ? 'Run Code Success!' : 'Accepted!', {
            description: data.isDryRun 
              ? `Passed all ${data.testsTotal} sample test cases.` 
              : `All ${data.testsTotal} test cases passed.`,
          });
        } else {
          toast.error(data.status, { description: data.error || 'Some test cases failed.' });
        }
      };

      const handleFailed = (data: any) => {
        setIsRunning(false);
        setIsSubmitting(false);
        setResult({
          status: 'Error',
          testsPassed: data.testsPassed ?? 0,
          testsTotal: data.testsTotal ?? 0,
          errorMessage: data.error || 'Judging failed',
          language: data.language,
          caseResults: data.caseResults,
        });
        if (!data.isDryRun) {
          loadSubmissions();
        }
        toast.error('Error', { description: data.error || 'Judging failed' });
      };

      socket.on('submission:finished', handleFinished);
      socket.on('submission:failed', handleFailed);

      return () => {
        socket.off('submission:finished', handleFinished);
        socket.off('submission:failed', handleFailed);
      };
    }
  }, [socket, loadSubmissions]);


  // Initialize code from localStorage or default
  useEffect(() => {
    const saved = localStorage.getItem(`code-${problem.id}`);
    if (saved) {
      setCode(saved);
    } else {
      const lang = problem.supportedLanguages?.[0]?.toLowerCase();
      if (lang === 'python') setCode('# Write your code here\n');
      else if (lang === 'javascript' || lang === 'typescript') setCode('// Write your code here\n');
      else if (lang === 'cpp') setCode('#include <iostream>\nusing namespace std;\n\nint main() {\n  return 0;\n}\n');
      else if (lang === 'go' || lang === 'golang') setCode('package main\nimport "fmt"\n\nfunc main() {\n  \n}\n');
      else if (lang === 'rust' || lang === 'rs') setCode('fn main() {\n    \n}\n');
      else setCode('');
    }
  }, [problem.id, problem.supportedLanguages]);

  // Save code to localStorage
  useEffect(() => {
    if (code) {
      localStorage.setItem(`code-${problem.id}`, code);
    }
  }, [code, problem.id]);

  const [activeTab, setActiveTab] = useState<'description' | 'submissions'>('description');
  const [submissions, setSubmissions] = useState<Submission[]>([]);


  const handleSubmit = async (language: string, isDryRun: boolean = false) => {
    if (!user) {
      toast.error('Authentication Required', { description: 'Please log in to submit your code.' });
      return;
    }

    if (!code.trim()) {
      toast.error('Empty Code', { description: 'Please write some code before submitting.' });
      return;
    }

    if (isDryRun) {
      setIsRunning(true);
    } else {
      setIsSubmitting(true);
    }
    setResult(null);

    try {
      const submissionId = `sub-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
      const optionLang = language.toUpperCase();
      const ext = optionLang === 'PYTHON' ? 'py' : 
                  optionLang === 'JAVASCRIPT' ? 'js' : 
                  optionLang === 'TYPESCRIPT' ? 'ts' :
                  optionLang === 'JAVA' ? 'java' :
                  optionLang === 'GO' ? 'go' :
                  optionLang === 'RUST' ? 'rs' :
                  optionLang === 'CPP' ? 'cpp' : 'txt';
      
      const presign = await storageApi.presignUpload({
        resourceKind: 'submission-source',
        submissionId,
        fileName: `solution.${ext}`,
      });

      await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: code,
      });

      await submissionsApi.create({
        userId: user.id,
        problemId: problem.id,
        contestId: (contestId || null) as string | undefined,
        mode: problem.mode,
        language: optionLang,
        sourceCodeObjectKey: presign.objectKey,
        isDryRun,
      });

      toast.info(isDryRun ? 'Running Code' : 'Submission Received', {
        description: isDryRun ? 'Running your code against sample test cases...' : 'Your code is being judged...',
      });
    } catch (error: any) {
      console.error('Submission failed:', error);
      toast.error('Submission Error', { description: error.message || 'Failed to submit code.' });
      setIsRunning(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn('h-screen flex flex-col bg-background text-foreground transition-colors duration-300', isDarkMode && 'dark')}>
      <div className="flex flex-1 overflow-hidden">
        <ProblemDescription 
          problem={problem} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          submissions={submissions}
          isDarkMode={isDarkMode}
        />
        <div className="flex flex-1 flex-col overflow-hidden border-l border-border/50">
          <CodeEditorPanel 
            problem={problem}
            code={code} 
            setCode={setCode} 
            isRunning={isRunning || isSubmitting} 
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            isDarkMode={isDarkMode}
            toggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
          />
          <ConsolePanel isRunning={isRunning || isSubmitting} result={result} problem={problem} />
        </div>
      </div>
    </div>
  );
}