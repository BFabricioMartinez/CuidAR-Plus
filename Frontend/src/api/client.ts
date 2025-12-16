// Cliente HTTP centralizado con manejo de autenticación y errores

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  message: string;
  data?: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.message = message;
    this.data = data;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('token');
  }

  private getHeaders(customHeaders?: Record<string, string>, requiresAuth = true): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (requiresAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      body,
      headers: customHeaders,
      requiresAuth = true,
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getHeaders(customHeaders, requiresAuth);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      // Si la respuesta no es OK, lanzar error
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorData;

        try {
          errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // Si no se puede parsear el JSON, usar el mensaje por defecto
        }

        throw new ApiError(response.status, errorMessage, errorData);
      }

      // Parsear respuesta JSON
      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Error de red u otro error
      throw new ApiError(0, error instanceof Error ? error.message : 'Error de red');
    }
  }

  // Métodos de conveniencia
  get<T>(endpoint: string, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', requiresAuth });
  }

  post<T>(endpoint: string, body?: any, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, requiresAuth });
  }

  put<T>(endpoint: string, body?: any, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, requiresAuth });
  }

  delete<T>(endpoint: string, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', requiresAuth });
  }

  patch<T>(endpoint: string, body?: any, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body, requiresAuth });
  }
}

// Instancia única del cliente
export const apiClient = new ApiClient(API_BASE_URL);
