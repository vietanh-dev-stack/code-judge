import { normalizePagedList, type ApiPagedListRaw } from '@/lib/paged-list';
import { Role } from '@/types/enums';
import { apiFetch } from './api-client';
import type { UserProfile } from './auth.apis';

export interface AvatarUploadResponse {
  objectKey: string;
  uploadUrl: string;
  bucket: string;
}

export interface UpdateMePayload {
  name?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password?: string;
  role?: Role;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
}

export interface UpdateUserRolePayload {
  role: Role;
}

export interface ToggleUserStatusPayload {
  isActive: boolean;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchUserItem {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

// Users API

export const usersApi = {
  // Me
  async updateMe(
    payload: UpdateMePayload,
  ): Promise<UserProfile> {
    return apiFetch<UserProfile>(
      '/users/me',
      {
        method: 'PATCH',
        body: payload,
      },
    );
  },

  async getAvatarUploadUrl(
    extension: string,
  ): Promise<AvatarUploadResponse> {
    return apiFetch<AvatarUploadResponse>(
      '/users/me/avatar/upload-url',
      {
        method: 'POST',
        body: { extension },
      },
    );
  },

  async confirmAvatar(
    objectKey: string,
  ): Promise<UserProfile> {
    return apiFetch<UserProfile>(
      '/users/me/avatar/confirm',
      {
        method: 'POST',
        body: { objectKey },
      },
    );
  },

  // Admin - Users Management

  async createUser(
    payload: CreateUserPayload,
  ): Promise<UserProfile> {
    return apiFetch<UserProfile>(
      '/users',
      {
        method: 'POST',
        body: payload,
      },
    );
  },

  async getUsers(
    params?: ListUsersParams,
  ): Promise<PaginatedResponse<UserProfile>> {
    const searchParams =
      new URLSearchParams();

    if (params?.page) {
      searchParams.set(
        'page',
        String(params.page),
      );
    }

    if (params?.limit) {
      searchParams.set(
        'limit',
        String(params.limit),
      );
    }

    if (params?.search) {
      searchParams.set(
        'search',
        params.search,
      );
    }

    const query = searchParams.toString();

    const raw = await apiFetch<ApiPagedListRaw<UserProfile>>(
      `/users${query ? `?${query}` : ''}`,
    );
    return normalizePagedList(raw);
  },

  async searchUsers(
    q: string,
  ): Promise<SearchUserItem[]> {
    const query =
      encodeURIComponent(q);

    return apiFetch<SearchUserItem[]>(
      `/users/search?q=${query}`,
    );
  },

  async getUserById(
    userId: string,
  ): Promise<UserProfile> {
    return apiFetch<UserProfile>(
      `/users/${userId}`,
    );
  },

  async updateUser(
    userId: string,
    payload: UpdateUserPayload,
  ): Promise<UserProfile> {
    return apiFetch<UserProfile>(
      `/users/${userId}`,
      {
        method: 'PATCH',
        body: payload,
      },
    );
  },

  async updateUserRole(
    userId: string,
    payload: UpdateUserRolePayload,
  ): Promise<UserProfile> {
    return apiFetch<UserProfile>(
      `/users/${userId}/role`,
      {
        method: 'PATCH',
        body: payload,
      },
    );
  },

  async toggleUserStatus(
    userId: string,
    payload: ToggleUserStatusPayload,
  ): Promise<UserProfile> {
    return apiFetch<UserProfile>(
      `/users/${userId}/status`,
      {
        method: 'PATCH',
        body: payload,
      },
    );
  },

  async deleteUser(
    userId: string,
  ): Promise<{ success: boolean }> {
    return apiFetch<{
      success: boolean;
    }>(`/users/${userId}`, {
      method: 'DELETE',
    });
  },
};