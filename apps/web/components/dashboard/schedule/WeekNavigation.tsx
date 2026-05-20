'use client';

import React, { useState, useMemo } from 'react';
import { format, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';

export default function WeekNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. Lấy ngày từ URL (?date=2024-03-24), nếu không có dùng ngày hiện tại
  const dateParam = searchParams.get('date');
  const currentDate = dateParam ? new Date(dateParam) : new Date();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  // 2. Hàm chuyển tuần bằng cách thay đổi URL
  const updateWeek = (newDate: Date) => {
    const dateStr = format(newDate, 'yyyy-MM-dd');
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', dateStr);

    router.push(`?${params.toString()}`);
  };

  const formatRange = () => {
    return `${format(weekStart, 'MMM d', { locale: enUS })} - ${format(weekEnd, 'MMM d, yyyy', {
      locale: enUS,
    })}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-center gap-8">
        <Button
          variant="outline"
          size="icon"
          onClick={() => updateWeek(subWeeks(currentDate, 1))}
          className="rounded-full cursor-pointer"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <span className="text-lg font-medium text-zinc-800 min-w-[240px] text-center capitalize">
          {formatRange()}
        </span>

        <Button
          variant="outline"
          size="icon"
          onClick={() => updateWeek(addWeeks(currentDate, 1))}
          className="rounded-full cursor-pointer"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
