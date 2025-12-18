import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Intentar reproducir el video automáticamente
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Si falla el autoplay, no hacer nada (el usuario puede reproducirlo manualmente)
      });
    }
  }, []);

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div className="landing-container">
      {/* Animated Background */}
      <div className="animated-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Header con botón de login */}
      <header className="landing-header">
        <div className="header-content">
          <div className="logo-wrapper">
            <img src="/lgCuidar.png" alt="Logo Cuidar" className="logo-image" />
          </div>
          <button className="login-button" onClick={handleLoginClick}>
            <span>Iniciar sesión</span>
            <svg className="arrow-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="hero-section">
        <div className="hero-container">
          {/* Columna Izquierda - Texto */}
          <div className="hero-left">
            <div className="hero-badge">
              <svg className="badge-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Plataforma confiable de gestión médica</span>
            </div>
            <h1 className="hero-title">
              Organizá, controlá y acompañá la medicación de forma simple y segura
            </h1>
            <p className="hero-subtitle">
              Gestioná tratamientos médicos sin complicaciones.
              Evitá olvidos, coordiná con tu equipo y llevá un control claro
              y centralizado, ya sea en casa o en centros de cuidado.
            </p>
            <div className="hero-features">
              <div className="feature-item">
                <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Control en tiempo real</span>
              </div>
              <div className="feature-item">
                <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Notificaciones inteligentes</span>
              </div>
              <div className="feature-item">
                <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Equipo coordinado</span>
              </div>
            </div>
            <button className="hero-button" onClick={handleLoginClick}>
              <span>COMENZAR AHORA</span>
              <svg className="button-arrow" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Columna Derecha - Video */}
          <div className="hero-right">
            <div className="video-wrapper">
              <video
                ref={videoRef}
                className="hero-video"
                src="/dash1.mp4"
                loop
                muted
                playsInline
                autoPlay
              />
              <div className="video-overlay"></div>
              
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
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <span className="footer-text">CuidAR+ © {new Date().getFullYear()} | v1.0 MVP</span>
      </footer>

      <style>{`
  .landing-container {
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    position: relative;
    overflow-x: hidden;
  }

  .animated-background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
  }

  .gradient-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.4;
    animation: float 20s ease-in-out infinite;
  }

  .orb-1 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(102, 126, 234, 0.6) 0%, transparent 70%);
    top: -10%;
    left: -10%;
    animation-delay: 0s;
  }

  .orb-2 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(118, 75, 162, 0.6) 0%, transparent 70%);
    bottom: -10%;
    right: -10%;
    animation-delay: 7s;
  }

  .orb-3 {
    width: 350px;
    height: 350px;
    background: radial-gradient(circle, rgba(82, 22, 111, 0.5) 0%, transparent 70%);
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

  .landing-header {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    padding: 0 60px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
    position: sticky;
    top: 0;
    z-index: 100;
    height: 80px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

  .header-content {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo-wrapper {
    display: flex;
    align-items: center;
    height: 80px;
  }

  .logo-image {
    height: 105px;
    width: auto;
    object-fit: contain;
    transition: transform 0.3s ease;
  }

  .logo-wrapper:hover .logo-image {
    transform: scale(1.05);
  }

  .login-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 28px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    letter-spacing: 0.3px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }

  .login-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  }

  .arrow-icon {
    width: 18px;
    height: 18px;
    transition: transform 0.3s ease;
  }

  .login-button:hover .arrow-icon {
    transform: translateX(4px);
  }

  .hero-section {
    min-height: calc(100vh - 80px);
    display: flex;
    align-items: center;
    padding: 80px 60px;
    position: relative;
    z-index: 1;
  }

  .hero-container {
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: center;
  }

  .hero-left {
    animation: slideInLeft 0.8s ease-out;
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-40px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    border: 1px solid rgba(102, 126, 234, 0.2);
    padding: 0.5rem 1rem;
    border-radius: 50px;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #667eea;
  }

  .badge-icon {
    width: 16px;
    height: 16px;
  }

  .hero-title {
    font-size: 56px;
    font-weight: 800;
    color: #1a1a1a;
    line-height: 1.1;
    margin-bottom: 1.5rem;
    letter-spacing: -2px;
    background: linear-gradient(135deg, #1a1a1a 0%, #4b5563 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-subtitle {
    font-size: 20px;
    color: #6b7280;
    line-height: 1.7;
    margin-bottom: 2rem;
    font-weight: 400;
  }

  .hero-features {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2.5rem;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1rem;
    color: #4b5563;
    font-weight: 500;
  }

  .feature-icon {
    width: 20px;
    height: 20px;
    color: #667eea;
    flex-shrink: 0;
  }

  .hero-button {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 18px 40px;
    border-radius: 14px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    letter-spacing: 0.5px;
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .hero-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.5s ease;
  }

  .hero-button:hover::before {
    left: 100%;
  }

  .hero-button:hover {
    transform: translateY(-3px);
    box-shadow: 0 15px 40px rgba(102, 126, 234, 0.5);
  }

  .button-arrow {
    width: 20px;
    height: 20px;
    transition: transform 0.3s ease;
  }

  .hero-button:hover .button-arrow {
    transform: translateX(6px);
  }

  .hero-right {
    position: relative;
    height: 600px;
    width: 100%;
    animation: slideInRight 0.8s ease-out;
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(40px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .video-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .hero-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .video-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    pointer-events: none;
  }

  .floating-card {
    position: absolute;
    bottom: 30px;
    right: 30px;
    z-index: 20;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 24px;
    width: 360px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.3);
    animation: floatCard 3s ease-in-out infinite;
  }

  @keyframes floatCard {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .avatar-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .avatar {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 16px;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }

  .card-title {
    font-weight: 600;
    font-size: 16px;
    color: #1a1a1a;
  }

  .status-online {
    width: 12px;
    height: 12px;
    background: #22c55e;
    border-radius: 50%;
    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.2);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.1);
    }
  }

  .card-body {
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
  }

  .card-message {
    font-size: 15px;
    color: #4b5563;
    line-height: 1.6;
    margin-bottom: 10px;
    font-weight: 500;
  }

  .card-time {
    font-size: 13px;
    color: #9ca3af;
    font-weight: 500;
  }

  .landing-footer {
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    padding: 0.75rem 1.25rem;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border-radius: 12px;
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
    letter-spacing: 0.3px;
    z-index: 1000;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(0, 0, 0, 0.05);
  }

  .footer-text {
    display: inline-block;
  }

  @media (max-width: 1024px) {
    .hero-container {
      grid-template-columns: 1fr;
      gap: 60px;
    }

    .hero-right {
      height: 400px;
      order: -1;
    }

    .hero-title {
      font-size: 42px;
    }

    .hero-subtitle {
      font-size: 18px;
    }

    .floating-card {
      width: 300px;
      bottom: 20px;
      right: 20px;
    }
  }

  @media (max-width: 768px) {
    .landing-header {
      padding: 0 24px;
      height: 70px;
    }

    .logo-image {
      height: 80px;
    }

    .login-button {
      padding: 10px 20px;
      font-size: 13px;
    }

    .hero-section {
      padding: 40px 24px;
    }

    .hero-title {
      font-size: 36px;
      letter-spacing: -1px;
    }

    .hero-subtitle {
      font-size: 16px;
    }

    .hero-button {
      padding: 16px 32px;
      font-size: 15px;
    }

    .hero-right {
      height: 300px;
    }

    .floating-card {
      width: calc(100% - 40px);
      bottom: 15px;
      right: 20px;
      left: 20px;
      padding: 20px;
    }

    .landing-footer {
      bottom: 0.5rem;
      left: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
    }
  }

  @media (max-width: 480px) {
    .hero-title {
      font-size: 28px;
    }

    .hero-features {
      gap: 0.75rem;
    }

    .feature-item {
      font-size: 0.9375rem;
    }
  }
`}</style>
    </div>
  );
};

export default Dashboard;
