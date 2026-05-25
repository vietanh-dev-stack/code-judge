'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Star, Percent } from 'lucide-react';

interface ProblemItem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  attempts: number;
  accepted: number;
  acRate: number;
}

interface TopProblemsProps {
  mostAttemptedProblems: ProblemItem[];
  hardestProblems: ProblemItem[];
}

export function TopProblems({ mostAttemptedProblems, hardestProblems }: TopProblemsProps) {
  const getDifficultyBadge = (difficulty: 'Easy' | 'Medium' | 'Hard') => {
    switch (difficulty) {
      case 'Easy':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 hover:bg-emerald-500/10 border-transparent">
            Easy
          </Badge>
        );
      case 'Medium':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 hover:bg-amber-500/10 border-transparent">
            Medium
          </Badge>
        );
      case 'Hard':
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 hover:bg-rose-500/10 border-transparent">
            Hard
          </Badge>
        );
    }
  };

  return (
    <Card className="col-span-1 border border-border bg-card shadow-xs transition-all duration-300 hover:shadow-md md:col-span-3">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold tracking-tight">Top Problems</CardTitle>
          <CardDescription>Analytics on problem challenges and submissions</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <Tabs defaultValue="attempted" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="attempted" className="flex items-center gap-1.5 py-2 rounded-lg">
              <Flame className="h-4 w-4 text-orange-500" />
              Most Attempted
            </TabsTrigger>
            <TabsTrigger value="hardest" className="flex items-center gap-1.5 py-2 rounded-lg">
              <Star className="h-4 w-4 text-rose-500" />
              Hardest Problems
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attempted" className="space-y-3">
            {mostAttemptedProblems.map((prob) => (
              <div 
                key={prob.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 dark:bg-orange-500/20">
                    <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm line-clamp-1">{prob.title}</span>
                      {getDifficultyBadge(prob.difficulty)}
                    </div>
                    <span className="text-2xs text-muted-foreground">ID: #{prob.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 self-end sm:self-center">
                  <div className="text-right">
                    <span className="block text-xs font-bold">{prob.attempts.toLocaleString()}</span>
                    <span className="text-3xs text-muted-foreground uppercase font-medium">Attempts</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400">{prob.accepted.toLocaleString()}</span>
                    <span className="text-3xs text-muted-foreground uppercase font-medium">AC</span>
                  </div>
                  <div className="w-[80px] text-right">
                    <div className="flex items-center justify-end gap-1 text-primary font-bold text-sm">
                      <Percent className="h-3 w-3" />
                      {prob.acRate}%
                    </div>
                    <span className="text-3xs text-muted-foreground uppercase font-medium">AC Rate</span>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="hardest" className="space-y-3">
            {hardestProblems.map((prob) => (
              <div 
                key={prob.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 dark:bg-rose-500/20">
                    <Star className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm line-clamp-1">{prob.title}</span>
                      {getDifficultyBadge(prob.difficulty)}
                    </div>
                    <span className="text-2xs text-muted-foreground">ID: #{prob.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 self-end sm:self-center">
                  <div className="text-right">
                    <span className="block text-xs font-bold">{prob.attempts.toLocaleString()}</span>
                    <span className="text-3xs text-muted-foreground uppercase font-medium">Attempts</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400">{prob.accepted.toLocaleString()}</span>
                    <span className="text-3xs text-muted-foreground uppercase font-medium">AC</span>
                  </div>
                  <div className="w-[80px] text-right">
                    <div className="flex items-center justify-end gap-1 text-rose-500 font-bold text-sm">
                      <Percent className="h-3 w-3" />
                      {prob.acRate}%
                    </div>
                    <span className="text-3xs text-muted-foreground uppercase font-medium">AC Rate</span>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
