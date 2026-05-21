'use client';

import React from 'react';
import { CheckCircle2, XCircle, Terminal, Zap, Cpu } from 'lucide-react';
import type { SubmissionResult } from './ProblemWorkspace';
import { cn } from '@/lib/utils';
import { Problem } from '@/services/problem.apis';

type ConsolePanelProps = {
  isRunning: boolean;
  result: SubmissionResult | null;
  problem: Problem;
};

export default function ConsolePanel({ isRunning, result, problem }: ConsolePanelProps) {
  const [activeCaseTab, setActiveCaseTab] = React.useState<string | null>(null);

  // Reset active tab to first public case's ID when a new result is received
  React.useEffect(() => {
    if (result?.caseResults?.testCases) {
      const firstPublic = result.caseResults.testCases.find(tc => !tc.isHidden);
      if (firstPublic) {
        setActiveCaseTab(firstPublic.testCaseId);
      } else if (result.caseResults.testCases.length > 0) {
        setActiveCaseTab(result.caseResults.testCases[0].testCaseId);
      } else {
        setActiveCaseTab(null);
      }
    } else {
      setActiveCaseTab(null);
    }
  }, [result]);

  const publicCases = React.useMemo(() => {
    if (!result?.caseResults?.testCases) return [];
    return result.caseResults.testCases.filter(tc => !tc.isHidden);
  }, [result]);

  return (
    <div className="flex h-[380px] flex-col border-t border-border/50 bg-muted/10">
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Terminal size={14} className="text-blue-500" />
          Console Output
        </div>
        
        {result && (
          <div className={cn(
            "flex items-center gap-2 text-xs font-bold uppercase tracking-wider",
            result.status === 'Accepted' ? "text-emerald-500" : "text-rose-500"
          )}>
            {result.status === 'Accepted' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {result.status}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {isRunning ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
              <Zap size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Judging your submission...</p>
          </div>
        ) : result ? (
          <div className="space-y-8 max-w-3xl mx-auto pb-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="group rounded-2xl border border-border/50 bg-background p-5 transition-all hover:bg-muted/30 hover:shadow-xl hover:-translate-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <CheckCircle2 size={10} className="text-blue-500" />
                  Testcases
                </p>
                <p className="text-2xl font-bold">
                  <span className={cn(result.testsPassed === result.testsTotal ? "text-emerald-500" : "text-amber-500")}>
                    {result.testsPassed}
                  </span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-muted-foreground">{result.testsTotal}</span>
                </p>
              </div>

              <div className="group rounded-2xl border border-border/50 bg-background p-5 transition-all hover:bg-muted/30 hover:shadow-xl hover:-translate-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Zap size={10} className="text-amber-500" />
                  Runtime
                </p>
                <p className="text-2xl font-bold">
                  {result.runtimeMs ?? '--'} <span className="text-xs text-muted-foreground font-medium uppercase">ms</span>
                </p>
              </div>

              <div className="group rounded-2xl border border-border/50 bg-background p-5 transition-all hover:bg-muted/30 hover:shadow-xl hover:-translate-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Cpu size={10} className="text-purple-500" />
                  Memory
                </p>
                <p className="text-2xl font-bold">
                  {result.memoryMb != null && result.memoryMb > 0 ? result.memoryMb : '--'}{' '}<span className="text-xs text-muted-foreground font-medium uppercase">mb</span>
                </p>
              </div>
            </div>
            
            {result.errorMessage && (
               <div className="group relative rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                 <h4 className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-3">Error Output</h4>
                 <div className="text-sm font-mono text-rose-200/80 whitespace-pre-wrap bg-background rounded-lg p-4 border border-rose-500/10">
                   {result.errorMessage}
                 </div>
               </div>
            )}
            
            {publicCases.length > 0 && (
              <div className="mt-8 border-t border-border/50 pt-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                  Testcase Results
                </h4>
                
                {/* Tabs Row */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {publicCases.map((tc, idx) => {
                    const passed = tc.passed;
                    const active = activeCaseTab === tc.testCaseId;
                    
                    return (
                      <button
                        key={tc.testCaseId}
                        onClick={() => setActiveCaseTab(tc.testCaseId)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all duration-200 active:scale-95 cursor-pointer",
                          active 
                            ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20" 
                            : "bg-background border-border hover:bg-muted text-muted-foreground hover:text-foreground",
                          passed 
                            ? (active ? "" : "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/5") 
                            : (active ? "" : "border-rose-500/30 text-rose-500 hover:bg-rose-500/5")
                        )}
                      >
                        {passed ? (
                          <CheckCircle2 size={12} className={active ? "text-white" : "text-emerald-500"} />
                        ) : (
                          <XCircle size={12} className={active ? "text-white" : "text-rose-500"} />
                        )}
                        <span>Case {idx + 1}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Tab Details */}
                {(() => {
                  const tc = result.caseResults?.testCases?.find(t => t.testCaseId === activeCaseTab);
                  if (!tc) return null;
                  
                  const isHidden = tc.isHidden;
                  const testCaseInfo = problem.testCases?.find(t => t.id === tc.testCaseId);
                  
                  return (
                    <div className="space-y-4 rounded-2xl border border-border bg-background/50 p-6">
                      <div className="flex items-center justify-between border-b border-border/50 pb-3">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            tc.passed 
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                              : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                          )}>
                            {tc.passed ? "Passed" : "Failed"}
                          </span>
                          {isHidden && (
                            <span className="rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                              🔒 Hidden Case
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {tc.runtimeMs !== undefined && tc.runtimeMs !== null && (
                            <span>Runtime: <strong>{tc.runtimeMs} ms</strong></span>
                          )}
                          {tc.memoryMb != null && tc.memoryMb > 0 && (
                            <span>Memory: <strong>{tc.memoryMb} MB</strong></span>
                          )}
                        </div>
                      </div>

                      {isHidden ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground space-y-2 bg-muted/5 rounded-xl border border-dashed border-border/50 p-4">
                          <span className="text-3xl">🔒</span>
                          <h5 className="text-sm font-semibold text-foreground">Hidden Test Case Details Locked</h5>
                          <p className="text-xs max-w-md leading-relaxed text-muted-foreground">
                            Inputs, expected outputs, and actual execution outputs are kept hidden for academic integrity. 
                            You only need to pass all test cases (both public and hidden) to solve the problem successfully.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 font-mono text-xs">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Input</p>
                            <pre className="bg-muted/30 border border-border rounded-lg p-3 overflow-x-auto max-h-[80px] whitespace-pre-wrap text-foreground">
                              {testCaseInfo?.input || '[Empty Input]'}
                            </pre>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Actual Output</p>
                              <pre className={cn(
                                "border rounded-lg p-3 overflow-x-auto max-h-[120px] whitespace-pre-wrap",
                                tc.passed 
                                  ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-300" 
                                  : "bg-rose-500/5 border-rose-500/10 text-rose-300"
                              )}>
                                {tc.output || '[No Output]'}
                              </pre>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Expected Output</p>
                              <pre className="bg-emerald-500/5 border-emerald-500/10 text-emerald-300 rounded-lg p-3 overflow-x-auto max-h-[120px] whitespace-pre-wrap">
                                {testCaseInfo?.expectedOutput || '[Empty Expected]'}
                              </pre>
                            </div>
                          </div>

                          {tc.error && (
                            <div className="border border-rose-500/20 bg-rose-500/5 rounded-lg p-3">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-1">Execution Error / Stderr</p>
                              <pre className="text-rose-300 overflow-x-auto whitespace-pre-wrap">{tc.error}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
            
            {result.status === 'Accepted' && !result.caseResults?.testCases && (
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-6 text-center">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-3" />
                <h3 className="text-xl font-bold text-emerald-400 mb-1">Success!</h3>
                <p className="text-sm text-emerald-500/70">Your code passed all requirements and constraints.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-30">
            <Terminal size={48} className="text-muted-foreground" />
            <p className="text-sm font-medium tracking-wide">Run or Submit to view results</p>
          </div>
        )}
      </div>
    </div>
  );
}