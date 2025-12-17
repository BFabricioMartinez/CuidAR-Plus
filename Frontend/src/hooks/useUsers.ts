import { useState, useCallback, useRef } from 'react';
import { usersApi } from '../api/users';
import type { UserFilters } from '../api/users';
import type { User } from '../types/api';

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  search: (query: string) => void;
  filterByRole: (role: 'ADMIN' | 'ASISTENCIAL' | 'PERSONAL' | null) => void;
}

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  // Filtros actuales (usar ref para no recrear callbacks)
  const filtersRef = useRef<UserFilters>({});

  // Ref para prevenir múltiples llamadas simultáneas
  const loadingRef = useRef(false);

  // Función para cargar usuarios (inicial o más)
  const loadUsers = useCallback(async (reset: boolean = false) => {
    // Prevenir llamadas simultáneas
    if (loadingRef.current) return;

    // Si no hay más datos y no es un reset, no hacer nada
    if (!reset && !hasMore) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await usersApi.list({
        limit: 20, // Cargar 20 usuarios por vez
        last_seen_id: reset ? null : nextCursor,
        filters: filtersRef.current,
      });

      setUsers(prev => reset ? response.items : [...prev, ...response.items]);
      setNextCursor(response.next_cursor);
      setHasMore(response.next_cursor !== null);
    } catch (err: any) {
      console.error('Error loading users:', err);

      // Mensaje de error específico según el tipo
      if (err.status === 401) {
        setError('No tienes permisos para ver esta información. Por favor, inicia sesión nuevamente.');
      } else if (err.status === 403) {
        setError('No tienes permisos suficientes para acceder a esta funcionalidad.');
      } else {
        setError('Error al cargar usuarios. Por favor, intenta nuevamente.');
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [nextCursor, hasMore]);

  // Cargar más usuarios (infinite scroll)
  const loadMore = useCallback(async () => {
    await loadUsers(false);
  }, [loadUsers]);

  // Refrescar desde el inicio
  const refresh = useCallback(async () => {
    setNextCursor(null);
    setHasMore(true);
    await loadUsers(true);
  }, [loadUsers]);

  // Búsqueda
  const search = useCallback((query: string) => {
    filtersRef.current = { ...filtersRef.current, search: query || undefined };
    setNextCursor(null);
    setHasMore(true);
    setUsers([]); // Limpiar usuarios al buscar
  }, []);

  // Filtrar por rol
  const filterByRole = useCallback((role: 'ADMIN' | 'ASISTENCIAL' | 'PERSONAL' | null) => {
    filtersRef.current = { ...filtersRef.current, role: role || undefined };
    setNextCursor(null);
    setHasMore(true);
    setUsers([]); // Limpiar usuarios al filtrar
  }, []);

  return {
    users,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    search,
    filterByRole,
  };
}
