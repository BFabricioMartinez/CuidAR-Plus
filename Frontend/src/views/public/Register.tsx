import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../style/Login.css';
import '../../style/Register.css';

// Tipo para los datos del formulario de registro
interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'ASISTENCIAL' | 'PERSONAL';
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'PERSONAL'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    // Validaciones
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

    try {
      const response = await fetch('http://localhost:8000/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al crear la cuenta');
      }

      // Registro exitoso
      alert('Cuenta creada exitosamente. Ahora puedes iniciar sesión.');
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modern-login-container register-container">
      {/* Card contenedor principal */}
      <div className="login-card">
        {/* Panel izquierdo con fondo liso para imagen */}
        <div className="left-panel">
          <div className="left-content">
            {/* Aquí puedes agregar tu imagen más adelante */}
            <div className="image-placeholder">
              <img src="/login.jpg" alt="Ilustración" className="main-illustration" />
            </div>
          </div>
        </div>

        {/* Panel derecho con formulario */}
        <div className="right-panel">
          <div className="form-container">
            {/* Botón de volver - Posicionado de forma absoluta */}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="back-button"
              aria-label="Volver al Login"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>

            {/* Mensaje de error */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="modern-form">
              {/* Campo de nombre completo */}
              <div className="input-group">
                <label className="input-label">Nombre completo</label>
                <div className="input-wrapper-modern">
                  <svg className="input-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="modern-input"
                    placeholder="Ingrese su nombre completo"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Campo de email */}
              <div className="input-group">
                <label className="input-label">Correo electrónico</label>
                <div className="input-wrapper-modern">
                  <svg className="input-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="modern-input"
                    placeholder="correo@ejemplo.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Campo de rol */}
              <div className="input-group">
                <label className="input-label">Rol</label>
                <div className="input-wrapper-modern">
                  <svg className="input-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="modern-input modern-select"
                    required
                    disabled={loading}
                  >
                    <option value="PERSONAL">Personal</option>
                    <option value="ASISTENCIAL">Asistencial</option>
                  </select>
                </div>
              </div>

              {/* Campo de contraseña */}
              <div className="input-group">
                <label className="input-label">Contraseña</label>
                <div className="input-wrapper-modern">
                  <svg className="input-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="modern-input"
                    placeholder="Mínimo 6 caracteres"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Campo de confirmar contraseña */}
              <div className="input-group">
                <label className="input-label">Confirmar contraseña</label>
                <div className="input-wrapper-modern">
                  <svg className="input-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="modern-input"
                    placeholder="Repita su contraseña"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="password-toggle"
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Botón de registrarse */}
              <button 
                type="submit" 
                className="submit-button-modern"
                disabled={loading}
              >
                {loading ? 'Creando cuenta...' : 'Registrarse'}
              </button>
            </form>

            {/* Divider */}
            <div className="divider">
              <span className="divider-text">O continuar con</span>
            </div>

            {/* Botón de Google */}
            <button
              type="button"
              onClick={() => console.log('Google register')}
              className="google-button-full"
              disabled={loading}
            >
              <svg className="google-icon" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="google-button-text">Continuar con Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;