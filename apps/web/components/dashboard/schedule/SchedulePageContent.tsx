'use client';

import { useSearchParams } from 'next/navigation';
import { startOfWeek, addDays, isSameDay, format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { getMyClassrooms } from '@/services/classroom.apis';
import { contestsApi } from '@/services/contest.apis';
import Link from 'next/link';

interface ScheduleEvent {
  date: string;
  title: string;
  time: string;
  type: 'Problem' | 'Contest';
  className: string;
  classId: string;
  href?: string;
}

export default function SchedulePageContent({ filter }: { filter?: string }) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);

  const selectedClassId = searchParams.get('classId');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const classrooms = await getMyClassrooms();
        const allEvents: ScheduleEvent[] = [];

        for (const item of classrooms) {
          for (const assignment of item.classRoom.assignments) {
            if (assignment.contestId) {
              try {
                const contest = await contestsApi.findById(assignment.contestId);
                allEvents.push({
                  date: contest.endAt,
                  title: assignment.title,
                  time: format(new Date(contest.endAt), 'HH:mm'),
                  type: 'Contest',
                  className: item.classRoom.name,
                  classId: item.classRoom.id,
                  href: `/dashboard/${item.classRoom.id}/contests/${contest.id}`,
                });
              } catch (error) {
                console.error(`Failed to fetch contest ${assignment.contestId}:`, error);
              }
            } else if (assignment.dueAt) {
              allEvents.push({
                date: assignment.dueAt,
                title: assignment.title,
                time: format(new Date(assignment.dueAt), 'HH:mm'),
                type: 'Problem',
                className: item.classRoom.name,
                classId: item.classRoom.id,
                href: assignment.problemId ? `/problem/${assignment.problemId}` : undefined,
              });
            }
          }
        }

        setEvents(allEvents);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const dateParam = searchParams.get('date');
  const currentDate = dateParam ? new Date(dateParam) : new Date();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  const daysInWeek = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const filteredEvents = events.filter((event) => {
    // filter class
    const matchClass = selectedClassId ? event.classId === selectedClassId : true;

    // filter type
    const matchType = filter ? event.type.toLowerCase() === filter.toLowerCase() : true;

    return matchClass && matchType;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-medium">Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-md h-full">
      <div className="grid grid-cols-7 divide-x divide-border h-full min-h-[600px]">
        {daysInWeek.map((day, index) => {
          const dayEvents = filteredEvents
            .filter((e) => isSameDay(new Date(e.date), day))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          return (
            <div key={index} className="flex flex-col min-h-full">
              {/* Header */}
              <div className="py-4 flex flex-col items-center border-b border-border bg-muted/10">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${isSameDay(day, new Date()) ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {format(day, 'EEE', { locale: enUS })}
                </span>
                <span
                  className={`text-2xl font-light mt-1 flex items-center justify-center h-10 w-10 rounded-full ${isSameDay(day, new Date()) ? 'text-primary-foreground font-bold bg-primary' : 'text-muted-foreground'}`}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Events */}
              <div className="p-2 flex-1 space-y-2 overflow-y-auto max-h-[500px]">
                {dayEvents.map((event, idx) => {
                  const itemClasses = `
                        rounded-xl px-3 py-2.5
                        border transition-all duration-200
                        
                        ${
                          event.type === 'Contest'
                            ? 'bg-primary/10 border-primary/20 hover:border-primary/40 hover:bg-primary/15'
                            : 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/15'
                        }
                      `;

                  const dotColor = event.type === 'Contest' ? 'bg-primary' : 'bg-emerald-500';

                  const content = (
                    <div className={itemClasses}>
                      <div className="flex items-start gap-2">
                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${dotColor}`} />

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground line-clamp-2">
                            {event.title}
                          </p>

                          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span className="truncate font-medium">{event.className}</span>

                            <span className="tabular-nums">{event.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );

                  return event.href ? (
                    <Link key={idx} href={event.href} className="block">
                      {content}
                    </Link>
                  ) : (
                    <div key={idx}>{content}</div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
