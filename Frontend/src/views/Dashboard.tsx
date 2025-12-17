import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div style={styles.dashboardContainer}>
      {/* Header con botón de login */}
      <header style={styles.dashboardHeader}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <img src="/lgCuidar.png" alt="Logo Cuidar" style={styles.logoImage} />
          </div>
          <button style={styles.loginButton} onClick={handleLoginClick}>
            Iniciar sesión
          </button>
        </div>
      </header>

      {/* Hero Section - Diseño tipo Slack */}
      <main style={styles.heroSection}>
        <div style={styles.heroContainer}>
          {/* Columna Izquierda - Texto */}
          <div style={styles.heroLeft}>
            <h1 style={styles.heroTitle}>
              Organizá, controlá y acompañá la medicación de forma simple y segura
            </h1>
            <p style={styles.heroSubtitle}>
              Gestioná tratamientos médicos sin complicaciones.
              Evitá olvidos, coordiná con tu equipo y llevá un control claro
              y centralizado, ya sea en casa o en centros de cuidado.
            </p>
            <button style={styles.heroButton} onClick={handleLoginClick}>
              COMENZAR AHORA
            </button>
          </div>

          {/* Columna Derecha - Gráficos */}
          <div style={styles.heroRight}>
            {/* Círculo amarillo de fondo */}
            <div style={styles.yellowCircle}></div>

            {/* Imágenes de personas - Posicionamiento absoluto */}
            <img
              src="/1.jpg"
              alt="Persona izquierda"
              style={styles.personLeft}
            />
            <img
              src="/2.jpg"
              alt="Persona derecha"
              style={styles.personRight}
            />

            {/* Tarjeta flotante tipo chat */}
            <div style={styles.floatingCard}>
              <div style={styles.cardHeader}>
                <div style={styles.avatarGroup}>
                  <div style={styles.avatar}>AC</div>
                  <span style={styles.cardTitle}>Equipo de Cuidado</span>
                </div>
                <div style={styles.statusOnline}></div>
              </div>
              <div style={styles.cardBody}>
                <p style={styles.cardMessage}>
                  "Registro actualizado: dosis administrada correctamente."
                </p>
                <span style={styles.cardTime}>Hace 2 minutos</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  dashboardContainer: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  dashboardHeader: {
    backgroundColor: '#ffffff',
    padding: '0 60px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    position: 'sticky' as 'sticky',
    top: 0,
    zIndex: 100,
    height: '80px',
    display: 'flex',
    alignItems: 'center',
  },
  headerContent: {
    width: '100%',
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    height: '80px',
  },
  logoImage: {
    height: '105px',
    width: 'auto',
    objectFit: 'contain' as 'contain',
  },
  loginButton: {
    backgroundColor: '#52166F',
    color: 'white',
    border: 'none',
    padding: '12px 28px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.3px',
    transition: 'all 0.3s ease',
  },
  heroSection: {
    minHeight: 'calc(100vh - 80px)',
    display: 'flex',
    alignItems: 'center',
    padding: '60px 60px',
    backgroundColor: '#f8f9fa',
  },
  heroContainer: {
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
    display: 'grid',
    gridTemplateColumns: '45% 55%',
    gap: '80px',
    alignItems: 'center',
  },
  heroLeft: {
    paddingRight: '20px',
  },
  heroTitle: {
    fontSize: '52px',
    fontWeight: 800,
    color: '#1a1a1a',
    lineHeight: 1.15,
    marginBottom: '24px',
    letterSpacing: '-1.5px',
  },
  heroSubtitle: {
    fontSize: '18px',
    color: '#5f5f5f',
    lineHeight: 1.6,
    marginBottom: '36px',
    fontWeight: 400,
  },
  heroButton: {
    background: 'linear-gradient(135deg, #52166F 0%, #6b1f8f 100%)',
    color: 'white',
    border: 'none',
    padding: '18px 40px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '1px',
    boxShadow: '0 8px 24px rgba(82, 22, 111, 0.3)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  heroRight: {
    position: 'relative' as 'relative',
    height: '550px',
    width: '100%',
  },
  yellowCircle: {
    position: 'absolute' as 'absolute',
    width: '520px',
    height: '520px',
    background: 'linear-gradient(135deg, #FFD700 0%, #FFC700 100%)',
    borderRadius: '50%',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1,
    boxShadow: '0 20px 60px rgba(255, 204, 0, 0.25)',
  },
  personLeft: {
    position: 'absolute' as 'absolute',
    left: '12%',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '280px',
    height: '360px',
    objectFit: 'cover' as 'cover',
    borderRadius: '16px',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
    zIndex: 10,
    transition: 'transform 0.3s ease',
  },
  personRight: {
    position: 'absolute' as 'absolute',
    right: '12%',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '280px',
    height: '360px',
    objectFit: 'cover' as 'cover',
    borderRadius: '16px',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
    zIndex: 10,
    transition: 'transform 0.3s ease',
  },
  floatingCard: {
    position: 'absolute' as 'absolute',
    bottom: '20px',
    right: '80px',
    zIndex: 20,
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    width: '340px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  avatarGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(135deg, #52166F 0%, #6b1f8f 100%)',
    color: 'white',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '14px',
  },
  cardTitle: {
    fontWeight: 600,
    fontSize: '15px',
    color: '#1a1a1a',
  },
  statusOnline: {
    width: '10px',
    height: '10px',
    backgroundColor: '#22c55e',
    borderRadius: '50%',
    boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.2)',
  },
  cardBody: {
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb',
  },
  cardMessage: {
    fontSize: '14px',
    color: '#5f5f5f',
    lineHeight: 1.5,
    marginBottom: '8px',
  },
  cardTime: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: 500,
  },
};

export default Dashboard;
