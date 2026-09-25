import { useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PrivateRoute from './components/PrivateRoute';
import { clearSession, getRoleHome, getStoredRole, normalizeRole } from './auth';
import {
  AdminDashboard,
  AdminFleet,
  AdminUsers,
  CatalogueDetailPage,
  CataloguePage,
  ClientAccountPage,
  ContactPage,
  HomePage,
  ManagerPlanning,
  ReservationDetail,
  ReservationTunnelPage,
  TechFleetPage,
} from './pages/MarinePages';
import './App.css';

const shelllessRoutes = [
  '/',
  '/login',
  '/connexion',
  '/forgot-password',
  '/reset-password',
  '/contact',
  '/catalogue',
  '/reservation/tunnel',
];

const nav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'DB', roles: ['ADMIN'] },
  { to: '/admin/flotte', label: 'Flotte', icon: 'FL', roles: ['ADMIN'] },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: 'US', roles: ['ADMIN'] },
  { to: '/manager/planning', label: 'Planning', icon: 'PL', roles: ['ADMIN', 'MANAGER'] },
  { to: '/manager/reservations/new', label: 'Réservation', icon: 'RS', roles: ['ADMIN', 'MANAGER'] },
  { to: '/compte/reservations', label: 'Mon compte', icon: 'CP', roles: ['CLIENT'] },
];

function BrandLogo({ className = '' }) {
  return <img className={`brand-logo ${className}`.trim()} src="/img/logo.png" alt="Blue Lagoon Marine" />;
}

function canSee(item, role) {
  if (!item.roles?.length) return true;
  return item.roles.map(normalizeRole).includes(role);
}

function ShelllessRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/connexion" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/catalogue" element={<CataloguePage />} />
      <Route path="/catalogue/:id" element={<CatalogueDetailPage />} />
      <Route path="/reservation/tunnel" element={<ReservationTunnelPage />} />
      <Route path="*" element={<Navigate to="/catalogue" replace />} />
    </Routes>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const role = getStoredRole();
  const visibleNav = useMemo(() => nav.filter((item) => canSee(item, role)), [role]);
  const isShellless = shelllessRoutes.some((route) => location.pathname === route || (route === '/catalogue' && location.pathname.startsWith('/catalogue/')));
  const current = visibleNav.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));

  useEffect(() => {
    const id = window.setTimeout(() => setSidebarOpen(false), 0);
    return () => window.clearTimeout(id);
  }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const logout = () => {
    clearSession();
    navigate('/connexion', { replace: true });
  };

  if (isShellless) return <ShelllessRoutes />;

  return (
    <div className="app-layout">
      <header className="topbar">
        <button className="topbar-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu">
          <span className="hamburger-icon"><span /><span /><span /></span>
        </button>
        <BrandLogo className="topbar-logo" />
        <span className="topbar-page">{current?.icon || 'BL'}</span>
      </header>

      {sidebarOpen && <div className="sidebar-overlay open" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Fermer">×</button>
        <div className="sidebar-brand">
          <BrandLogo />
          <span className="role-pill">{role}</span>
        </div>

        <nav className="sidebar-nav" aria-label="Navigation principale">
          {visibleNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-row"><span className="status-dot" /> API connectée</div>
          <button onClick={logout} className="btn btn-secondary btn-sm">Déconnexion</button>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to={getRoleHome(role)} replace />} />
          <Route path="/admin/dashboard" element={<PrivateRoute roles={['ADMIN']}><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/flotte" element={<PrivateRoute roles={['ADMIN']}><AdminFleet /></PrivateRoute>} />
          <Route path="/admin/utilisateurs" element={<PrivateRoute roles={['ADMIN']}><AdminUsers /></PrivateRoute>} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/manager/planning" element={<PrivateRoute roles={['ADMIN', 'MANAGER']}><ManagerPlanning /></PrivateRoute>} />
          <Route path="/manager/reservations/new" element={<PrivateRoute roles={['ADMIN', 'MANAGER']}><ReservationDetail /></PrivateRoute>} />
          <Route path="/manager/reservations/:id" element={<PrivateRoute roles={['ADMIN', 'MANAGER']}><ReservationDetail /></PrivateRoute>} />
          <Route path="/manager" element={<Navigate to="/manager/planning" replace />} />
          <Route path="/tech/flotte" element={<PrivateRoute roles={['ADMIN', 'TECHNICIAN']}><TechFleetPage /></PrivateRoute>} />
          <Route path="/tech" element={<Navigate to="/tech/flotte" replace />} />
          <Route path="/compte" element={<Navigate to="/compte/reservations" replace />} />
          <Route path="/compte/:tab" element={<PrivateRoute roles={['ADMIN', 'CLIENT']}><ClientAccountPage /></PrivateRoute>} />
          <Route path="/bateaux" element={<Navigate to="/admin/flotte" replace />} />
          <Route path="/clients" element={<Navigate to="/admin/utilisateurs" replace />} />
          <Route path="/reservations" element={<Navigate to="/manager/planning" replace />} />
          <Route path="*" element={<Navigate to={getRoleHome(role)} replace />} />
        </Routes>
      </main>
    </div>
  );
}
