'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function AuthCallbackPage() {
  const router = useRouter();
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    const completeLogin = async () => {
      try {
        // Backend already set HttpOnly refresh cookie
        // We now exchange it for a fresh access token
        const { authApi } = await import('@/services/auth.apis');

        const success = await authApi.refreshSession();

        if (!success) {
          router.replace('/login');
          return;
        }

        // Load current user
        await useAuthStore.getState().refreshUser();

        router.replace('/dashboard');
      } catch {
        router.replace('/login');
      }
    };

    completeLogin();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="flex flex-col items-center">
        {/* Spinner */}
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-white/10" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-white" />
        </div>

        {/* Text */}
        <p className="mt-6 text-sm font-medium tracking-wide text-white/70">
          Completing sign in...
        </p>

        {/* Optional subtle subtext */}
        <p className="mt-1 text-xs text-white/30">
          Please wait a moment
        </p>
      </div>
    </div>
  );
}