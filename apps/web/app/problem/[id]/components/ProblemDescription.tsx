'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Clock, HardDrive, BookOpen, History, CheckCircle2, XCircle, AlertCircle, Trophy } from 'lucide-react';
import { Problem } from '@/services/problem.apis';
import { Submission } from '@/services/submission.apis';
import { cn } from '@/lib/utils';

interface ProblemDescriptionProps {
  problem: Problem;
  activeTab: 'description' | 'submissions';
  setActiveTab: (tab: 'description' | 'submissions') => void;
  submissions: Submission[];
  isDarkMode: boolean;
  contestId?: string;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (open: boolean) => void;
}

export default function ProblemDescription({ 
  problem, activeTab, setActiveTab, submissions, isDarkMode,
  contestId, isSidebarOpen, setIsSidebarOpen
}: ProblemDescriptionProps) {
  
  const difficultyColor = 
    problem.difficulty === 'EASY' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
    problem.difficulty === 'MEDIUM' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
    'text-rose-500 bg-rose-500/10 border-rose-500/20';

  return (
    <div className="w-[45%] flex flex-col border-r border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
      {/* Tab Switcher */}
      <div className="flex items-center border-b border-border/50 bg-muted/20 px-4 gap-2">
        {contestId && setIsSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn(
              "flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all mr-1 relative cursor-pointer",
              isSidebarOpen ? "text-amber-500 bg-amber-500/10 border-amber-500/20" : "border border-transparent"
            )}
            title={isSidebarOpen ? "Hide Contest Problems" : "Show Contest Problems"}
          >
            <Trophy size={16} className={cn(!isSidebarOpen && "animate-pulse text-amber-500")} />
            {!isSidebarOpen && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('description')}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2",
            activeTab === 'description' 
              ? "border-blue-500 text-blue-500" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <BookOpen size={16} />
          Description
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2",
            activeTab === 'submissions' 
              ? "border-blue-500 text-blue-500" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <History size={16} />
          Submissions
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'description' ? (
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold tracking-tight">{problem.title}</h1>
              <span className={cn("rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider", difficultyColor)}>
                {problem.difficulty}
              </span>
            </div>

            <div className="flex items-center gap-6 mb-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
                <Clock size={14} className="text-blue-500" />
                <span className="font-medium">{problem.timeLimitMs}ms</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
                <HardDrive size={14} className="text-purple-500" />
                <span className="font-medium">{problem.memoryLimitMb}MB</span>
              </div>
            </div>

            <div className={cn("prose prose-blue max-w-none mb-12", isDarkMode && "prose-invert")}>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {(problem.statementMd || problem.description || "No description provided.")
                  .replace(/Input:/g, '\n### Input\n')
                  .replace(/Output:/g, '\n### Output\n')
                  .replace(/Constraints:/g, '\n### Constraints\n')
                  .replace(/Explanation:/g, '\n### Explanation\n')
                  .replace(/Ví dụ/g, '\n### Ví dụ\n')
                  .replace(/Ghi chú/g, '\n### Ghi chú\n')
                }
              </ReactMarkdown>
            </div>

            {/* Constraints & Tags */}
            <div className="space-y-6 pt-6 border-t border-border/50">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {((problem as any).tags && (problem as any).tags.length > 0) ? (
                    (problem as any).tags.map((t: any) => {
                      const tagObj = t.tag || t;
                      const tagName = typeof tagObj === 'string' ? tagObj : tagObj?.name;
                      const tagId = typeof tagObj === 'object' ? (tagObj?.id || tagObj?.slug) : tagName;
                      if (!tagName) return null;
                      return (
                        <span key={tagId} className="rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs text-blue-400 font-medium">
                          {tagName}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-muted-foreground">No tags</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-bold mb-4 px-2">Submission History</h2>
            {submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="p-4 rounded-full bg-muted/20 border border-border/50 text-muted-foreground">
                  <History size={32} />
                </div>
                <div>
                  <p className="text-lg font-medium">No submissions yet</p>
                  <p className="text-sm text-muted-foreground">Submit your code to see your progress.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <div key={sub.id} className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 p-4 transition-all hover:bg-muted/30 hover:shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {sub.status === 'Accepted' ? (
                          <CheckCircle2 size={20} className="text-emerald-500" />
                        ) : sub.status === 'Wrong' ? (
                          <XCircle size={20} className="text-rose-500" />
                        ) : (
                          <AlertCircle size={20} className="text-amber-500" />
                        )}
                        <span className={cn(
                          "font-bold text-sm",
                          sub.status === 'Accepted' ? "text-emerald-500" : 
                          sub.status === 'Wrong' ? "text-rose-500" : "text-amber-500"
                        )}>
                          {sub.status}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(sub.createdAt).toLocaleDateString()} {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Score</span>
                        <span className="text-sm font-mono">{sub.score ?? '--'}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Language</span>
                        <span className="text-sm font-mono text-blue-400">{sub.language || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}