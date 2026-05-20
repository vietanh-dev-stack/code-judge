import { apiFetch } from './api-client';

export interface CreateClassInviteDto {
  email: string;
}

export interface InviteResponse {
  message: string;
  inviteId: string;
}

export interface AcceptInviteResponse {
  classRoomId: string;
  className: string;
}

export interface UserSuggestion {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

export async function inviteToClassroom(
  classRoomId: string,
  dto: CreateClassInviteDto,
): Promise<InviteResponse> {
  return apiFetch<InviteResponse>(`/invites/classroom/${classRoomId}`, {
    method: 'POST',
    body: dto,
  });
}

export async function acceptInvite(token: string) {
  return apiFetch<AcceptInviteResponse>(`/invites/accept?token=${token}`, {
    method: 'POST',
  });
}

export async function searchUsers(query: string): Promise<UserSuggestion[]> {
  if (!query.trim()) return [];

  const res = await apiFetch<UserSuggestion[]>(`/users/search?q=${encodeURIComponent(query)}`);

  return res ?? [];
}