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
    <div className="flex h-full w-full flex-col bg-sidebar text-foreground border-r border-border">
      {/* Phần Logo */}
      <div className="flex h-16 shrink-0 items-center px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Code2 className="h-5 w-5 text-primary-foreground" />
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
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Phần Profile & Logout ở đáy */}
      <div className="border-t border-border p-4">
        <div className="mb-4 flex items-center gap-3 px-2">
          <div className="h-9 w-9 shrink-0 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-medium text-foreground">{user?.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-muted-foreground hover:bg-red-950/30 hover:text-red-400"
          onClick={() => logout()}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}