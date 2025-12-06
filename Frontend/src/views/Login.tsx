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
        const authResponse = await authApi.login({
          email: formData.email,
          password: formData.password,
        });

        authApi.saveAuth(authResponse);

        if (authResponse.user.role === 'ADMIN') {
          navigate('/admin/dashboard');
        } else if (authResponse.user.role === 'ASISTENCIAL') {
          navigate('/asistencial/dashboard');
        } else {
          navigate('/personal/dashboard');
        }
      } else {
        await authApi.signup({
          name: formData.name!,
          email: formData.email,
          password: formData.password,
          role: formData.role!,
        });

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
    <div className="login-container">
      {/* Animated Background */}
      <div className="animated-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Main Card */}
      <div className="login-card">
        {/* Logo Section with Animation */}
        <div className="logo-section">
          <div className="logo-wrapper">
            <svg className="logo-icon" viewBox="0 0 24 24" fill="none">
              <path d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3ZM18 14H14V18H10V14H6V10H10V6H14V10H18V14Z" fill="url(#logo-gradient)"/>
              <defs>
                <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#667eea"/>
                  <stop offset="100%" stopColor="#764ba2"/>
                </linearGradient>
              </defs>
            </svg>
            <div className="pulse-ring"></div>
          </div>
          <h1 className="brand-title">CuidAR+</h1>
          <p className="brand-subtitle">Tu salud, siempre contigo</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="error-alert slide-down">
            <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group fade-in">
              <label className="form-label">Nombre completo</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Tu nombre"
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="form-input"
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="form-input"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="eye-button"
              >
                {showPassword ? (
                  <svg className="eye-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                ) : (
                  <svg className="eye-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {!isLogin && (
            <>
              <div className="form-group fade-in">
                <label className="form-label">Confirmar contraseña</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="form-group fade-in">
                <label className="form-label">Tipo de usuario</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    <option value="PERSONAL">Personal</option>
                    <option value="ASISTENCIAL">Asistencial</option>
                  </select>
                  <svg className="select-arrow" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            className={`submit-button ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <span className="loading-content">
                <svg className="spinner" viewBox="0 0 24 24">
                  <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Procesando...
              </span>
            ) : (
              <>
                <span>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
                <svg className="arrow-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Switch Mode */}
        <div className="switch-section">
          <div className="divider">
            <span className="divider-text">o</span>
          </div>
          <p className="switch-text">
            {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
          </p>
          <button type="button" onClick={switchMode} className="switch-button">
            {isLogin ? 'Crear cuenta nueva' : 'Iniciar sesión'}
          </button>
        </div>
      </div>

      {/* Floating Pills */}
      <div className="floating-pills">
        <div className="pill pill-1">💊</div>
        <div className="pill pill-2">⏰</div>
        <div className="pill pill-3">❤️</div>
        <div className="pill pill-4">📱</div>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .animated-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          z-index: 0;
        }

        .gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.6;
          animation: float 20s ease-in-out infinite;
        }

        .orb-1 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.8) 0%, transparent 70%);
          top: -10%;
          left: -10%;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(236, 72, 153, 0.8) 0%, transparent 70%);
          bottom: -10%;
          right: -10%;
          animation-delay: 7s;
        }

        .orb-3 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.8) 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: 14s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -30px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(20px, 30px) scale(1.05); }
        }

        .login-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 32px;
          padding: 3rem 2.5rem;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.3), 0 0 1px rgba(0, 0, 0, 0.1);
          position: relative;
          z-index: 10;
          border: 1px solid rgba(255, 255, 255, 0.3);
          animation: cardSlideUp 0.6s ease-out;
        }

        @keyframes cardSlideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .logo-section {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .logo-wrapper {
          position: relative;
          width: 90px;
          height: 90px;
          margin: 0 auto 1.5rem;
        }

        .logo-icon {
          width: 90px;
          height: 90px;
          filter: drop-shadow(0 8px 16px rgba(102, 126, 234, 0.4));
          animation: logoFloat 3s ease-in-out infinite;
          position: relative;
          z-index: 2;
        }

        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .pulse-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 90px;
          height: 90px;
          border: 3px solid #667eea;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: pulse 2s ease-out infinite;
          z-index: 1;
        }

        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }

        .brand-title {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.5px;
        }

        .brand-subtitle {
          font-size: 1rem;
          color: #6b7280;
          margin: 0;
          font-weight: 500;
        }

        .error-alert {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #dc2626;
          padding: 1rem 1.25rem;
          border-radius: 16px;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border: 1px solid #fca5a5;
          font-weight: 500;
        }

        .slide-down {
          animation: slideDown 0.3s ease-out;
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

        .error-icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .fade-in {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .form-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-left: 0.25rem;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          width: 20px;
          height: 20px;
          color: #9ca3af;
          pointer-events: none;
          z-index: 1;
        }

        .form-input,
        .form-select {
          width: 100%;
          padding: 1rem 3rem 1rem 3rem;
          font-size: 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 14px;
          outline: none;
          transition: all 0.3s ease;
          background: #f9fafb;
          box-sizing: border-box;
          font-family: inherit;
        }

        .form-select {
          appearance: none;
          cursor: pointer;
          padding-right: 3rem;
        }

        .form-input:focus,
        .form-select:focus {
          border-color: #667eea;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
          transform: translateY(-1px);
        }

        .select-arrow {
          position: absolute;
          right: 1rem;
          width: 20px;
          height: 20px;
          color: #9ca3af;
          pointer-events: none;
        }

        .eye-button {
          position: absolute;
          right: 1rem;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          transition: color 0.2s ease;
          border-radius: 6px;
        }

        .eye-button:hover {
          color: #667eea;
          background: rgba(102, 126, 234, 0.1);
        }

        .eye-icon {
          width: 22px;
          height: 22px;
        }

        .submit-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          padding: 1.125rem 2rem;
          font-size: 1.0625rem;
          font-weight: 700;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 0.5rem;
          box-shadow: 0 10px 25px -5px rgba(102, 126, 234, 0.5);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .submit-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s ease;
        }

        .submit-button:hover:not(:disabled)::before {
          left: 100%;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 35px -5px rgba(102, 126, 234, 0.6);
        }

        .submit-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .loading-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .spinner {
          width: 22px;
          height: 22px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spinner-circle {
          opacity: 0.25;
        }

        .spinner-path {
          opacity: 0.75;
        }

        .arrow-icon {
          width: 20px;
          height: 20px;
          transition: transform 0.3s ease;
        }

        .submit-button:hover .arrow-icon {
          transform: translateX(4px);
        }

        .switch-section {
          margin-top: 2rem;
          text-align: center;
        }

        .divider {
          position: relative;
          height: 1px;
          background: linear-gradient(to right, transparent, #e5e7eb, transparent);
          margin: 2rem 0 1.5rem;
        }

        .divider-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(255, 255, 255, 0.95);
          padding: 0 1rem;
          color: #9ca3af;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .switch-text {
          color: #6b7280;
          font-size: 0.9375rem;
          margin: 0 0 1rem 0;
          font-weight: 500;
        }

        .switch-button {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          border: 2px solid #667eea;
          color: #667eea;
          padding: 0.875rem 2rem;
          font-size: 0.9375rem;
          font-weight: 700;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
        }

        .switch-button:hover {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(102, 126, 234, 0.4);
        }

        .floating-pills {
          position: fixed;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 1;
        }

        .pill {
          position: absolute;
          font-size: 2.5rem;
          opacity: 0.15;
          animation: floatPill 15s ease-in-out infinite;
        }

        .pill-1 {
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }

        .pill-2 {
          top: 20%;
          right: 15%;
          animation-delay: 5s;
        }

        .pill-3 {
          bottom: 20%;
          left: 15%;
          animation-delay: 10s;
        }

        .pill-4 {
          bottom: 15%;
          right: 20%;
          animation-delay: 7s;
        }

        @keyframes floatPill {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(20px, -20px) rotate(90deg); }
          50% { transform: translate(-15px, 15px) rotate(180deg); }
          75% { transform: translate(15px, 20px) rotate(270deg); }
        }

        @media (max-width: 640px) {
          .login-card {
            padding: 2rem 1.5rem;
          }

          .brand-title {
            font-size: 2rem;
          }

          .logo-wrapper,
          .logo-icon {
            width: 70px;
            height: 70px;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
