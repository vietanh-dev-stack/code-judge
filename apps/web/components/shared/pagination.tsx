'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const handlePageSelect = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always include page 1
      pages.push(1);

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      if (start > 2) {
        pages.push('ellipsis-start');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('ellipsis-end');
      }

      // Always include last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <nav
      aria-label="Pagination Navigation"
      className={cn('flex items-center justify-center gap-1.5 mt-8 py-4 select-none', className)}
    >
      {/* First Page Button */}
      <button
        onClick={() => handlePageSelect(1)}
        disabled={currentPage === 1}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-all duration-200 hover:bg-muted active:scale-95 disabled:pointer-events-none disabled:opacity-40 cursor-pointer shadow-sm',
        )}
        title="First Page"
      >
        <ChevronsLeft size={16} />
      </button>

      {/* Previous Page Button */}
      <button
        onClick={() => handlePageSelect(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-all duration-200 hover:bg-muted active:scale-95 disabled:pointer-events-none disabled:opacity-40 cursor-pointer shadow-sm',
        )}
        title="Previous Page"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1.5 mx-1">
        {getPageNumbers().map((page, idx) => {
          if (typeof page === 'string') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="flex h-9 w-9 items-center justify-center text-sm font-medium text-muted-foreground select-none"
              >
                &bull;&bull;&bull;
              </span>
            );
          }

          const isCurrent = page === currentPage;

          return (
            <button
              key={`page-${page}`}
              onClick={() => handlePageSelect(page)}
              className={cn(
                'flex h-9 w-9 items-center justify-center text-sm font-bold rounded-lg border transition-all duration-200 active:scale-95 cursor-pointer shadow-sm',
                isCurrent
                  ? 'bg-blue-600 border-blue-600 text-white font-extrabold shadow-[0_0_12px_rgba(37,99,235,0.25)] scale-105'
                  : 'bg-card border-border hover:bg-muted text-foreground hover:border-foreground/20',
              )}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* Next Page Button */}
      <button
        onClick={() => handlePageSelect(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-all duration-200 hover:bg-muted active:scale-95 disabled:pointer-events-none disabled:opacity-40 cursor-pointer shadow-sm',
        )}
        title="Next Page"
      >
        <ChevronRight size={16} />
      </button>

      {/* Last Page Button */}
      <button
        onClick={() => handlePageSelect(totalPages)}
        disabled={currentPage === totalPages}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-all duration-200 hover:bg-muted active:scale-95 disabled:pointer-events-none disabled:opacity-40 cursor-pointer shadow-sm',
        )}
        title="Last Page"
      >
        <ChevronsRight size={16} />
      </button>
    </nav>
  );
}
