import { Navigate } from 'react-router-dom';
import { getRoleHome, roleCanAccess } from '../auth';

export default function PrivateRoute({ children, roles = [] }) {
  const token = localStorage.getItem('jwt_token');
  if (!token) return <Navigate to="/connexion" replace />;
  if (!roleCanAccess(roles)) return <Navigate to={getRoleHome()} replace />;
  return children;
}
