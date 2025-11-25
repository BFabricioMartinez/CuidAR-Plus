import { useNavigate, useLocation } from 'react-router-dom';

// ============================================
// TIPOS
// ============================================
type UserRole = 'ADMIN' | 'ASISTENCIAL' | 'PERSONAL';

interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles: UserRole[];
}

// ============================================
// COMPONENTE
// ============================================
export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Obtener usuario del localStorage
  const userStr = localStorage.getItem('user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  // Cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // Definir items de navegación según rol
  const navItems: NavItem[] = [
    // ADMIN
    {
      label: 'Dashboard',
      path: '/admin/dashboard',
      icon: '📊',
      roles: ['ADMIN'],
    },
    {
      label: 'Usuarios',
      path: '/admin/users',
      icon: '👥',
      roles: ['ADMIN'],
    },
    {
      label: 'Pacientes',
      path: '/admin/pacientes',
      icon: '🏥',
      roles: ['ADMIN'],
    },
    {
      label: 'Asignaciones',
      path: '/admin/asignaciones',
      icon: '🔗',
      roles: ['ADMIN'],
    },

    // ASISTENCIAL
    {
      label: 'Dashboard',
      path: '/asistencial/dashboard',
      icon: '📊',
      roles: ['ASISTENCIAL'],
    },
    {
      label: 'Tratamientos',
      path: '/asistencial/tratamientos',
      icon: '💊',
      roles: ['ASISTENCIAL'],
    },
    {
      label: 'Historial',
      path: '/asistencial/historial',
      icon: '📝',
      roles: ['ASISTENCIAL'],
    },

    // PERSONAL
    {
      label: 'Mi Dashboard',
      path: '/personal/dashboard',
      icon: '🏠',
      roles: ['PERSONAL'],
    },
    {
      label: 'Mis Tratamientos',
      path: '/personal/tratamientos',
      icon: '💊',
      roles: ['PERSONAL'],
    },
    {
      label: 'Mi Historial',
      path: '/personal/historial',
      icon: '📝',
      roles: ['PERSONAL'],
    },
  ];

  // Filtrar items según el rol del usuario
  const visibleItems = user
    ? navItems.filter((item) => item.roles.includes(user.role))
    : [];

  // Verificar si una ruta está activa
  const isActive = (path: string) => location.pathname === path;

  if (!user) return null;

  return (
    <nav style={styles.navbar}>
      <div style={styles.container}>
        {/* Logo y Brand */}
        <div style={styles.brand}>
          <div style={styles.logoCircle}>
            <svg style={styles.logoSvg} viewBox="0 0 24 24" fill="none">
              <path
                d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3ZM18 14H14V18H10V14H6V10H10V6H14V10H18V14Z"
                fill="white"
              />
            </svg>
          </div>
          <span style={styles.brandName}>CuidAR+</span>
        </div>

        {/* Navigation Links */}
        <div style={styles.navLinks}>
          {visibleItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                ...styles.navLink,
                ...(isActive(item.path) ? styles.navLinkActive : {}),
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* User Menu */}
        <div style={styles.userMenu}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={styles.userDetails}>
              <div style={styles.userName}>{user.name}</div>
              <div style={styles.userRole}>
                {user.role === 'ADMIN' && '👑 Administrador'}
                {user.role === 'ASISTENCIAL' && '👨‍⚕️ Asistencial'}
                {user.role === 'PERSONAL' && '👤 Personal'}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            🚪 Salir
          </button>
        </div>
      </div>
    </nav>
  );
}

// ============================================
// ESTILOS
// ============================================
const styles: Record<string, React.CSSProperties> = {
  navbar: {
    backgroundColor: '#fff',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '70px',
    gap: '30px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },
  logoCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
  },
  logoSvg: {
    width: '24px',
    height: '24px',
  },
  brandName: {
    fontSize: '22px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  navLinks: {
    flex: 1,
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 500,
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  navLinkActive: {
    backgroundColor: '#ede9fe',
    color: '#667eea',
    fontWeight: 600,
  },
  navIcon: {
    fontSize: '18px',
  },
  navLabel: {
    fontSize: '15px',
  },
  userMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#667eea',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 600,
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  userName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1f2937',
  },
  userRole: {
    fontSize: '12px',
    color: '#6b7280',
  },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: '#fff',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

// Añadir estilos hover con CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  nav button:hover {
    background-color: #f3f4f6;
    transform: translateY(-1px);
  }

  nav button.active:hover {
    background-color: #ede9fe;
  }

  .logout-btn:hover {
    border-color: #dc2626 !important;
    color: #dc2626 !important;
  }
`;
document.head.appendChild(styleSheet);