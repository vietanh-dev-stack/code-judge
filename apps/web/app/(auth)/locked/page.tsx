'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';

export default function LockedPage() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Account Locked
        </h1>
        
        <p className="text-slate-500 mb-8 leading-relaxed">
          Your account has been locked by an administrator. 
          Please contact support if you believe this is a mistake.
        </p>

        <div className="space-y-3">
          <Button 
            onClick={() => logout()}
            className="w-full bg-slate-900 hover:bg-slate-800 h-11 text-base cursor-pointer"
          >
            Back to Login
          </Button>
          
          <Link 
            href="/"
            className="block text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
