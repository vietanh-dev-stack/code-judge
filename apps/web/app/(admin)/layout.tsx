'use client';

import { Menu } from 'lucide-react';
import AdminSidebar from '@/components/admin/layout/admin-sidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-slate-50/50">
      
      {/* 1. SIDEBAR CHO DESKTOP (Ẩn trên mobile) */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 md:block">
        <div className="fixed inset-y-0 w-64">
          <AdminSidebar />
        </div>
      </aside>

      {/* 2. KHU VỰC NỘI DUNG CHÍNH */}
      <div className="flex flex-1 flex-col">
        
        {/* HEADER DÀNH CHO MOBILE (Chỉ hiện trên màn hình nhỏ) */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:h-16 md:hidden">
          <Sheet>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            {/* Sidebar kéo trượt từ trái sang (Mobile) */}
            <SheetContent side="left" className="w-72 p-0">
              <AdminSidebar />
            </SheetContent>
          </Sheet>
          <div className="font-semibold tracking-tight">Admin Dashboard</div>
        </header>

        {/* NỘI DUNG TRANG (Page Content) */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        
      </div>
    </div>
  );
}