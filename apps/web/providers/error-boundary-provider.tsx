'use client';

import React, { Component, useEffect } from 'react';
import { installGlobalErrorHandlers, captureError } from '@/lib/error-reporter';

/* ------------------------------------------------------------------ */
/*  React Error Boundary (class component — React requires this)      */
/* ------------------------------------------------------------------ */

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ReactErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    captureError(error.message, 'react_error_boundary', {
      stack: error.stack,
      severity: 'high',
      componentStack: info.componentStack ?? undefined,
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            gap: '1rem',
            padding: '2rem',
            fontFamily: 'var(--font-sans, system-ui, sans-serif)',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            Something went wrong
          </h2>
          <p style={{ color: '#6b7280', maxWidth: '28rem', textAlign: 'center' }}>
            An unexpected error occurred. The error has been automatically
            reported. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #d1d5db',
              background: '#111827',
              color: '#f9fafb',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/*  Installer hook — mounts global listeners once                      */
/* ------------------------------------------------------------------ */

function GlobalErrorInstaller() {
  useEffect(() => {
    installGlobalErrorHandlers();
  }, []);
  return null;
}

/* ------------------------------------------------------------------ */
/*  Public provider — use in layout.tsx                                 */
/* ------------------------------------------------------------------ */

/**
 * Wraps children with:
 *   1. Global error listeners (JS errors, unhandled rejections, resource failures).
 *   2. React Error Boundary (catches component-tree render errors).
 */
export function ErrorBoundaryProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalErrorInstaller />
      <ReactErrorBoundary>{children}</ReactErrorBoundary>
    </>
  );
}
