'use client';

import Link from 'next/link';
import { CalendarDays } from 'lucide-react';

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const typeConfig = {
  problem: {
    label: 'Problem',
    accentColor: '#7F77DD',
    badgeBg: '#EEEDFE',
    badgeText: '#534AB7',
    arrowHover: '#7F77DD',
  },
  contest: {
    label: 'Contest',
    accentColor: '#1D9E75',
    badgeBg: '#E1F5EE',
    badgeText: '#0F6E56',
    arrowHover: '#1D9E75',
  },
};

export function ClassPost({ assignment, classId }: { assignment: any; classId: string }) {
  const { title, description, publishedAt, dueAt, problem, contest } = assignment;

  const type = problem ? 'problem' : 'contest';
  const config = typeConfig[type];

  const link = problem
    ? `/dashboard/${classId}/problems/${problem.id}`
    : contest
      ? `/dashboard/${classId}/contests/${contest.id}`
      : '#';

  return (
    <div className="group w-full rounded-2xl border border-gray-100 bg-white overflow-hidden transition-all duration-150 hover:border-gray-200 hover:shadow-sm">
      <div className="flex items-stretch">
        {/* Content */}
        <div className="flex flex-1 items-center justify-between gap-4 px-5 py-4">
          <div className="flex-1 min-w-0">
            {/* Badge + date */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[11px] font-medium tracking-wide uppercase rounded-full px-2.5 py-0.5"
                style={{
                  backgroundColor: config.badgeBg,
                  color: config.badgeText,
                }}
              >
                {config.label}
              </span>
              <span className="text-xs text-gray-400">{formatDate(publishedAt)}</span>
            </div>

            {/* Title */}
            <h2 className="text-base font-semibold text-gray-900 leading-snug">{title}</h2>

            {/* Description */}
            {description && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{description}</p>
            )}

            {/* Due date */}
            {dueAt && (
              <div className="mt-3 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-xs font-semibold text-rose-500">
                  Due: {formatDate(dueAt)}
                </span>
              </div>
            )}
          </div>

          {/* Arrow button */}
          <Link
            href={link}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-gray-100 text-gray-700 transition-all duration-150"
            style={
              {
                '--hover-bg': config.accentColor,
              } as React.CSSProperties
            }
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.backgroundColor = config.accentColor;
              el.style.borderColor = config.accentColor;
              el.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.backgroundColor = '';
              el.style.borderColor = '';
              el.style.color = '';
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
