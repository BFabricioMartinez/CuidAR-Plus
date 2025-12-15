import { apiClient } from './client';
import type {
  User,
  PaginatedRequest,
  PaginatedResponse,
  MessageResponse,
} from '../types/api';

// Tipos específicos para usuarios
export interface UserFilters {
  search?: string;
  name?: string;
  email?: string;
  role?: 'ADMIN' | 'ASISTENCIAL' | 'PERSONAL';
  active?: boolean;
  order?: 'asc' | 'desc';
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'ASISTENCIAL' | 'PERSONAL';
}

export interface UpdateUserRequest {
  id: number;
  name?: string;
  email?: string;
  password?: string;
  role?: 'ADMIN' | 'ASISTENCIAL' | 'PERSONAL';
  active?: boolean;
}

export const usersApi = {
  /**
   * POST /user/paginated
   * Lista paginada de usuarios con filtros
   */
  list: async (
    request: PaginatedRequest<UserFilters> = {}
  ): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.post<{ users: User[]; next_cursor: number | null }>(
      '/user/paginated',
      request
    );
    return {
      items: response.users,
      next_cursor: response.next_cursor,
    };
  },

  /**
   * GET /user/{user_id}
   * Obtiene un usuario por ID
   */
  getById: async (userId: number): Promise<User> => {
    return apiClient.get<User>(`/user/${userId}`);
  },

  /**
   * GET /user/role/{role}
   * Obtiene todos los usuarios de un rol específico
   */
  getByRole: async (role: string): Promise<User[]> => {
    const response = await apiClient.get<{ users: User[]; count: number; role: string }>(
      `/user/role/${role}`
    );
    return response.users;
  },

  /**
   * POST /user/create
   * Crea un nuevo usuario
   */
  create: async (data: CreateUserRequest): Promise<{ message: string; user: User }> => {
    return apiClient.post<{ message: string; user: User }>('/user/create', data);
  },

  /**
   * PUT /user/update
   * Actualiza un usuario existente
   */
  update: async (data: UpdateUserRequest): Promise<MessageResponse> => {
    return apiClient.put<MessageResponse>('/user/update', data);
  },

  /**
   * PUT /user/{user_id}/deactivate
   * Desactiva un usuario (soft delete)
   */
  deactivate: async (userId: number): Promise<MessageResponse> => {
    return apiClient.put<MessageResponse>(`/user/${userId}/deactivate`);
  },
};




