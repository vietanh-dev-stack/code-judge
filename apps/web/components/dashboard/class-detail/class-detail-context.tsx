'use client';

import { createContext, useContext } from 'react';

export type ClassDetailContextValue = {
  classId: string;
  className: string;
  isActive: boolean;
  isOwner: boolean;
  /** Owner may manage class only when it is not archived */
  canManage: boolean;
  /** ADMIN hoặc chủ lớp — được xuất báo cáo số liệu */
  canExportReports: boolean;
};

const ClassDetailContext = createContext<ClassDetailContextValue | null>(null);

export function ClassDetailProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ClassDetailContextValue;
}) {
  return <ClassDetailContext.Provider value={value}>{children}</ClassDetailContext.Provider>;
}

export function useClassDetail() {
  const ctx = useContext(ClassDetailContext);
  if (!ctx) {
    throw new Error('useClassDetail must be used within ClassDetailProvider');
  }
  return ctx;
}
