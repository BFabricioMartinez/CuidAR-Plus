import { useEffect, useState } from 'react';
import { usersApi } from '../../api/users';
import { patientsApi } from '../../api/patients';
import type { User } from '../../types/api';
import { toastSuccess, toastError } from '../../utils/toast';

interface DeactivatedUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserReactivated: () => void;
}

export default function DeactivatedUsersModal({ isOpen, onClose, onUserReactivated }: DeactivatedUsersModalProps) {
  const [deactivatedUsers, setDeactivatedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reactivatingUserId, setReactivatingUserId] = useState<number | null>(null);

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

  // Cargar usuarios desactivados
  const loadDeactivatedUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await usersApi.list({
        limit: 100,
        filters: { active: false },
      });
      setDeactivatedUsers(response.items);
    } catch (err: any) {
      setError(err.message || 'Error al cargar usuarios desactivados');
      toastError(err.message || 'Error al cargar usuarios desactivados');
    } finally {
      setLoading(false);
    }
  };

  // Cargar usuarios desactivados cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadDeactivatedUsers();
    }
  }, [isOpen]);

  // Reactivar usuario
  const handleReactivateUser = async (user: User) => {
    setReactivatingUserId(user.id);
    try {
      // Asegurar que solo se envíe id y active, sin otros campos como password
      await usersApi.update({ 
        id: user.id, 
        active: true 
      });
      
      // Si es un usuario PERSONAL, reactivar también su paciente asociado
      if (user.role === 'PERSONAL') {
        try {
          // Para usuarios PERSONAL: User.id === Patient.caregiver_id
          // Obtener información actualizada del usuario que incluye los pacientes
          const updatedUser = await usersApi.getById(user.id);
          
          let patientId: number | null = null;
          
          // Intentar obtener el paciente desde la información del usuario (si está disponible)
          if (updatedUser.patients && updatedUser.patients.length > 0) {
            patientId = updatedUser.patients[0].id;
          } else {
            // Si no está disponible, buscar el paciente usando el endpoint de pacientes
            // El backend filtra por active: true por defecto, así que necesitamos especificar active: false
            const patientsResponse = await patientsApi.list({
              limit: 1,
              filters: {
                caregiver_id: user.id,
                active: false, // Buscar pacientes desactivados para reactivarlos
              },
            });

            if (patientsResponse.items.length > 0) {
              patientId = patientsResponse.items[0].id;
            }
          }
          
          // Si encontramos el paciente, reactivarlo
          if (patientId) {
            await patientsApi.update({
              id: patientId,
              active: true,
            });
          }
        } catch (patientErr: any) {
          console.error('Error al reactivar paciente:', patientErr);
          // No mostrar error al usuario, solo loguear
          // El usuario ya fue reactivado, el paciente es secundario
        }
      }
      
      toastSuccess(`Usuario ${user.name || user.email} reactivado correctamente`);
      await loadDeactivatedUsers(); // Recargar la lista
      onUserReactivated(); // Notificar al modal padre para que refresque
    } catch (err: any) {
      toastError(err.message || 'Error al reactivar el usuario');
    } finally {
      setReactivatingUserId(null);
    }
  };

  // Cerrar modal con tecla ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
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
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="modal-header">
            <div className="modal-header-content">
              <div className="modal-icon-wrapper">
                <svg className="modal-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h2 className="modal-title">Usuarios Desactivados</h2>
                <p className="modal-subtitle">Gestiona las cuentas desactivadas</p>
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
            {error ? (
              <div className="error-message">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p>{error}</p>
              </div>
            ) : loading ? (
              <div className="loading-overlay">
                <div className="loading-spinner-inline">
                  <div className="spinner-dot"></div>
                  <div className="spinner-dot"></div>
                  <div className="spinner-dot"></div>
                </div>
              </div>
            ) : deactivatedUsers.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <h3 className="empty-state-title">No hay usuarios desactivados</h3>
                <p className="empty-state-text">Todos los usuarios del sistema están activos en este momento.</p>
              </div>
            ) : (
              <div className="deactivated-users-list">
                {deactivatedUsers.map((user) => (
                  <div key={user.id} className="deactivated-user-card">
                    <div className="user-card-header">
                      <div className="user-card-left">
                        <div className="user-card-avatar">{getInitials(user.name)}</div>
                        <div className="user-card-info">
                          <h3 className="user-card-name">{user.name || 'Sin nombre'}</h3>
                          <p className="user-card-email">{user.email}</p>
                        </div>
                      </div>
                      <div className="user-card-right">
                        <span className={`role-badge role-${user.role.toLowerCase()}`}>
                          {getRoleText(user.role)}
                        </span>
                        <button
                          className="reactivate-btn-top"
                          onClick={() => handleReactivateUser(user)}
                          disabled={reactivatingUserId === user.id}
                          title="Reactivar usuario"
                        >
                          {reactivatingUserId === user.id ? (
                            <svg className="spinner" viewBox="0 0 24 24">
                              <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
          z-index: 10000;
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
          max-width: 700px;
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

        .modal-header-content {
          flex: 1;
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
          padding: 2rem;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 300px;
        }

        .modal-body::-webkit-scrollbar {
          width: 10px;
        }

        .modal-body::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }

        .modal-body::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
        }

        .deactivated-users-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .deactivated-user-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }

        .deactivated-user-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .user-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          position: relative;
        }

        .user-card-left {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
          min-width: 0;
        }

        .user-card-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .user-card-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 700;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .user-card-info {
          flex: 1;
          min-width: 0;
        }

        .user-card-name {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.25rem 0;
          word-wrap: break-word;
        }

        .user-card-email {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
          word-wrap: break-word;
          overflow-wrap: break-word;
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

        .reactivate-btn-top {
          width: 36px;
          height: 36px;
          padding: 0;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }

        .reactivate-btn-top:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        .reactivate-btn-top:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .reactivate-btn-top svg {
          width: 18px;
          height: 18px;
        }

        .spinner {
          width: 18px;
          height: 18px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spinner-circle {
          opacity: 0.25;
        }

        .error-message,
        .empty-state,
        .loading-overlay {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
          width: 100%;
          min-height: 300px;
        }

        .error-message svg,
        .empty-state svg {
          width: 80px;
          height: 80px;
          margin-bottom: 1.25rem;
        }

        .error-message svg {
          color: #ef4444;
        }

        .empty-state svg {
          color: #6b7280;
          opacity: 0.8;
        }

        .error-message p,
        .empty-state p {
          font-size: 0.9375rem;
          color: #6b7280;
          margin: 0;
        }

        .empty-state-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .empty-state-text {
          font-size: 0.9375rem;
          color: #6b7280;
          margin: 0;
          line-height: 1.5;
        }

        .loading-spinner-inline {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          justify-content: center;
        }

        .spinner-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          animation: spinner-bounce 1.4s ease-in-out infinite both;
        }

        .spinner-dot:nth-child(1) {
          animation-delay: -0.32s;
        }

        .spinner-dot:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes spinner-bounce {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @media (max-width: 640px) {
          .modal-backdrop {
            padding: 1rem;
            align-items: center;
          }

          .modal-container {
            max-width: 100%;
            border-radius: 24px;
            max-height: 95vh;
          }

          .modal-header {
            padding: 1.5rem;
          }

          .modal-body {
            padding: 1.5rem;
            min-height: 250px;
          }

          .empty-state {
            padding: 3rem 1.5rem;
            min-height: 250px;
          }

          .user-card-header {
            flex-direction: column;
            gap: 1rem;
          }

          .user-card-left {
            width: 100%;
          }

          .user-card-right {
            width: 100%;
            justify-content: space-between;
          }

          .user-card-avatar {
            width: 44px;
            height: 44px;
            font-size: 0.8125rem;
          }

          .reactivate-btn-top {
            width: 40px;
            height: 40px;
          }

          .empty-state svg {
            width: 100px;
            height: 100px;
            margin-bottom: 1.25rem;
          }

          .empty-state-title {
            font-size: 1.25rem;
          }

          .empty-state-text {
            font-size: 1rem;
          }
        }
      `}</style>
    </>
  );
}


