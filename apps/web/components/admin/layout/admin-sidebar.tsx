'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { 
  Users, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Code2,
  FileQuestion,
  BookOpen,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'Problems', href: '/admin/problems', icon: Code2 },
  { title: 'Contests', href: '/admin/contests', icon: BookOpen },
  { title: 'Tags', href: '/admin/tags', icon: Tag },
  { title: 'Users', href: '/admin/users', icon: Users },
  { title: 'Setting', href: '/admin/setting', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  // Lấy hàm logout và thông tin user từ Zustand store của bạn
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-full w-full flex-col bg-slate-950 text-slate-50">
      {/* Phần Logo */}
      <div className="flex h-16 shrink-0 items-center px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <Code2 className="h-5 w-5 text-white" />
          </div>
          <span>Code Judge</span>
        </Link>
      </div>

      {/* Phần Menu Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-indigo-600 text-white" 
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Phần Profile & Logout ở đáy */}
      <div className="border-t border-slate-800 p-4">
        <div className="mb-4 flex items-center gap-3 px-2">
          <div className="h-9 w-9 shrink-0 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-medium text-slate-200">{user?.name}</span>
            <span className="truncate text-xs text-slate-500">{user?.email}</span>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-slate-400 hover:bg-red-950/30 hover:text-red-400"
          onClick={() => logout()}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}