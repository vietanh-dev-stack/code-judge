'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Cloud, Code2, Upload } from 'lucide-react';
import Link from 'next/link';
import { Problem, problemsApi } from '@/services/problem.apis';
import { submissionsApi } from '@/services/submission.apis';
import { diagnoseApiError, logApiErrorDiagnostics } from '@/lib/api-error-diagnostics';

const languageOptions = [
  { value: 'PYTHON', label: 'Python', extension: 'py' },
  { value: 'JAVASCRIPT', label: 'JavaScript', extension: 'js' },
  { value: 'JAVA', label: 'Java', extension: 'java' },
  { value: 'CPP', label: 'C++', extension: 'cpp' },
];

export default function SubmitPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblemId, setSelectedProblemId] = useState('');
  const [language, setLanguage] = useState('PYTHON');
  const [userId, setUserId] = useState('');
  const [sourceCode, setSourceCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  useEffect(() => {
    const loadProblems = async () => {
      try {
        const result = await problemsApi.findAll({ limit: 100 });
        setProblems(result.items);
      } catch (error) {
        console.error('Failed to load problems:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProblems();
  }, []);

  const selectedProblem = problems.find((problem) => problem.id === selectedProblemId);
  const supportedLanguages =
    selectedProblem?.supportedLanguages ?? languageOptions.map((item) => item.value);

  const handleSubmit = async () => {
    setFeedback(null);

    if (!userId.trim()) {
      setFeedback({ type: 'error', message: 'User ID is required.' });
      return;
    }
    if (!selectedProblemId) {
      setFeedback({ type: 'error', message: 'Please select a problem.' });
      return;
    }
    if (!sourceCode.trim()) {
      setFeedback({ type: 'error', message: 'Source code cannot be empty.' });
      return;
    }

    setSubmitting(true);

    try {
      await submissionsApi.create({
        userId: userId.trim(),
        problemId: selectedProblemId,
        mode: selectedProblem?.mode ?? 'ALGO',
        language,
        sourceCode,
      });

      setFeedback({
        type: 'success',
        message: 'Code submitted successfully. Check realtime status in the dashboard.',
      });
      setSourceCode('');
    } catch (error) {
      const d = diagnoseApiError(error, { operation: 'submitPage' });
      logApiErrorDiagnostics(d);
      console.error(error);
      setFeedback({ type: 'error', message: `${d.title}: ${d.userMessage}` });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between mb-10">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">
            Code Submission
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            Submit your code to run on AWS Lambda
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Upload your source to MinIO and execute it through the Lambda-powered judge worker. This
            page is built to support high request volume and realtime feedback.
          </p>
        </div>
        <Button variant="secondary" size="lg" asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Cloud className="w-5 h-5" /> Submit Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="userId">User ID</Label>
                  <Input
                    id="userId"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Enter your user ID"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="problemId">Problem</Label>
                  <Select
                    value={selectedProblemId}
                    onValueChange={(value) => setSelectedProblemId(value ?? '')}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Choose a problem" />
                    </SelectTrigger>
                    <SelectContent>
                      {problems.map((problem) => (
                        <SelectItem key={problem.id} value={problem.id}>
                          {problem.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={language}
                    onValueChange={(value) => setLanguage(value ?? 'PYTHON')}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Supported Languages</Label>
                  <div className="flex flex-wrap gap-2">
                    {supportedLanguages.map((lang) => (
                      <span
                        key={lang}
                        className="rounded-full bg-muted px-3 py-1 text-sm text-foreground/80"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceCode">Source Code</Label>
                <Textarea
                  id="sourceCode"
                  value={sourceCode}
                  onChange={(e) => setSourceCode(e.target.value)}
                  rows={16}
                  placeholder={`Write your ${language.toLowerCase()} code here...`}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  The system uploads source code to MinIO and dispatches it to AWS Lambda for
                  execution. Set `AWS_LAMBDA_FUNCTION_NAME` in your worker environment for
                  lambda-based judge execution.
                </p>
              </div>

              {feedback ? (
                <div
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    feedback.type === 'success'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900'
                      : 'border-destructive bg-destructive/10 text-destructive-900'
                  }`}
                >
                  {feedback.message}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  <p>MinIO upload + AWS Lambda execution workflow.</p>
                  <p>
                    Estimated concurrency: up to 1000 submissions if worker scaling and Lambda are
                    configured.
                  </p>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || loading}
                  className="inline-flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {submitting ? 'Submitting...' : 'Submit Code'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-6">
          <Card className="border border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Code2 className="w-5 h-5" /> Submission Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                The backend creates a submission record, stores code in MinIO, and enqueues a judge
                job. AWS Lambda handles code execution for high scalability.
              </p>
              <ul className="space-y-2 list-disc pl-5">
                <li>Set your own User ID to track submissions.</li>
                <li>Select a published problem and preferred language.</li>
                <li>Large source is uploaded directly to MinIO.</li>
                <li>Worker must have `AWS_LAMBDA_FUNCTION_NAME` configured.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm bg-secondary/5">
            <CardHeader>
              <CardTitle className="text-lg">Quick Start</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>1. Choose a problem.</p>
              <p>2. Select language and paste your code.</p>
              <p>3. Submit and wait for realtime judging updates.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
