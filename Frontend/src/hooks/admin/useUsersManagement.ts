import { useState, useCallback, useEffect } from 'react';
import { usersApi, ApiError } from '../../api';
import type { User, UserFilters, CreateUserRequest, UpdateUserRequest } from '../../api';

// ============================================
// HOOK useUsersManagement
// ============================================

export const useUsersManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Filtros
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Obtener usuarios con filtros
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const filters: UserFilters = {};

      if (filterRole !== 'all') {
        filters.role = filterRole as 'ADMIN' | 'ASISTENCIAL' | 'PERSONAL';
      }

      if (filterActive !== 'all') {
        filters.active = filterActive === 'true';
      }

      if (searchTerm) {
        filters.search = searchTerm;
      }

      const response = await usersApi.list({
        limit: 100, // Límite alto para obtener todos
        filters,
      });

      setUsers(response.items);
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.message : 'Error al cargar usuarios';
      setError(errorMsg);
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, [filterRole, filterActive, searchTerm]);

  // Crear usuario
  const createUser = useCallback(async (data: CreateUserRequest) => {
    setLoading(true);
    setError('');

    try {
      await usersApi.create(data);
      setSuccessMessage('Usuario creado exitosamente ✓');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchUsers();
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.message : 'Error al crear usuario';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  // Editar usuario
  const updateUser = useCallback(async (data: UpdateUserRequest) => {
    setLoading(true);
    setError('');

    try {
      await usersApi.update(data);
      setSuccessMessage('Usuario actualizado exitosamente ✓');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchUsers();
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.message : 'Error al actualizar usuario';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  // Activar/Desactivar usuario
  const toggleActive = useCallback(async (user: User) => {
    setLoading(true);
    setError('');

    try {
      await usersApi.update({
        id: user.id,
        active: !user.active,
      });
      setSuccessMessage(
        `Usuario ${user.active ? 'desactivado' : 'activado'} exitosamente`
      );
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchUsers();
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.message : 'Error al cambiar estado del usuario';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  // Eliminar usuario (soft delete)
  const deleteUser = useCallback(async (userId: number) => {
    setLoading(true);
    setError('');

    try {
      await usersApi.deactivate(userId);
      setSuccessMessage('Usuario eliminado exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchUsers();
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.message : 'Error al eliminar usuario';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  // Effect: Cargar usuarios cuando cambian los filtros
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filtrar usuarios por búsqueda (búsqueda en el frontend)
  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return {
    // Estados
    users: filteredUsers,
    loading,
    error,
    successMessage,

    // Filtros
    filterRole,
    filterActive,
    searchTerm,
    setFilterRole,
    setFilterActive,
    setSearchTerm,

    // Funciones
    fetchUsers,
    createUser,
    updateUser,
    toggleActive,
    deleteUser,
  };
};




