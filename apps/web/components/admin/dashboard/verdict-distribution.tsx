'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface VerdictDistributionProps {
  verdictData: {
    name: string;
    value: number;
    color: string;
    percentage: string;
  }[];
}

export function VerdictDistribution({ verdictData }: VerdictDistributionProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totalVerdictsCount = verdictData.reduce((sum, item) => sum + item.value, 0);
  const totalVerdictsFormatted = totalVerdictsCount >= 1000
    ? `${(totalVerdictsCount / 1000).toFixed(1)}K`
    : totalVerdictsCount.toLocaleString();
  

  return (
    <Card className="col-span-1 border border-border bg-card shadow-xs transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-0">
        <CardTitle className="text-xl font-bold tracking-tight">Verdict Distribution</CardTitle>
        <CardDescription>Breakdown of all submission verdicts</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-between gap-6 pt-4">
        {/* Chart container */}
        <div className="relative h-[180px] w-[180px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-border bg-popover p-2.5 shadow-md text-xs">
                        <span className="font-semibold" style={{ color: data.color }}>
                          {data.name}
                        </span>
                        <div className="mt-1 text-muted-foreground">
                          Count: <span className="font-bold text-foreground">{data.value.toLocaleString()}</span>
                        </div>
                        <div className="text-muted-foreground">
                          Share: <span className="font-bold text-foreground">{data.percentage}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie
                data={verdictData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {verdictData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    style={{
                      filter: activeIndex === index ? 'drop-shadow(0px 4px 12px rgba(0, 0, 0, 0.15))' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                      transformOrigin: 'center'
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Inner details */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-bold tracking-tight">{totalVerdictsFormatted}</span>
            <span className="text-2xs text-muted-foreground uppercase tracking-widest font-semibold">Verdicts</span>
          </div>
        </div>

        {/* Legend container */}
        <div className="w-full space-y-1.5 mt-2">
          {verdictData.map((item, index) => (
            <div 
              key={item.name}
              className={cn(
                "flex items-center justify-between rounded-lg p-2 transition-colors duration-150 border border-transparent",
                activeIndex === index ? "bg-muted/50 border-border/40" : "hover:bg-muted/20"
              )}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span 
                  className="h-3 w-3 shrink-0 rounded-full" 
                  style={{ backgroundColor: item.color }} 
                />
                <span className="text-xs font-semibold text-foreground/90 truncate">{item.name}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold">{item.value.toLocaleString()}</span>
                <span className="ml-2 text-2xs text-muted-foreground font-medium">{item.percentage}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
