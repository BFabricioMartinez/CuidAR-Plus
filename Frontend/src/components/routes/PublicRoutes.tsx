import { Navigate, Outlet } from "react-router-dom";

/**
 * Rutas públicas - Solo usuarios NO autenticados pueden acceder (login, registro)
 * Si el usuario ya está logueado, redirige al dashboard
 */
function PublicRoutes() {
  const token = localStorage.getItem("token");

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default PublicRoutes;
