'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const refreshUser = useAuthStore((state) => state.refreshUser);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return <>{children}</>;
}