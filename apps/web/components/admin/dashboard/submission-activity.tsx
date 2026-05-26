'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlayCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface SubmissionActivityProps {
  dailyActivity: {
    day: string;
    total: number;
    accepted: number;
    failed: number;
  }[];
}

export function SubmissionActivity({ dailyActivity }: SubmissionActivityProps) {
  const [timeRange, setTimeRange] = useState('7d');

  // Filter dailyActivity based on time range (last 7, 30, or 90 days)
  const filteredActivity = dailyActivity.slice(
    timeRange === '7d' ? -7 : timeRange === '30d' ? -30 : -90
  );

  const totalSum = filteredActivity.reduce((acc, curr) => acc + curr.total, 0);
  const acceptedSum = filteredActivity.reduce((acc, curr) => acc + curr.accepted, 0);
  const acRate = totalSum > 0 ? ((acceptedSum / totalSum) * 100).toFixed(1) : '0.0';

  return (
    <Card className="col-span-1 border border-border bg-card shadow-xs transition-all duration-300 hover:shadow-md md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold tracking-tight">Submission Activity</CardTitle>
          <CardDescription>Daily code execution statistics over time</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={timeRange}
            onValueChange={(value) => value && setTimeRange(value)}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 3 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {/* Metric highlights */}
        <div className="mb-6 grid grid-cols-3 gap-4 rounded-xl bg-muted/30 p-4 border border-border/50">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <PlayCircle className="h-3.5 w-3.5 text-primary" />
              Total Executions
            </div>
            <p className="text-xl font-bold">{totalSum.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              Accepted (AC)
            </div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {acceptedSum.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Success Rate
            </div>
            <p className="text-xl font-bold text-primary">{acRate}%</p>
          </div>
        </div>

        {/* Recharts Activity Area Chart */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filteredActivity}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                stroke="#888888"
                fontSize={12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                stroke="#888888"
                fontSize={12}
                tickFormatter={(val) => `${val}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xl border border-border bg-popover p-3 shadow-md">
                        <p className="font-semibold text-sm mb-1">{payload[0].payload.day}</p>
                        <div className="space-y-1 text-xs">
                          <p className="text-primary">
                            Total Submissions: <span className="font-bold">{payload[0].value}</span>
                          </p>
                          <p className="text-emerald-600 dark:text-emerald-400">
                            Accepted: <span className="font-bold">{payload[1].value}</span>
                          </p>
                          <p className="text-red-500">
                            Failed: <span className="font-bold">{payload[0].payload.failed}</span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="var(--primary)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTotal)"
                name="Total Submissions"
              />
              <Area
                type="monotone"
                dataKey="accepted"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAccepted)"
                name="Accepted Submissions"
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-xs text-muted-foreground font-medium">{value}</span>}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
