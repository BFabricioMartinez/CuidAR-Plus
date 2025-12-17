import { useEffect, useRef, useState } from 'react';
import { useUsers } from '../../hooks/useUsers';
import { usersApi } from '../../api/users';
import type { User } from '../../types/api';
import EditUserModal from './EditUserModal';
import ChangePasswordModal from './ChangePasswordModal';
import ConfirmDialog from './ConfirmDialog';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { users, loading, error, hasMore, loadMore, refresh, search } = useUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Estado para modales de edición
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [changingPasswordUser, setChangingPasswordUser] = useState<User | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // Función auxiliar para obtener las iniciales del nombre
  const getInitials = (name: string | null): string => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Función auxiliar para obtener el texto del rol
  const getRoleText = (role: string): string => {
    switch (role) {
      case 'ADMIN':
        return 'Administrador';
      case 'ASISTENCIAL':
        return 'Asistencial';
      case 'PERSONAL':
        return 'Personal';
      default:
        return role;
    }
  };

  // Handler para guardar cambios de usuario
  const handleSaveUser = async (userId: number, data: { name?: string; email?: string; role?: 'ADMIN' | 'ASISTENCIAL' | 'PERSONAL' }) => {
    await usersApi.update({ id: userId, ...data });
    await refresh(); // Recargar la lista de usuarios
  };

  // Handler para cambiar contraseña
  const handleChangePassword = async (userId: number, password: string) => {
    await usersApi.update({ id: userId, password });
  };

  // Handler para desactivar/eliminar usuario
  const handleDeactivateUser = async () => {
    if (!deactivatingUser) return;

    setDeactivateLoading(true);
    try {
      await usersApi.deactivate(deactivatingUser.id);
      await refresh(); // Recargar la lista de usuarios
      setDeactivatingUser(null);
    } catch (err: any) {
      console.error('Error deactivating user:', err);
      // Aquí podrías mostrar un mensaje de error al usuario
    } finally {
      setDeactivateLoading(false);
    }
  };

  // Cargar usuarios cuando el modal se abre por primera vez
  useEffect(() => {
    if (isOpen && !hasInitialLoad && users.length === 0 && !loading && !error) {
      setHasInitialLoad(true);
      refresh();
    }

    // Resetear cuando se cierra el modal
    if (!isOpen) {
      setHasInitialLoad(false);
    }
  }, [isOpen, hasInitialLoad, users.length, loading, error, refresh]);

  // Configurar Intersection Observer para infinite scroll
  useEffect(() => {
    if (!isOpen || loading || !hasMore || error) return;

    const options = {
      root: tableWrapperRef.current,
      rootMargin: '100px',
      threshold: 0.1,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      const firstEntry = entries[0];
      if (firstEntry.isIntersecting && hasMore && !loading && !error) {
        loadMore();
      }
    }, options);

    const currentTrigger = loadMoreTriggerRef.current;
    if (currentTrigger && observerRef.current) {
      observerRef.current.observe(currentTrigger);
    }

    return () => {
      if (observerRef.current && currentTrigger) {
        observerRef.current.unobserve(currentTrigger);
      }
    };
  }, [isOpen, hasMore, loading, loadMore, error]);

  // Manejar búsqueda con debounce
  useEffect(() => {
    if (!isOpen || error || !hasInitialLoad) return;

    const timer = setTimeout(() => {
      if (searchQuery.trim() !== '') {
        search(searchQuery);
        refresh();
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, isOpen, hasInitialLoad]);

  // Cerrar modal con tecla ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevenir scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose}>
        {/* Modal Container */}
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="modal-header">
            <div className="modal-header-content">
              <div className="modal-icon-wrapper">
                <svg className="modal-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h2 className="modal-title">Ajustes</h2>
                <p className="modal-subtitle">Configuración del sistema</p>
              </div>
            </div>
            <button onClick={onClose} className="modal-close-btn">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="modal-body">
            {/* Search Bar */}
            <div className="search-section">
              <div className="search-wrapper">
                <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="users-count">
                <span className="count-badge">
                  {users.length} usuario{users.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Users Table */}
            <div className="users-table-wrapper" ref={tableWrapperRef}>
              {error && (
                <div className="error-message">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p>{error}</p>
                </div>
              )}

              {!error && users.length === 0 && !loading && (
                <div className="empty-state">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <p>No se encontraron usuarios</p>
                </div>
              )}

              {users.length > 0 && (
                <table className="users-table">
                  <thead>
                    <tr className="table-header-row">
                      <th className="table-header">Nombre</th>
                      <th className="table-header">Email</th>
                      <th className="table-header">Rol</th>
                      <th className="table-header table-header-actions">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="table-row">
                        <td className="table-cell cell-name">
                          <div className="user-info-cell">
                            <div className="user-avatar-small">{getInitials(user.name)}</div>
                            <span>{user.name || 'Sin nombre'}</span>
                          </div>
                        </td>
                        <td className="table-cell cell-email">{user.email}</td>
                        <td className="table-cell cell-role">
                          <span className={`role-badge role-${user.role.toLowerCase()}`}>
                            {getRoleText(user.role)}
                          </span>
                        </td>
                        <td className="table-cell cell-actions">
                          <div className="actions-group">
                            <button
                              className="action-btn action-edit"
                              title="Editar usuario"
                              onClick={() => setEditingUser(user)}
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            <button
                              className="action-btn action-password"
                              title="Cambiar contraseña"
                              onClick={() => setChangingPasswordUser(user)}
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <button className="action-btn action-delete" title="Eliminar usuario">
                              <svg viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Trigger para infinite scroll */}
              {hasMore && (
                <div ref={loadMoreTriggerRef} className="load-more-trigger">
                  {loading && (
                    <div className="loading-spinner">
                      <svg className="spinner" viewBox="0 0 50 50">
                        <circle className="spinner-circle" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                      </svg>
                      <span>Cargando más usuarios...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-container {
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-header {
          padding: 1.5rem 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          position: relative;
          overflow: hidden;
        }

        .modal-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="30" r="1.5" fill="rgba(255,255,255,0.1)"/></svg>');
          opacity: 0.5;
        }

        .modal-header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          z-index: 1;
        }

        .modal-icon-wrapper {
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.3);
          flex-shrink: 0;
        }

        .modal-icon {
          width: 20px;
          height: 20px;
          color: #ffffff;
        }

        .modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .modal-subtitle {
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.9);
          margin: 0.25rem 0 0 0;
        }

        .modal-close-btn {
          width: 36px;
          height: 36px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }

        .modal-close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }

        .modal-close-btn svg {
          width: 20px;
          height: 20px;
          color: #ffffff;
        }

        .modal-body {
          padding: 0;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .modal-body::-webkit-scrollbar {
          width: 8px;
        }

        .modal-body::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }

        .modal-body::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
        }

        /* Search Section */
        .search-section {
          padding: 1.5rem 2rem;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .search-wrapper {
          flex: 1;
          min-width: 250px;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: #9ca3af;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 0.9375rem;
          color: #1f2937;
          font-family: inherit;
          transition: all 0.3s ease;
          background: #ffffff;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .search-input::placeholder {
          color: #9ca3af;
        }

        .users-count {
          flex-shrink: 0;
        }

        .count-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          border: 1px solid rgba(102, 126, 234, 0.2);
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #667eea;
        }

        /* Users Table */
        .users-table-wrapper {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 0;
        }

        .users-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        .table-header-row {
          background: #f9fafb;
        }

        .table-header {
          padding: 1rem 2rem;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #e5e7eb;
          background: #f9fafb;
          position: sticky;
          top: 0;
          z-index: 10;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .table-header:first-child {
          padding-left: 2rem;
        }

        .table-header:last-child {
          padding-right: 2rem;
        }

        .table-header-actions {
          text-align: center;
        }

        .table-row {
          border-bottom: 1px solid #f3f4f6;
          transition: all 0.2s ease;
        }

        .table-row:hover {
          background: rgba(102, 126, 234, 0.05);
        }

        .table-cell {
          padding: 1.25rem 2rem;
          font-size: 0.9375rem;
          color: #1f2937;
        }

        .table-cell:first-child {
          padding-left: 2rem;
        }

        .table-cell:last-child {
          padding-right: 2rem;
        }

        .cell-name {
          font-weight: 600;
        }

        .user-info-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-avatar-small {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
        }

        .cell-email {
          color: #6b7280;
        }

        .cell-role {

        }

        .role-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.375rem 0.875rem;
          border-radius: 6px;
          font-size: 0.8125rem;
          font-weight: 600;
          border: 1px solid;
        }

        .role-admin {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%);
          color: #dc2626;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .role-asistencial {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          color: #667eea;
          border-color: rgba(102, 126, 234, 0.3);
        }

        .role-personal {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%);
          color: #16a34a;
          border-color: rgba(34, 197, 94, 0.3);
        }

        .cell-actions {
          text-align: center;
        }

        .actions-group {
          display: inline-flex;
          gap: 0.5rem;
          align-items: center;
          justify-content: center;
        }

        .action-btn {
          width: 32px;
          height: 32px;
          padding: 0;
          border: 1.5px solid;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: transparent;
        }

        .action-btn svg {
          width: 16px;
          height: 16px;
        }

        .action-edit {
          border-color: #e5e7eb;
          color: #6b7280;
        }

        .action-edit:hover {
          background: rgba(102, 126, 234, 0.1);
          border-color: #667eea;
          color: #667eea;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }

        .action-password {
          border-color: #e5e7eb;
          color: #6b7280;
        }

        .action-password:hover {
          background: rgba(245, 158, 11, 0.1);
          border-color: #f59e0b;
          color: #f59e0b;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
        }

        .action-delete {
          border-color: #e5e7eb;
          color: #6b7280;
        }

        .action-delete:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
          color: #ef4444;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }

        /* Loading & Empty States */
        .error-message,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          text-align: center;
        }

        .error-message svg,
        .empty-state svg {
          width: 64px;
          height: 64px;
          margin-bottom: 1rem;
        }

        .error-message svg {
          color: #ef4444;
        }

        .empty-state svg {
          color: #9ca3af;
        }

        .error-message p,
        .empty-state p {
          font-size: 0.9375rem;
          color: #6b7280;
          margin: 0;
        }

        /* Infinite Scroll Trigger */
        .load-more-trigger {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .spinner {
          width: 40px;
          height: 40px;
          animation: rotate 2s linear infinite;
        }

        .spinner-circle {
          stroke: #667eea;
          stroke-linecap: round;
          animation: dash 1.5s ease-in-out infinite;
        }

        @keyframes rotate {
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes dash {
          0% {
            stroke-dasharray: 1, 150;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -35;
          }
          100% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -124;
          }
        }

        .loading-spinner span {
          font-size: 0.875rem;
          color: #667eea;
          font-weight: 500;
        }

        @media (max-width: 640px) {
          .modal-backdrop {
            padding: 0;
            align-items: flex-end;
          }

          .modal-container {
            max-width: 100%;
            border-radius: 24px 24px 0 0;
            max-height: 95vh;
          }

          .modal-header {
            padding: 1.5rem;
          }

          .modal-title {
            font-size: 1.25rem;
          }

          .modal-body {
            padding: 0;
          }

          .search-section {
            padding: 1rem 1.5rem;
            flex-direction: column;
            align-items: stretch;
          }

          .search-wrapper {
            min-width: 100%;
          }

          .users-table-wrapper {
            padding: 0;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .users-table {
            min-width: 700px;
          }

          .table-header {
            padding: 1rem 1rem;
          }

          .table-header:first-child {
            padding-left: 1rem;
          }

          .table-header:last-child {
            padding-right: 1rem;
          }

          .table-cell {
            padding: 1rem 1rem;
          }

          .table-cell:first-child {
            padding-left: 1rem;
          }

          .table-cell:last-child {
            padding-right: 1rem;
          }

          .user-avatar-small {
            width: 32px;
            height: 32px;
            font-size: 0.7rem;
          }

          .action-btn {
            width: 28px;
            height: 28px;
          }

          .action-btn svg {
            width: 14px;
            height: 14px;
          }
        }
      `}</style>

      {/* Modal de Edición */}
      <EditUserModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        onSave={handleSaveUser}
      />

      {/* Modal de Cambio de Contraseña */}
      <ChangePasswordModal
        isOpen={!!changingPasswordUser}
        onClose={() => setChangingPasswordUser(null)}
        user={changingPasswordUser}
        onSave={handleChangePassword}
      />
    </>
  );
}
