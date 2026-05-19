'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code } from 'lucide-react';

interface LanguageDistributionProps {
  languageData: {
    name: string;
    value: number;
    color: string;
    percentage: string;
  }[];
}

export function LanguageDistribution({ languageData }: LanguageDistributionProps) {

  return (
    <Card className="col-span-1 border border-border bg-card shadow-xs transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold tracking-tight">Language Usage</CardTitle>
            <CardDescription>Preferred languages for submissions</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[230px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={languageData}
              layout="vertical"
              margin={{ top: 0, right: 10, left: -10, bottom: 0 }}
            >
              <XAxis
                type="number"
                hide
              />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                stroke="#888888"
                fontSize={12}
                width={80}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-border bg-popover p-2.5 shadow-md text-xs">
                        <span className="font-semibold text-foreground">{data.name}</span>
                        <div className="mt-1 text-muted-foreground">
                          Submissions: <span className="font-bold text-foreground">{data.value.toLocaleString()}</span>
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
              <Bar
                dataKey="value"
                radius={[0, 4, 4, 0]}
                barSize={16}
              >
                {languageData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="opacity-90 hover:opacity-100 transition-opacity"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown text details */}
        <div
          className="mt-4 grid gap-1 text-center border-t border-border/50 pt-4"
          style={{ gridTemplateColumns: `repeat(${languageData.length}, minmax(0, 1fr))` }}
        >
          {languageData.map((lang) => (
            <div key={lang.name} className="flex flex-col items-center">
              <span className="text-3xs font-bold text-muted-foreground uppercase">{lang.name === 'JavaScript' ? 'JS' : lang.name}</span>
              <span className="text-xs font-semibold mt-0.5" style={{ color: lang.color }}>{lang.percentage}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
