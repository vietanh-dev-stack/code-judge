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

  const toggle = useSidebarStore(
    (state) => state.toggle,
  );

  const [isMenuOpen, setIsMenuOpen] =
    useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] =
    useState(false);

  const [isJoinModalOpen, setIsJoinModalOpen] =
    useState(false);

  return (
    <>
      <header className="fixed top-0 w-full h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={toggle}
            className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>

          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <Code2 className="w-5 h-5 text-primary-foreground" />
          </div>

          <span className="text-xl font-bold">
            CodeJudge
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              onClick={() =>
                setIsMenuOpen(!isMenuOpen)
              }
              className="rounded-full w-10 h-10 cursor-pointer hover:bg-gray-700"
            >
              <Plus className="w-5 h-5" />
            </Button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                <button
                  onClick={() => {
                    setIsCreateModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left cursor-pointer p-3 border-b border-gray-100 text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Create new classroom
                </button>

                <button
                  onClick={() => {
                    setIsJoinModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left cursor-pointer p-3 text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Join a classroom
                </button>
              </div>
            )}
          </div>

          {!loading && user && <UserNav />}
        </div>
      </header>

      <CreateClassroomModal
        open={isCreateModalOpen}
        onClose={() =>
          setIsCreateModalOpen(false)
        }
      />

      <JoinClassroomModal
        open={isJoinModalOpen}
        onClose={() =>
          setIsJoinModalOpen(false)
        }
      />
    </>
  );
}