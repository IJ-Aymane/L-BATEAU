import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate, Navigate } from 'react-router-dom';
import Bateaux        from './pages/Bateaux';
import Clients        from './pages/Clients';
import Reservations   from './pages/Reservations';
import Dashboard      from './pages/Dashboard';
import Login          from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import PrivateRoute   from './components/PrivateRoute';
import './App.css';

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password'];

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location  = useLocation();
  const navigate  = useNavigate();

  const isLoggedIn  = !!localStorage.getItem('jwt_token');
  const isPublicPage = PUBLIC_ROUTES.includes(location.pathname);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const logout = () => {
    localStorage.removeItem('jwt_token');
    navigate('/login');
  };

  const nav = [
    { to: '/',             label: 'Dashboard',   icon: '◈' },
    { to: '/bateaux',      label: 'Bateaux',      icon: '⛵' },
    { to: '/clients',      label: 'Clients',      icon: '👤' },
    { to: '/reservations', label: 'Réservations', icon: '📋' },
  ];

  const pageTitle = nav.find(n =>
    n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to)
  );

  // Public pages — no layout
  if (isPublicPage) {
    return (
      <Routes>
        <Route path="/login"           element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="*"                element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">

      {/* ── MOBILE TOPBAR ─────────────────────────────────── */}
      <header className="topbar">
        <button className="topbar-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu">
          <span className="hamburger-icon"><span /><span /><span /></span>
        </button>
        <div className="topbar-brand">
          <span className="topbar-brand-icon">⚓</span>
          <span className="topbar-brand-name">L'BATEAU</span>
        </div>
        <div className="topbar-page">{pageTitle?.icon}</div>
      </header>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* ── SIDEBAR ───────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>✕</button>

        <div className="sidebar-brand">
          <span className="brand-icon">⚓</span>
          <div>
            <div className="brand-name">L'BATEAU</div>
            <div className="brand-sub">Management System</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {nav.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="status-dot" />
              <span>API Connected</span>
            </div>
            {isLoggedIn && (
              <button onClick={logout} className="btn btn-danger btn-sm" style={{ width: '100%' }}>
                🚪 Déconnexion
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ──────────────────────────────────── */}
      <main className="main-content">
        <Routes>
          <Route path="/"             element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/bateaux"      element={<PrivateRoute><Bateaux /></PrivateRoute>} />
          <Route path="/clients"      element={<PrivateRoute><Clients /></PrivateRoute>} />
          <Route path="/reservations" element={<PrivateRoute><Reservations /></PrivateRoute>} />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
      </main>

    </div>
  );
}