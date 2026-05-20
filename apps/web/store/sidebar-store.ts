import { create } from 'zustand';

interface SidebarState {
  isOpen: boolean;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  expand: () => set({ isOpen: true }),
  collapse: () => set({ isOpen: false }),
}));
