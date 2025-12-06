import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../style/Dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {/* Header con botón de login */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo">
            <img src="/lgCuidar.png" alt="Logo Cuidar" className="logo-image" />
          </div>
          <button className="login-button" onClick={handleLoginClick}>
            Iniciar sesión
          </button>
        </div>
      </header>

      {/* Hero Section - Diseño tipo Slack */}
      <main className="hero-section">
        <div className="hero-container">
          {/* Columna Izquierda - Texto */}
          <div className="hero-left">
            <h1 className="hero-title">
              Organizá, controlá y acompañá la medicación de forma simple y segura
            </h1>
            <p className="hero-subtitle">
              Gestioná tratamientos médicos sin complicaciones. 
              Evitá olvidos, coordiná con tu equipo y llevá un control claro 
              y centralizado, ya sea en casa o en centros de cuidado.
            </p>
            <button className="hero-button" onClick={handleLoginClick}>
              COMENZAR AHORA
            </button>
          </div>

          {/* Columna Derecha - Gráficos */}
          <div className="hero-right">
            {/* Círculo amarillo de fondo */}
            <div className="yellow-circle"></div>

            {/* Imágenes de personas - Posicionamiento absoluto */}
            <img
              src="/1.jpg"
              alt="Persona izquierda"
              className="person-left"
            />
            <img
              src="/2.jpg"
              alt="Persona derecha"
              className="person-right"
            />

            {/* Tarjeta flotante tipo chat */}
            <div className="floating-card">
              <div className="card-header">
                <div className="avatar-group">
                  <div className="avatar">AC</div>
                  <span className="card-title">Equipo de Cuidado</span>
                </div>
                <div className="status-online"></div>
              </div>
              <div className="card-body">
                <p className="card-message">
                  "Registro actualizado: dosis administrada correctamente."
                </p>
                <span className="card-time">Hace 2 minutos</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;