import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, ApiError } from '../api';

// ============================================
// TIPOS
// ============================================
interface AuthFormData {
  email: string;
  password: string;
  confirmPassword?: string;
  role?: 'ADMIN' | 'ASISTENCIAL' | 'PERSONAL';
  name?: string;
}

// ============================================
// COMPONENTE
// ============================================
const Login: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState<AuthFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'PERSONAL',
    name: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validación para registro
    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        setError('Las contraseñas no coinciden');
        setLoading(false);
        return;
      }
      if (formData.password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        setLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        // LOGIN usando nueva API
        const authResponse = await authApi.login({
          email: formData.email,
          password: formData.password,
        });

        // Guardar token y usuario en localStorage
        authApi.saveAuth(authResponse);

        // Redirigir según el rol
        if (authResponse.user.role === 'ADMIN') {
          navigate('/admin/dashboard');
        } else if (authResponse.user.role === 'ASISTENCIAL') {
          navigate('/asistencial/dashboard');
        } else {
          navigate('/personal/dashboard');
        }
      } else {
        // REGISTRO usando nueva API
        await authApi.signup({
          name: formData.name!,
          email: formData.email,
          password: formData.password,
          role: formData.role!,
        });

        // Registro exitoso - cambiar a modo login
        setIsLogin(true);
        setFormData({ email: '', password: '', confirmPassword: '', role: 'PERSONAL', name: '' });
        setError('');
        alert('Cuenta creada exitosamente. Ahora puedes iniciar sesión.');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error de conexión');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({ email: '', password: '', confirmPassword: '', role: 'PERSONAL', name: '' });
  };

  return (
    <div style={styles.container}>
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={styles.videoBackground}
      >
        <source src="/dash1.mp4" type="video/mp4" />
      </video>

      {/* Video Overlay */}
      <div style={styles.videoOverlay}></div>

      <div style={styles.card}>
        {/* Logo Section */}
        <div style={styles.logoSection}>
          <div style={styles.logoCircle}>
            <svg style={styles.logoSvg} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3ZM18 14H14V18H10V14H6V10H10V6H14V10H18V14Z" fill="white"/>
            </svg>
          </div>
          <h1 style={styles.logoText}>CuidAR+</h1>
          <p style={styles.logoSubtext}>Sistema de Gestión de Salud</p>
        </div>

        {error && (
          <div style={styles.error}>
            <svg style={styles.errorIcon} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Name Field - Solo para registro */}
          {!isLogin && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Nombre completo</label>
              <div style={styles.inputWrapper}>
                <svg style={styles.inputIcon} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="Tu nombre"
                  required
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Correo electrónico</label>
            <div style={styles.inputWrapper}>
              <svg style={styles.inputIcon} viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                style={styles.input}
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Contraseña</label>
            <div style={styles.inputWrapper}>
              <svg style={styles.inputIcon} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                style={styles.input}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? (
                  <svg style={styles.eyeIcon} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                ) : (
                  <svg style={styles.eyeIcon} viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password - Solo para registro */}
          {!isLogin && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Confirmar contraseña</label>
              <div style={styles.inputWrapper}>
                <svg style={styles.inputIcon} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          )}

          {/* Role Select - Solo para registro */}
          {!isLogin && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo de usuario</label>
              <div style={styles.inputWrapper}>
                <svg style={styles.inputIcon} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  style={styles.select}
                  required
                >
                  <option value="PERSONAL">Personal</option>
                  <option value="ASISTENCIAL">Asistencial</option>
                </select>
                <svg style={styles.selectArrow} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}

          <button
            type="submit"
            style={{
              ...styles.submitButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            disabled={loading}
          >
            {loading ? (
              <span style={styles.loadingWrapper}>
                <svg style={styles.spinner} viewBox="0 0 24 24">
                  <circle style={styles.spinnerCircle} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path style={styles.spinnerPath} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Procesando...
              </span>
            ) : (
              isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'
            )}
          </button>
        </form>

        {/* Switch Mode */}
        <div style={styles.switchContainer}>
          <span style={styles.switchText}>
            {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
          </span>
          <button
            type="button"
            onClick={switchMode}
            style={styles.switchButton}
          >
            {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
          </button>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>CuidAR+ MVP v0.4</p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ESTILOS
// ============================================
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  videoBackground: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    minWidth: '100%',
    minHeight: '100%',
    width: 'auto',
    height: 'auto',
    transform: 'translate(-50%, -50%)',
    zIndex: 0,
    objectFit: 'cover',
    filter: 'blur(4px)',
  },
  videoOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    zIndex: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '24px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    position: 'relative',
    zIndex: 1,
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoCircle: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    boxShadow: '0 10px 30px -5px rgba(102, 126, 234, 0.5)',
  },
  logoSvg: {
    width: '36px',
    height: '36px',
  },
  logoText: {
    fontSize: '28px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '0 0 4px 0',
  },
  logoSubtext: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  formHeader: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '14px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid #fecaca',
  },
  errorIcon: {
    width: '18px',
    height: '18px',
    flexShrink: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
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
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    width: '18px',
    height: '18px',
    color: '#9ca3af',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '14px 48px 14px 44px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: '#f9fafb',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '14px 44px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: '#f9fafb',
    boxSizing: 'border-box',
    appearance: 'none',
    cursor: 'pointer',
  },
  selectArrow: {
    position: 'absolute',
    right: '14px',
    width: '18px',
    height: '18px',
    color: '#9ca3af',
    pointerEvents: 'none',
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    transition: 'color 0.2s ease',
  },
  eyeIcon: {
    width: '20px',
    height: '20px',
  },
  submitButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    padding: '16px',
    fontSize: '16px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '8px',
    boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.4)',
  },
  loadingWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    animation: 'spin 1s linear infinite',
  },
  spinnerCircle: {
    opacity: 0.25,
  },
  spinnerPath: {
    opacity: 0.75,
  },
  switchContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginTop: '28px',
    paddingTop: '28px',
    borderTop: '1px solid #e5e7eb',
  },
  switchText: {
    color: '#6b7280',
    fontSize: '14px',
  },
  switchButton: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    transition: 'color 0.2s ease',
  },
  footer: {
    textAlign: 'center',
    marginTop: '20px',
  },
  footerText: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '4px 0',
  },
};

// Add CSS animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  input:focus, select:focus {
    border-color: #667eea !important;
    background-color: #fff !important;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
  }

  button[type="submit"]:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px 0 rgba(102, 126, 234, 0.5);
  }

  .switchButton:hover {
    color: #764ba2;
  }
`;
document.head.appendChild(styleSheet);

export default Login;