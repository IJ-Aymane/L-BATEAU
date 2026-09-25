import { Navigate } from 'react-router-dom';
import { clearSession, getRoleHome, hasValidToken, roleCanAccess } from '../auth';

export default function PrivateRoute({ children, roles = [] }) {
  if (!hasValidToken()) {
    clearSession();
    return <Navigate to="/connexion" replace />;
  }
  if (!roleCanAccess(roles)) return <Navigate to={getRoleHome()} replace />;
  return children;
}
