'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, authApi } from '@/services/auth.apis';
import { Button } from '@/components/ui/button';

export function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accept = async () => {
      if (!token) return;

      try {
        setLoading(true);

        const res = await apiFetch<{
          message: string;
          classRoomId: string;
        }>(`/invites/accept?token=${token}`);

        router.push(`/dashboard/${res.classRoomId}`);
      } catch (err: any) {
        setError(err?.body?.message || 'Failed to accept invite');
      } finally {
        setLoading(false);
      }
    };

    accept();
  }, [token, router]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center">Accepting invitation...</div>;
  }

  if (error) {
    const isForbidden =
      error.toLowerCase().includes('forbidden') ||
      error.toLowerCase().includes('invalid user');

    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="space-y-2">
          <p className="text-2xl font-bold text-red-600">Invitation Error</p>
          <p className="text-gray-600 max-w-md">
            {isForbidden
              ? 'This invitation was sent to a different email address. Please log in with the correct account to join.'
              : error}
          </p>
        </div>

        <div className="flex gap-4">
          {isForbidden ? (
            <Button
              variant="destructive"
              onClick={async () => {
                await authApi.logout();
                router.push(
                  `/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`,
                );
              }}
            >
              Log out and Try Again
            </Button>
          ) : (
            <Button onClick={() => router.push('/')}>Go Home</Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
