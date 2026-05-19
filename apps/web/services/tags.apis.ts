import { apiFetch } from './api-client';

export interface Tag {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface CreateTagDto {
  name: string;
  slug?: string;
}

export interface UpdateTagDto {
  name?: string;
  slug?: string;
}

export const tagsApi = {
  async findAll(options?: RequestInit): Promise<Tag[]> {
    return apiFetch('/tags', options);
  },

  async create(dto: CreateTagDto, options?: RequestInit): Promise<Tag> {
    return apiFetch('/tags', {
      ...options,
      method: 'POST',
      body: dto,
    });
  },

  async update(id: string, dto: UpdateTagDto, options?: RequestInit): Promise<Tag> {
    return apiFetch(`/tags/${id}`, {
      ...options,
      method: 'PATCH',
      body: dto,
    });
  },

  async delete(id: string, options?: RequestInit): Promise<void> {
    return apiFetch(`/tags/${id}`, {
      ...options,
      method: 'DELETE',
    });
  },
};
