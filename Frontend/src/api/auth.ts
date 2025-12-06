import { apiClient } from './client';
import type { LoginRequest, SignupRequest, AuthResponse, User } from '../types/api';

export const authApi = {
  /**
   * POST /auth/login
   * Autentica usuario y retorna token JWT
   */
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>('/auth/login', credentials, false);
  },

  /**
   * POST /auth/signup
   * Registra un nuevo usuario
   */
  signup: async (data: SignupRequest): Promise<User> => {
    return apiClient.post<User>('/auth/signup', data, false);
  },

  /**
   * GET /auth/me
   * Obtiene información del usuario autenticado
   */
  me: async (): Promise<User> => {
    return apiClient.get<User>('/auth/me');
  },

  /**
   * Guarda el token y datos del usuario en localStorage
   */
  saveAuth: (authResponse: AuthResponse): void => {
    localStorage.setItem('token', authResponse.access_token);
    localStorage.setItem('user', JSON.stringify(authResponse.user));
  },

  /**
   * Limpia autenticación del localStorage
   */
  clearAuth: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Obtiene el usuario guardado en localStorage
   */
  getStoredUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Verifica si hay un token guardado
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },
};
