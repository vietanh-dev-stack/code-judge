'use client';

import { Code2, Menu, Plus } from 'lucide-react';
import { UserNav } from '../shared/user-nav';
import { useAuthStore } from '@/store/auth-store';
import { useSidebarStore } from '@/store/sidebar-store';
import { Button } from '../ui/button';
import { useState } from 'react';

import { JoinClassroomModal } from './classroom/join-classroom-modal';
import { CreateClassroomModal } from './classroom/create-classroom-modal';

export default function DashboardHeader() {
  const { user, loading } = useAuthStore();

  const toggle = useSidebarStore((state) => state.toggle);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={toggle}
            className="cursor-pointer rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
            <Code2 className="h-5 w-5 text-primary-foreground" />
          </div>

          <span className="text-xl font-bold text-foreground">CodeJudge</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="h-10 w-10 cursor-pointer rounded-full hover:border-primary hover:bg-primary/10 hover:text-primary"
            >
              <Plus className="h-5 w-5" />
            </Button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl">
                <button
                  onClick={() => {
                    setIsCreateModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full cursor-pointer border-b border-border p-3 text-left font-medium transition-colors hover:bg-muted"
                >
                  Create new classroom
                </button>

                <button
                  onClick={() => {
                    setIsJoinModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full cursor-pointer p-3 text-left font-medium transition-colors hover:bg-muted"
                >
                  Join a classroom
                </button>
              </div>
            )}
          </div>

          {!loading && user && <UserNav />}
        </div>
      </header>

      <CreateClassroomModal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

      <JoinClassroomModal open={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} />
    </>
  );
}
