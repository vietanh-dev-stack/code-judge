'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Play, Send, Maximize2, Moon, Sun, Settings, ChevronDown, LayoutDashboard } from 'lucide-react';
import { Problem } from '@/services/problem.apis';
import { cn } from '@/lib/utils';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type CodeEditorPanelProps = {
  problem: Problem;
  code: string;
  setCode: (val: string) => void;
  isRunning: boolean;
  isSubmitting?: boolean;
  onSubmit: (language: string, isDryRun?: boolean) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
};

export default function CodeEditorPanel({ 
  problem, code, setCode, isRunning, isSubmitting = false, onSubmit, isDarkMode, toggleDarkMode 
}: CodeEditorPanelProps) {
  
  const [language, setLanguage] = useState('PYTHON');
  const [isEditorReady, setIsEditorReady] = useState(false);

  const supportedLanguages = useMemo(() => Array.from(new Set([
    ...(problem.supportedLanguages || []),
    'PYTHON', 'JAVASCRIPT', 'CPP', 'JAVA', 'GO', 'RUST'
  ])), [problem.supportedLanguages]);

  useEffect(() => {
    if (supportedLanguages.length > 0) {
      setLanguage(supportedLanguages[0]);
    }
  }, [problem.id]); // Only reset when switching to a different problem

  const handleEditorWillMount = (monacoInstance: any) => {
    monacoInstance.editor.defineTheme('premium-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '5d6d7e', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569cd6' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'number', foreground: 'b5cea8' },
      ],
      colors: {
        'editor.background': '#0a0a0c',
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#3a3a3c',
        'editorLineNumber.activeForeground': '#808080',
        'editor.lineHighlightBackground': '#1a1a1c',
        'editor.selectionBackground': '#264f78',
      },
    });
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* Editor Header */}
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/20 px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all hover:bg-muted hover:text-foreground">
            <LayoutDashboard size={14} className="text-blue-500" />
            Dashboard
          </Link>

          <div className="h-4 w-[1px] bg-border/50 mx-1" />

          <div className="relative group">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="appearance-none rounded-lg border border-border/50 bg-background pl-3 pr-9 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground outline-none transition-all hover:bg-muted focus:ring-1 focus:ring-blue-500/50 cursor-pointer"
            >
              {supportedLanguages.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none group-hover:text-foreground transition-colors" />
          </div>

          <div className="h-4 w-[1px] bg-border/50 mx-1" />

          <button 
            onClick={toggleDarkMode} 
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button 
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => onSubmit(language, true)} 
            disabled={isRunning} 
            className="flex items-center gap-2 rounded-lg border border-border bg-background hover:bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            <Play size={16} className="text-emerald-500 fill-emerald-500" />
            {isRunning && !isSubmitting ? 'Running...' : 'Run'}
          </button>

          <button 
            onClick={() => onSubmit(language, false)} 
            disabled={isRunning} 
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-5 py-2 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
          >
            <Send size={16} />
            {isRunning && isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 relative">
        {!isEditorReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        )}
        <MonacoEditor
          height="100%"
          language={language.toLowerCase()}
          value={code}
          onChange={(value) => setCode(value || '')}
          theme={isDarkMode ? 'premium-dark' : 'light'}
          beforeMount={handleEditorWillMount}
          onMount={() => setIsEditorReady(true)}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: false },
            padding: { top: 20 },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            lineNumbersMinChars: 4,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}