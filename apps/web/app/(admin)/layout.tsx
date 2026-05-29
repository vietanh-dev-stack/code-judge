'use client';

import { Menu } from 'lucide-react';
import AdminSidebar from '@/components/admin/layout/admin-sidebar';
import { UserNav } from '@/components/shared/user-nav';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useScrollbarHover } from '@/hooks/useScrollbarHandle';
import { useAuthStore } from '@/store/auth-store';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mainScrollRef = useScrollbarHover();
  const { user, loading } = useAuthStore();

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      
      {/* 1. SIDEBAR CHO DESKTOP (Ẩn trên mobile) */}
      <aside className="hidden w-64 shrink-0 border-r border-border md:block">
        <div className="fixed inset-y-0 w-64">
          <AdminSidebar />
        </div>
      </aside>

      {/* 2. KHU VỰC NỘI DUNG CHÍNH */}
      <div className="flex flex-1 flex-col">
        
        {/* HEADER DÀNH CHO MOBILE (Chỉ hiện trên màn hình nhỏ) */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-4 sm:h-16 md:hidden">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <AdminSidebar />
              </SheetContent>
            </Sheet>
            <div className="truncate font-semibold tracking-tight">Admin</div>
          </div>
          {!loading && user && <UserNav />}
        </header>

        <header className="sticky top-0 z-30 hidden h-14 shrink-0 items-center justify-end border-b border-border bg-background px-4 md:flex">
          {!loading && user && <UserNav />}
        </header>

        {/* NỘI DUNG TRANG (Page Content) */}
        <main
          ref={mainScrollRef}
          className="custom-scrollbar flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        >
          {children}
        </main>
        
      </div>
    </div>
  );
}