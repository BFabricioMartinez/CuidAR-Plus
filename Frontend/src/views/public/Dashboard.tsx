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
      <header className="dashboard-header">
        <button className="login-button" onClick={handleLoginClick}>
          Iniciar sesion
        </button>
      </header>

      <main className="dashboard-content">
        {/* Contenido del dashboard */}
      </main>
    </div>
  );
};

export default Dashboard;
