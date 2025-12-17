import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { useAsistencialDashboard } from '../../hooks/asistencial/useAsistencialDashboard';

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
  icon: React.ReactElement;
  roles: UserRole[];
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const userStr = localStorage.getItem('user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  // Hook para selección de paciente (solo para usuarios asistenciales)
  const isAsistencial = user?.role === 'ASISTENCIAL';
  const {
    patients,
    selectedPatientId,
    fetchMyPatients,
    selectPatient,
  } = useAsistencialDashboard();

  // Cargar pacientes solo si es usuario asistencial
  useEffect(() => {
    if (isAsistencial) {
      fetchMyPatients();
    }
  }, [isAsistencial, fetchMyPatients]);

  // Preparar opciones para react-select (pacientes)
  const patientOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Todos' },
      ...patients.map((patient) => ({
        value: patient.id.toString(),
        label: patient.name,
      })),
    ];
  }, [patients]);

  // Valor seleccionado para react-select
  const selectedPatientOption = useMemo(() => {
    const value = selectedPatientId ? selectedPatientId.toString() : 'all';
    return patientOptions.find(opt => opt.value === value) || patientOptions[0];
  }, [selectedPatientId, patientOptions]);

  // Handler para cambio de paciente
  const handlePatientChange = (option: { value: string; label: string } | null) => {
    if (!option) return;
    const value = option.value;
    if (value === 'all') {
      // Si se selecciona "Todos" desde otras vistas, redirigir al dashboard
      if (location.pathname !== '/asistencial/dashboard') {
        navigate('/asistencial/dashboard');
      }
      selectPatient(null);
    } else {
      selectPatient(Number(value));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedPatientId'); // Limpiar selección de paciente
    navigate('/');
  };

  const navItems: NavItem[] = [
    // ADMIN
    {
      label: 'Dashboard',
      path: '/admin/dashboard',
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" /></svg>,
      roles: ['ADMIN'],
    },
    {
      label: 'Asignaciones',
      path: '/admin/asignaciones',
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" /></svg>,
      roles: ['ADMIN'],
    },

    // ASISTENCIAL
    {
      label: 'Dashboard',
      path: '/asistencial/dashboard',
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" /></svg>,
      roles: ['ASISTENCIAL'],
    },
    {
      label: 'Tratamientos',
      path: '/asistencial/tratamientos',
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" /></svg>,
      roles: ['ASISTENCIAL'],
    },
    {
      label: 'Historial',
      path: '/asistencial/historial',
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>,
      roles: ['ASISTENCIAL'],
    },

    // PERSONAL
    {
      label: 'Mi Dashboard',
      path: '/personal/dashboard',
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>,
      roles: ['PERSONAL'],
    },
    {
      label: 'Mis Tratamientos',
      path: '/personal/tratamientos',
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" /></svg>,
      roles: ['PERSONAL'],
    },
    {
      label: 'Mi Historial',
      path: '/personal/historial',
      icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>,
      roles: ['PERSONAL'],
    },
  ];

  const visibleItems = user
    ? navItems.filter((item) => item.roles.includes(user.role))
    : [];

  const isActive = (path: string) => location.pathname === path;

  // Determinar si un item de navegación debe estar deshabilitado
  const isDisabled = (item: NavItem) => {
    // Solo deshabilitar para usuarios asistenciales cuando no hay paciente seleccionado
    if (user?.role === 'ASISTENCIAL' && selectedPatientId === null) {
      // Deshabilitar "Tratamientos" e "Historial" cuando está en "Todos"
      return item.path === '/asistencial/tratamientos' || item.path === '/asistencial/historial';
    }
    return false;
  };

  if (!user) return null;

  return (
    <>
      <nav className="modern-navbar">
        <div className="navbar-container">
          {/* Logo */}
          <div className="navbar-brand" onClick={() => navigate(visibleItems[0]?.path || '/')}>
            <div className="brand-logo">
              <svg className="brand-logo-svg" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3ZM18 14H14V18H10V14H6V10H10V6H14V10H18V14Z"
                  fill="url(#nav-logo-gradient)"
                />
                <defs>
                  <linearGradient id="nav-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea"/>
                    <stop offset="100%" stopColor="#764ba2"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="brand-name">CuidAR+</span>
          </div>

          {/* Patient Selector (Solo para usuarios asistenciales) - Antes de los nav-links */}
          {isAsistencial && patients.length > 0 && (
            <div className="patient-selector-navbar" title={`${patients.length} paciente${patients.length !== 1 ? 's' : ''} asignado${patients.length !== 1 ? 's' : ''}`}>
              <svg className="patient-selector-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <span className="patients-count-text">{patients.length}</span>
              <div className="patient-selector-divider"></div>
              <Select
                value={selectedPatientOption}
                onChange={handlePatientChange}
                options={patientOptions}
                isSearchable
                isClearable={false}
                className="react-select-navbar-container"
                classNamePrefix="react-select-navbar"
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{
                  control: (base) => ({
                    ...base,
                    background: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    minHeight: 'auto',
                    cursor: 'pointer',
                    '&:hover': {
                      border: 'none',
                    },
                  }),
                  valueContainer: (base) => ({
                    ...base,
                    padding: '0.25rem 0.5rem',
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: '#1f2937',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    margin: 0,
                  }),
                  input: (base) => ({
                    ...base,
                    margin: 0,
                    padding: 0,
                  }),
                  indicatorSeparator: () => ({
                    display: 'none',
                  }),
                  dropdownIndicator: (base) => ({
                    ...base,
                    color: '#667eea',
                    padding: '0 0.25rem',
                    '&:hover': {
                      color: '#764ba2',
                    },
                  }),
                  menu: (base) => ({
                    ...base,
                    zIndex: 9999,
                    minWidth: '200px',
                  }),
                }}
              />
            </div>
          )}

          {/* Desktop Navigation */}
          <div className="nav-links-desktop">
            {visibleItems.map((item) => {
              const disabled = isDisabled(item);
              return (
                <button
                  key={item.path}
                  onClick={() => !disabled && navigate(item.path)}
                  disabled={disabled}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                  title={disabled ? 'Selecciona un paciente para acceder' : ''}
                >
                  <span className="nav-link-icon">{item.icon}</span>
                  <span className="nav-link-label">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="user-section">
            <div className="user-info">
              <div className="user-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <div className="user-name">{user.name}</div>
                <div className="user-role">
                  {user.role === 'ADMIN' && 'Administrador'}
                  {user.role === 'ASISTENCIAL' && 'Asistencial'}
                  {user.role === 'PERSONAL' && 'Personal'}
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              <svg className="logout-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              <span className="logout-text">Salir</span>
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="mobile-menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? (
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="mobile-menu">
            {/* Patient Selector Mobile (Solo para usuarios asistenciales) */}
            {isAsistencial && patients.length > 0 && (
              <div className="patient-selector-mobile">
                <label className="patient-selector-mobile-label">
                  <svg className="patient-selector-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <span>Paciente ({patients.length}):</span>
                </label>
                <Select
                  value={selectedPatientOption}
                  onChange={(option) => {
                    handlePatientChange(option);
                    if (option?.value === 'all' && location.pathname !== '/asistencial/dashboard') {
                      setMenuOpen(false);
                    }
                  }}
                  options={patientOptions}
                  isSearchable
                  isClearable={false}
                  className="react-select-navbar-mobile-container"
                  classNamePrefix="react-select-navbar-mobile"
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      background: '#fff',
                      border: state.isFocused 
                        ? '2px solid #667eea' 
                        : '2px solid rgba(102, 126, 234, 0.2)',
                      borderRadius: '8px',
                      minHeight: '44px',
                      boxShadow: state.isFocused 
                        ? '0 0 0 3px rgba(102, 126, 234, 0.1)' 
                        : 'none',
                      '&:hover': {
                        borderColor: '#667eea',
                      },
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                    menuPortal: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                  }}
                />
              </div>
            )}
            <div className="mobile-menu-links">
              {visibleItems.map((item) => {
                const disabled = isDisabled(item);
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      if (!disabled) {
                        navigate(item.path);
                        setMenuOpen(false);
                      }
                    }}
                    disabled={disabled}
                    className={`mobile-nav-link ${isActive(item.path) ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                    title={disabled ? 'Selecciona un paciente para acceder' : ''}
                  >
                    <span className="mobile-nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="mobile-logout-btn">
              <svg className="logout-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        )}
      </nav>

      <style>{`
        .modern-navbar {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          animation: slideDown 0.4s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .navbar-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0.75rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
        }

        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .navbar-brand:hover {
          transform: scale(1.05);
        }

        .brand-logo {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }

        .brand-logo-svg {
          width: 24px;
          height: 24px;
        }

        .brand-name {
          font-size: 1.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.5px;
        }

        .nav-links-desktop {
          flex: 1;
          display: flex;
          gap: 0.5rem;
          justify-content: center;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: transparent;
          border: none;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
          position: relative;
        }

        .nav-link::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 0;
          height: 3px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          transform: translateX(-50%);
          border-radius: 3px 3px 0 0;
          transition: width 0.3s ease;
        }

        .nav-link:hover {
          background: rgba(102, 126, 234, 0.08);
          color: #667eea;
        }

        .nav-link:hover::before {
          width: 100%;
        }

        .nav-link.active {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%);
          color: #667eea;
        }

        .nav-link.active::before {
          width: 100%;
        }

        .nav-link.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }

        .nav-link.disabled:hover {
          background: transparent;
          color: #6b7280;
        }

        .nav-link.disabled:hover::before {
          width: 0;
        }

        .nav-link-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-link-icon svg {
          width: 100%;
          height: 100%;
        }

        .patient-selector-navbar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 1rem;
          background: rgba(102, 126, 234, 0.08);
          border-radius: 12px;
          border: 1px solid rgba(102, 126, 234, 0.2);
          transition: all 0.3s ease;
        }

        .patients-count-text {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          line-height: 1;
          flex-shrink: 0;
        }

        .patient-selector-divider {
          width: 1px;
          height: 24px;
          background: rgba(102, 126, 234, 0.2);
          flex-shrink: 0;
        }

        .patient-selector-navbar:hover {
          background: rgba(102, 126, 234, 0.12);
          border-color: rgba(102, 126, 234, 0.3);
        }

        .patient-selector-icon {
          width: 18px;
          height: 18px;
          color: #667eea;
          flex-shrink: 0;
        }

        /* React Select Styles para Navbar Desktop */
        .react-select-navbar-container {
          min-width: 150px;
          max-width: 200px;
        }

        .react-select-navbar__control {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          min-height: auto !important;
          cursor: pointer !important;
        }

        .react-select-navbar__control:hover {
          border: none !important;
        }

        .react-select-navbar__value-container {
          padding: 0.25rem 0.5rem !important;
        }

        .react-select-navbar__single-value {
          color: #1f2937 !important;
          font-size: 0.9375rem !important;
          font-weight: 600 !important;
          margin: 0 !important;
        }

        .react-select-navbar__input-container {
          margin: 0 !important;
          padding: 0 !important;
        }

        .react-select-navbar__indicator-separator {
          display: none !important;
        }

        .react-select-navbar__dropdown-indicator {
          color: #667eea !important;
          padding: 0 0.25rem !important;
        }

        .react-select-navbar__dropdown-indicator:hover {
          color: #764ba2 !important;
        }

        .react-select-navbar__menu {
          z-index: 9999 !important;
          min-width: 200px !important;
        }

        .react-select-navbar__menu-portal {
          z-index: 9999 !important;
        }

        .patient-selector-mobile {
          padding: 1rem;
          margin-bottom: 1rem;
          background: rgba(102, 126, 234, 0.08);
          border-radius: 12px;
          border: 1px solid rgba(102, 126, 234, 0.2);
        }

        .patient-selector-mobile-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #667eea;
          margin-bottom: 0.5rem;
        }

        /* React Select Styles para Navbar Mobile */
        .react-select-navbar-mobile-container {
          width: 100%;
        }

        .react-select-navbar-mobile__control {
          background: #fff !important;
          border: 2px solid rgba(102, 126, 234, 0.2) !important;
          borderRadius: 8px !important;
          minHeight: 44px !important;
          boxShadow: none !important;
          transition: all 0.3s ease !important;
        }

        .react-select-navbar-mobile__control:hover {
          borderColor: #667eea !important;
        }

        .react-select-navbar-mobile__control--is-focused {
          borderColor: #667eea !important;
          boxShadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
        }

        .react-select-navbar-mobile__value-container {
          padding: 0.75rem !important;
        }

        .react-select-navbar-mobile__single-value {
          color: #1f2937 !important;
          font-size: 0.9375rem !important;
          font-weight: 600 !important;
        }

        .react-select-navbar-mobile__menu {
          z-index: 9999 !important;
        }

        .react-select-navbar-mobile__menu-portal {
          z-index: 9999 !important;
        }

        .user-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .user-details {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .user-name {
          font-size: 0.9375rem;
          font-weight: 700;
          color: #1f2937;
          line-height: 1;
        }

        .user-role {
          font-size: 0.8125rem;
          color: #6b7280;
          line-height: 1;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: transparent;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.08);
          border-color: #ef4444;
          color: #ef4444;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }

        .logout-icon {
          width: 18px;
          height: 18px;
        }

        .mobile-menu-toggle {
          display: none;
          width: 40px;
          height: 40px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: #667eea;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .mobile-menu-toggle:hover {
          background: rgba(102, 126, 234, 0.1);
        }

        .mobile-menu-toggle svg {
          width: 24px;
          height: 24px;
        }

        .mobile-menu {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          animation: slideDown 0.3s ease-out;
        }

        .mobile-menu-links {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .mobile-nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: transparent;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
          text-align: left;
        }

        .mobile-nav-link:hover {
          background: rgba(102, 126, 234, 0.08);
          color: #667eea;
        }

        .mobile-nav-link.active {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%);
          color: #667eea;
        }

        .mobile-nav-link.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }

        .mobile-nav-link.disabled:hover {
          background: transparent;
          color: #6b7280;
        }

        .mobile-nav-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mobile-nav-icon svg {
          width: 100%;
          height: 100%;
        }

        .mobile-logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem;
          width: 100%;
          background: transparent;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .mobile-logout-btn:hover {
          background: rgba(239, 68, 68, 0.08);
          border-color: #ef4444;
          color: #ef4444;
        }

        @media (max-width: 1024px) {
          .nav-links-desktop {
            display: none;
          }

          .user-info {
            display: none;
          }

          .logout-btn {
            display: none;
          }

          /* Mantener selector de pacientes visible en mobile */
          .patient-selector-navbar {
            display: flex;
          }

          /* Ajustar tamaño del selector en mobile */
          .patient-selector-dropdown {
            min-width: 120px;
            max-width: 150px;
            font-size: 0.875rem;
          }

          .patients-count-text {
            font-size: 0.8125rem;
          }

          .mobile-menu-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }

        @media (max-width: 640px) {
          .navbar-container {
            padding: 0.75rem 1.5rem;
            gap: 1rem;
          }

          .brand-name {
            font-size: 1.25rem;
          }

          /* Ajustar selector en pantallas pequeñas */
          .patient-selector-navbar {
            padding: 0.5rem 0.75rem;
            gap: 0.5rem;
          }

          .patient-selector-dropdown {
            min-width: 100px;
            max-width: 120px;
            font-size: 0.8125rem;
            padding: 0.125rem 0.25rem;
          }

          .patients-count-text {
            font-size: 0.75rem;
          }

          .patient-selector-icon {
            width: 16px;
            height: 16px;
          }

          .patient-selector-divider {
            height: 20px;
          }
        }
      `}</style>
    </>
  );
}
