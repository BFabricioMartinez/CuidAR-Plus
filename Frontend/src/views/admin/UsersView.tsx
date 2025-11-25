import { useState, useEffect } from 'react';

// ============================================
// TIPOS
// ============================================
type UserRole = 'ADMIN' | 'ASISTENCIAL' | 'PERSONAL';

interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at?: string;
}

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

// ============================================
// COMPONENTE
// ============================================
export default function UsersView() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Filtros
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<UserForm>({
    name: '',
    email: '',
    password: '',
    role: 'PERSONAL',
  });

  const token = localStorage.getItem('token');

  // Cargar usuarios al montar
  useEffect(() => {
    fetchUsers();
  }, [filterRole, filterActive]);

  // Obtener usuarios con filtros
  const fetchUsers = async () => {
    setLoading(true);
    setError('');

    try {
      let url = 'http://localhost:8000/users/all?';

      if (filterRole !== 'all') {
        url += `role=${filterRole}&`;
      }

      if (filterActive !== 'all') {
        url += `active=${filterActive === 'true'}&`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Error al cargar usuarios');

      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambios en formulario
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Crear usuario
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/users/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al crear usuario');
      }

      setSuccessMessage('Usuario creado exitosamente ✓');
      setTimeout(() => setSuccessMessage(''), 3000);

      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'PERSONAL',
      });
      setShowForm(false);

      fetchUsers();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Editar usuario
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setLoading(true);
    setError('');

    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      };

      // Solo incluir password si se escribió algo
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(
        `http://localhost:8000/users/${editingUser.id}/update`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al actualizar usuario');
      }

      setSuccessMessage('Usuario actualizado exitosamente ✓');
      setTimeout(() => setSuccessMessage(''), 3000);

      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'PERSONAL',
      });
      setEditingUser(null);
      setShowForm(false);

      fetchUsers();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Activar/Desactivar usuario
  const handleToggleActive = async (user: User) => {
    if (
      !confirm(
        `¿Estás seguro de ${user.active ? 'desactivar' : 'activar'} a ${user.name}?`
      )
    )
      return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `http://localhost:8000/users/${user.id}/update`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            active: !user.active,
          }),
        }
      );

      if (!response.ok) throw new Error('Error al cambiar estado del usuario');

      setSuccessMessage(
        `Usuario ${user.active ? 'desactivado' : 'activado'} exitosamente`
      );
      setTimeout(() => setSuccessMessage(''), 3000);

      fetchUsers();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar usuario (soft delete)
  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`http://localhost:8000/users/${id}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Error al eliminar usuario');

      setSuccessMessage('Usuario eliminado exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);

      fetchUsers();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Abrir formulario para editar
  const openEditForm = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Dejar vacío para no cambiar
      role: user.role,
    });
    setShowForm(true);
  };

  // Cancelar formulario
  const cancelForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'PERSONAL',
    });
  };

  // Filtrar usuarios por búsqueda
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Obtener badge de rol
  const getRoleBadge = (role: UserRole) => {
    const styles: Record<UserRole, React.CSSProperties> = {
      ADMIN: { backgroundColor: '#dbeafe', color: '#1e40af' },
      ASISTENCIAL: { backgroundColor: '#dcfce7', color: '#166534' },
      PERSONAL: { backgroundColor: '#fef3c7', color: '#92400e' },
    };

    const labels: Record<UserRole, string> = {
      ADMIN: '👑 Admin',
      ASISTENCIAL: '👨‍⚕️ Asistencial',
      PERSONAL: '👤 Personal',
    };

    return (
      <span style={{ ...badgeStyle, ...styles[role] }}>{labels[role]}</span>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestión de Usuarios</h1>
          <p style={styles.subtitle}>Administra todos los usuarios del sistema</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} style={styles.btnAdd}>
            + Crear Usuario
          </button>
        )}
      </div>

      {/* Mensajes */}
      {error && <div style={styles.errorAlert}>⚠️ {error}</div>}
      {successMessage && <div style={styles.successAlert}>✓ {successMessage}</div>}

      {/* Formulario */}
      {showForm && (
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>
            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>

          <form onSubmit={editingUser ? handleEdit : handleCreate} style={styles.form}>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nombre completo *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Contraseña {editingUser ? '(dejar vacío para no cambiar)' : '*'}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="••••••••"
                  required={!editingUser}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Rol *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  style={styles.select}
                  required
                >
                  <option value="PERSONAL">Personal</option>
                  <option value="ASISTENCIAL">Asistencial</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </div>

            <div style={styles.formActions}>
              <button type="button" onClick={cancelForm} style={styles.btnCancel}>
                Cancelar
              </button>
              <button type="submit" style={styles.btnSubmit} disabled={loading}>
                {loading ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Buscar</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.filterInput}
              placeholder="Nombre o email..."
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Rol</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">Todos</option>
              <option value="ADMIN">Admin</option>
              <option value="ASISTENCIAL">Asistencial</option>
              <option value="PERSONAL">Personal</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Estado</label>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de usuarios */}
      {loading && users.length === 0 ? (
        <div style={styles.loading}>Cargando usuarios...</div>
      ) : filteredUsers.length === 0 ? (
        <div style={styles.emptyState}>
          <p>📋 No se encontraron usuarios</p>
          <p style={styles.emptyHint}>
            {searchTerm || filterRole !== 'all' || filterActive !== 'all'
              ? 'Probá cambiando los filtros'
              : 'Hacé clic en "Crear Usuario" para comenzar'}
          </p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Rol</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} style={styles.tableRow}>
                  <td style={styles.td}>
                    <div style={styles.userName}>{user.name}</div>
                  </td>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.td}>{getRoleBadge(user.role)}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...badgeStyle,
                        backgroundColor: user.active ? '#d1fae5' : '#fee2e2',
                        color: user.active ? '#065f46' : '#991b1b',
                      }}
                    >
                      {user.active ? '✓ Activo' : '✗ Inactivo'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button
                        onClick={() => openEditForm(user)}
                        style={styles.btnEdit}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        style={styles.btnToggle}
                        title={user.active ? 'Desactivar' : 'Activar'}
                      >
                        {user.active ? '🔒' : '🔓'}
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        style={styles.btnDelete}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================
// ESTILOS
// ============================================
const badgeStyle: React.CSSProperties = {
  padding: '4px 12px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: 600,
  display: 'inline-block',
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0,
  },
  btnAdd: {
    backgroundColor: '#667eea',
    color: '#fff',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #fecaca',
  },
  successAlert: {
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #bbf7d0',
  },
  formCard: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    marginBottom: '30px',
  },
  formTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '12px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  select: {
    padding: '12px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    cursor: 'pointer',
    backgroundColor: '#fff',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '10px',
  },
  btnCancel: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 600,
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnSubmit: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#667eea',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filtersCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  filterInput: {
    padding: '10px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
  },
  filterSelect: {
    padding: '10px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    cursor: 'pointer',
  },
  emptyState: {
    backgroundColor: '#f9fafb',
    padding: '60px 40px',
    borderRadius: '12px',
    textAlign: 'center',
    color: '#6b7280',
  },
  emptyHint: {
    fontSize: '14px',
    marginTop: '8px',
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    borderBottom: '2px solid #e5e7eb',
  },
  tableRow: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#1f2937',
  },
  userName: {
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  btnEdit: {
    padding: '6px 12px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#f3f4f6',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnToggle: {
    padding: '6px 12px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#f3f4f6',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnDelete: {
    padding: '6px 12px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#f3f4f6',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};