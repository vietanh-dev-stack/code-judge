import { create } from 'zustand';
import { ClassroomListItem, getMyClassrooms } from '@/services/classroom.apis';

interface ClassroomState {
    teaching: ClassroomListItem[];
    enrolled: ClassroomListItem[];
    archived: ClassroomListItem[];
    loading: boolean;

    fetchClassrooms: () => Promise<void>;
    addClassroom: (classroom: ClassroomListItem, role: 'OWNER' | 'MEMBER') => void;
    reset: () => void;
}

export const useClassroomStore = create<ClassroomState>((set, get) => ({
    teaching: [],
    enrolled: [],
    archived: [],
    loading: false,

    fetchClassrooms: async () => {
        set({ loading: true });

        try {
            const data = await getMyClassrooms();

            set({
                teaching: data
                    .filter((item) => item.role === 'OWNER' && item.classRoom.isActive)
                    .map((item) => item.classRoom),

                enrolled: data
                    .filter((item) => item.role === 'MEMBER' && item.classRoom.isActive)
                    .map((item) => item.classRoom),

                archived: data
                    .filter((item) => !item.classRoom.isActive)
                    .map((item) => item.classRoom),

                loading: false,
            });
        } catch (error) {
            console.error(error);
            set({ loading: false });
        }
    },

    addClassroom: (classroom, role) => {
        const state = get();

        if (role === 'OWNER') {
            if (state.teaching.some((c) => c.id === classroom.id)) return;
            set({
                teaching: [classroom, ...state.teaching],
            });
        } else {
            if (state.enrolled.some((c) => c.id === classroom.id)) return;
            set({
                enrolled: [classroom, ...state.enrolled],
            });
        }
    },

    reset: () => {
        set({
            teaching: [],
            enrolled: [],
            archived: [],
        });
    },
}));