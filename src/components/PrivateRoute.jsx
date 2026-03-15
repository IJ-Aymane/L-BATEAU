import { Navigate } from 'react-router-dom';

// Wraps any route that requires authentication.
// If no JWT token in localStorage → redirect to /login
export default function PrivateRoute({ children }) {
  const token = localStorage.getItem('jwt_token');
  return token ? children : <Navigate to="/login" replace />;
}