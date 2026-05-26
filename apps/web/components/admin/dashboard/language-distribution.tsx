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

interface LanguageDistributionProps {
  languageData: {
    name: string;
    value: number;
    color: string;
    percentage: string;
  }[];
}

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#eab308', // Yellow
  TypeScript: '#3b82f6', // Sky Blue
  Python: '#06b6d4',     // Cyan
  'C++': '#a855f7',      // Purple
  C: '#6366f1',          // Indigo
  Java: '#ef4444',       // Red
  Go: '#14b8a6',         // Teal
  Rust: '#f97316',       // Orange
};

const getLanguageColor = (name: string, index: number) => {
  if (LANGUAGE_COLORS[name]) return LANGUAGE_COLORS[name];
  const palette = ['#eab308', '#3b82f6', '#06b6d4', '#a855f7', '#6366f1', '#ef4444', '#14b8a6', '#f97316'];
  return palette[index % palette.length];
};

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
                    const index = languageData.findIndex(l => l.name === data.name);
                    const color = getLanguageColor(data.name, index);
                    return (
                      <div className="rounded-xl border border-border bg-popover p-2.5 shadow-md text-xs">
                        <span className="font-semibold" style={{ color }}>{data.name}</span>
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
                    fill={getLanguageColor(entry.name, index)}
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
          {languageData.map((lang, index) => (
            <div key={lang.name} className="flex flex-col items-center">
              <span className="text-3xs font-bold text-muted-foreground uppercase">{lang.name === 'JavaScript' ? 'JS' : lang.name}</span>
              <span className="text-xs font-semibold mt-0.5" style={{ color: getLanguageColor(lang.name, index) }}>{lang.percentage}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
