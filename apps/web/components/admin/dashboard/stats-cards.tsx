'use client';

import { Users, Code2, BookOpen, GraduationCap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
  stats: {
    totalUsers: number;
    totalProblems: number;
    totalContests: number;
    activeClassrooms: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const statItems = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      isPositive: true,
      icon: Users,
      iconColorClass: 'text-primary',
      bgGradClass: 'from-primary/10 to-orange-500/10 border-primary/20',
    },
    {
      title: 'Total Problems',
      value: stats.totalProblems.toLocaleString(),
      isPositive: true,
      icon: Code2,
      iconColorClass: 'text-emerald-500',
      bgGradClass: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20',
    },
    {
      title: 'Total Contests',
      value: stats.totalContests.toLocaleString(),
      isPositive: true,
      icon: BookOpen,
      iconColorClass: 'text-amber-500',
      bgGradClass: 'from-amber-500/10 to-orange-500/10 border-amber-500/20',
    },
    {
      title: 'Active Classrooms',
      value: stats.activeClassrooms.toLocaleString(),
      isPositive: false,
      icon: GraduationCap,
      iconColorClass: 'text-rose-500',
      bgGradClass: 'from-rose-500/10 to-pink-500/10 border-rose-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <Card
            key={i}
            className={cn(
              "relative overflow-hidden border bg-gradient-to-br transition-all duration-300 hover:-translate-y-1 hover:shadow-lg bg-card border-border",
              stat.bgGradClass
            )}
          >
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-current opacity-5 blur-2xl" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
                <div className={cn("p-2 rounded-xl bg-background shadow-xs", stat.iconColorClass)}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight">{stat.value}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
