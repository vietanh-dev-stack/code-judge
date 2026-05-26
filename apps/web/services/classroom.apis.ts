import { apiFetch } from './api-client';

export type ProblemVisibility = 'PRIVATE' | 'PUBLIC' | 'CONTEST_ONLY';

export type ClassroomAssignmentProblem = {
  id: string;
  slug: string;
  visibility: ProblemVisibility;
};

export type ClassroomAssignment = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  problemId: string | null;
  contestId: string | null;
  publishedAt: string;
  problem?: ClassroomAssignmentProblem;
  contest?: {
    id: string;
    slug: string;
    startAt?: string;
    endAt?: string;
  };
};

/** Lớp trong danh sách `/classroom/me` (ít field hơn `Classroom` chi tiết). */
export type ClassroomListItem = {
  id: string;
  name: string;
  description?: string | null;
  academicYear?: string | null;
  classCode: string;
  isActive: boolean;
  owner: {
    id: string;
    name: string;
    image?: string | null;
  };
  assignments: ClassroomAssignment[];
  _count?: {
    enrollments: number;
  };
};

export interface Classroom {
  id: string;
  name: string;
  description?: string | null;
  academicYear?: string | null;
  classCode: string;
  /** false when the class is archived */
  isActive: boolean;
  owner: {
    id: string;
    name: string;
    image?: string | null;
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  assignments: ClassroomAssignment[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassroomDto {
  name: string;
  description?: string;
  academicYear?: string;
}

export interface UpdateClassroomDto {
  name?: string;
  description?: string;
  academicYear?: string;
}

export interface JoinClassroomDto {
  classCode: string;
}

export interface AdminClassroomListItem {
  id: string;
  name: string;
  classCode: string;
  academicYear?: string | null;
  ownerId: string;
  owner: { id: string; name: string; email: string };
}

export interface MyClassroomItem {
  role: 'OWNER' | 'MEMBER';

  classRoom: ClassroomListItem;
}

export interface ClassroomPeopleResponse {
  ownerId: string;

  teachers: {
    id: string;
    name: string;
    image?: string | null;
  }[];

  students: {
    id: string;
    name: string;
    image?: string | null;
  }[];
}

// CREATE CLASSROOM
export async function createClassroom(dto: CreateClassroomDto): Promise<Classroom> {
  return apiFetch<Classroom>('/classroom', {
    method: 'POST',
    body: dto,
  });
}

// GET MY CLASSROOMS
export async function getMyClassrooms(): Promise<MyClassroomItem[]> {
  return apiFetch<MyClassroomItem[]>('/classroom/me');
}

/** Admin: danh sách lớp (phân trang, tìm kiếm). */
export async function listClassroomsForAdmin(query?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: AdminClassroomListItem[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams();
  if (query?.search) params.set('search', query.search);
  if (query?.page) params.set('page', query.page.toString());
  if (query?.limit) params.set('limit', query.limit.toString());
  const qs = params.toString();
  return apiFetch(`/classroom/admin/all${qs ? `?${qs}` : ''}`);
}

// GET CLASSROOM DETAIL
export async function getClassroomDetail(id: string, options?: RequestInit): Promise<Classroom> {
  return apiFetch<Classroom>(`/classroom/${id}`, options);
}

// GET CLASSROOM PEOPLE
export function getClassroomPeople(classRoomId: string) {
  return apiFetch<ClassroomPeopleResponse>(`/classroom/${classRoomId}/people`);
}

// UPDATE CLASSROOM
export async function updateClassroom(id: string, dto: UpdateClassroomDto): Promise<Classroom> {
  return apiFetch<Classroom>(`/classroom/${id}`, {
    method: 'PATCH',
    body: dto,
  });
}

// ARCHIVE CLASSROOM
export async function archiveClassroom(id: string): Promise<void> {
  return apiFetch<void>(`/classroom/${id}/archive`, {
    method: 'POST',
  });
}

// RESTORE CLASSROOM
export async function restoreClassroom(id: string): Promise<void> {
  return apiFetch<void>(`/classroom/${id}/restore`, {
    method: 'POST',
  });
}

// JOIN CLASSROOM
export async function joinClassroom(dto: JoinClassroomDto): Promise<{
  id: string;
  classRoomId: string;
  userId: string;
  role: 'OWNER' | 'MEMBER';
  status: 'ACTIVE' | 'PENDING' | 'REMOVED';
  joinedAt: string | null;
}> {
  return apiFetch(`/classroom/join`, {
    method: 'POST',
    body: dto,
  });
}

// REMOVE MEMBER
export async function removeMember(classRoomId: string, userId: string): Promise<void> {
  return apiFetch<void>(`/classroom/${classRoomId}/members/${userId}`, {
    method: 'DELETE',
  });
}
