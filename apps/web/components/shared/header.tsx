'use client';

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { Code2, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  const { user } = useAuthStore();

  return (
    <nav className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">CodeJudge</span>
          </Link>
        </div>

        {/* Menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/#features"
            className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1.5 group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            Features
          </Link>
          <Link
            href="/#for-educators"
            className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1.5 group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            Educators
          </Link>
          <Link
            href="/#for-students"
            className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1.5 group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            Students
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <Button
              variant="default"
              asChild
              className="rounded-full px-6 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Go to Dashboard
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild className="hover:text-primary hover:bg-transparent">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button
                asChild
                className="rounded-full px-6 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              >
                <Link href="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
