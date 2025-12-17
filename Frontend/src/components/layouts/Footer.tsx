export default function Footer() {
  return (
    <>
      <footer className="modern-footer">
        <div className="footer-container">
          {/* Brand Section */}
          <div className="footer-brand-section">
            <div className="footer-brand">
              <div className="footer-logo">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3ZM18 14H14V18H10V14H6V10H10V6H14V10H18V14Z"
                    fill="url(#footer-logo-gradient)"
                  />
                  <defs>
                    <linearGradient id="footer-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#667eea"/>
                      <stop offset="100%" stopColor="#764ba2"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="footer-brand-name">CuidAR+</span>
            </div>
            <p className="footer-tagline">
              Tu compañero digital para el cuidado de la salud
            </p>
          </div>

          {/* Links Section */}
          <div className="footer-links-grid">
            <div className="footer-links-column">
              <h3 className="footer-column-title">Producto</h3>
              <a href="#" className="footer-link">Características</a>
              <a href="#" className="footer-link">Seguridad</a>
              <a href="#" className="footer-link">Actualizaciones</a>
            </div>

            <div className="footer-links-column">
              <h3 className="footer-column-title">Soporte</h3>
              <a href="#" className="footer-link">Centro de Ayuda</a>
              <a href="#" className="footer-link">Contacto</a>
              <a href="#" className="footer-link">FAQ</a>
            </div>

            <div className="footer-links-column">
              <h3 className="footer-column-title">Legal</h3>
              <a href="#" className="footer-link">Privacidad</a>
              <a href="#" className="footer-link">Términos</a>
              <a href="#" className="footer-link">Cookies</a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <div className="footer-bottom-container">
            <div className="footer-copyright">
              <p>© 2025 Instituto Mariano Moreno. Todos los derechos reservados.</p>
              <p className="footer-developers">
                Desarrollado con <span className="footer-heart">♥</span> por Fabricio Martinez y Jonatan Ramirez
              </p>
            </div>

            <div className="footer-social">
              <a href="#" className="social-link" title="GitHub">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="social-link" title="LinkedIn">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="social-link" title="Twitter">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        .modern-footer {
          background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
          color: #e5e7eb;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin-top: auto;
        }

        .footer-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 4rem 2rem 3rem;
          display: grid;
          grid-template-columns: 1.5fr 2fr;
          gap: 4rem;
        }

        .footer-brand-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .footer-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .footer-logo {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.2);
        }

        .footer-logo svg {
          width: 28px;
          height: 28px;
        }

        .footer-brand-name {
          font-size: 1.75rem;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.5px;
        }

        .footer-tagline {
          font-size: 1rem;
          color: #9ca3af;
          line-height: 1.6;
          margin: 0;
          max-width: 320px;
        }

        .footer-links-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 3rem;
        }

        .footer-links-column {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .footer-column-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: #f3f4f6;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 0.5rem 0;
        }

        .footer-link {
          font-size: 0.9375rem;
          color: #9ca3af;
          text-decoration: none;
          transition: all 0.2s ease;
          width: fit-content;
          position: relative;
        }

        .footer-link::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          transition: width 0.3s ease;
        }

        .footer-link:hover {
          color: #667eea;
        }

        .footer-link:hover::after {
          width: 100%;
        }

        .footer-bottom {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding: 2rem 0;
        }

        .footer-bottom-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.5rem;
        }

        .footer-copyright {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .footer-copyright p {
          font-size: 0.875rem;
          color: #9ca3af;
          margin: 0;
        }

        .footer-developers {
          font-size: 0.8125rem;
          color: #6b7280;
        }

        .footer-heart {
          color: #ef4444;
          display: inline-block;
          animation: heartbeat 1.5s ease-in-out infinite;
        }

        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          10%, 30% { transform: scale(1.1); }
          20%, 40% { transform: scale(1); }
        }

        .footer-social {
          display: flex;
          gap: 1rem;
        }

        .social-link {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          text-decoration: none;
          transition: all 0.3s ease;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .social-link svg {
          width: 20px;
          height: 20px;
        }

        .social-link:hover {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
          border-color: transparent;
        }

        @media (max-width: 1024px) {
          .footer-container {
            grid-template-columns: 1fr;
            gap: 3rem;
          }

          .footer-links-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 640px) {
          .footer-container {
            padding: 3rem 1.5rem 2rem;
          }

          .footer-links-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .footer-bottom-container {
            padding: 0 1.5rem;
            flex-direction: column;
            text-align: center;
          }

          .footer-copyright {
            align-items: center;
          }
        }
      `}</style>
    </>
  );
}
