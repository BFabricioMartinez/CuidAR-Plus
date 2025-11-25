import { useState } from 'react';

function Footer() {
  const [isMobile] = useState(window.innerWidth <= 768);

  // Estilos
  const footerStyle: React.CSSProperties = {
    background: '#f9f9f9',
    borderTop: '1px solid #e5e7eb',
    padding: isMobile ? '32px 24px' : '48px 40px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    width: '100%',
    marginTop: 'auto',
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  };

  const copyrightStyle: React.CSSProperties = {
    fontSize: isMobile ? '13px' : '14px',
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: '1.6',
    margin: 0,
  };

  const developersStyle: React.CSSProperties = {
    fontSize: isMobile ? '12px' : '13px',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: '1.6',
    margin: 0,
  };

  const linksContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '12px' : '16px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  };

  const linkStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#6b7280',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
    cursor: 'pointer',
  };

  const dividerStyle: React.CSSProperties = {
    width: '1px',
    height: '14px',
    background: '#d1d5db',
  };

  return (
    <footer style={footerStyle}>
      <div style={containerStyle}>
        {/* Derechos y Desarrolladores */}
        <div style={{ textAlign: 'center' }}>
          <p style={copyrightStyle}>
            � 2025 Instituto Mariano Moreno. Todos los derechos reservados.
          </p>
          <p style={developersStyle}>
            Desarrollado y mantenido por Fabricio Martinez y Jonatan Ramirez.
          </p>
        </div>

        {/* Enlaces Legales */}
        <div style={linksContainerStyle}>
          <a
            href="#"
            style={linkStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#10b981';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            �Politica de Privacidad
          </a>

          <div style={dividerStyle}></div>

          <a
            href="#"
            style={linkStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#10b981';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            �Terminos y Condiciones
          </a>

          <div style={dividerStyle}></div>

          <a
            href="#"
            style={linkStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#10b981';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            �Contacto
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
