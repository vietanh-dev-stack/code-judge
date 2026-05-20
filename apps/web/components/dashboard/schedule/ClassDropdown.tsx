'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getMyClassrooms, MyClassroomItem } from '@/services/classroom.apis';

export default function ClassDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [classrooms, setClassrooms] = useState<MyClassroomItem[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedClassId = searchParams.get('classId') || 'all';

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const data = await getMyClassrooms();
        setClassrooms(data);
      } catch (error) {
        console.error('Failed to fetch classrooms:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchClassrooms();
  }, []);

  const handleValueChange = (value: string | null) => {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('classId');
    } else {
      params.set('classId', value);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <Select value={selectedClassId} onValueChange={handleValueChange}>
      <SelectTrigger className="w-full max-w-80 cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-6 text-sm shadow-sm transition-all hover:border-black focus:ring-0">
        <SelectValue placeholder="Select a class" />
      </SelectTrigger>
      <SelectContent side="bottom" className="rounded-xl border-gray-100 shadow-xl">
        <SelectGroup>
          <SelectLabel className="text-gray-400 font-bold text-[10px] uppercase tracking-wider px-2 py-2">
            My Classes
          </SelectLabel>
          <SelectItem className="cursor-pointer py-2.5 rounded-lg focus:bg-gray-50" value="all">
            All Classes
          </SelectItem>
          {classrooms.map((item) => (
            <SelectItem
              key={item.classRoom.id}
              className="cursor-pointer py-2.5 rounded-lg focus:bg-gray-50"
              value={item.classRoom.id}
            >
              {item.classRoom.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
