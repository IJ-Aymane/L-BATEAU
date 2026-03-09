import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Bateaux from './pages/Bateaux';
import Clients from './pages/Clients';
import Reservations from './pages/Reservations';
import Dashboard from './pages/Dashboard';
import './App.css';

export default function App() {
  const location = useLocation();

  const nav = [
    { to: '/', label: 'Dashboard', icon: '◈' },
    { to: '/bateaux', label: 'Bateaux', icon: '⛵' },
    { to: '/clients', label: 'Clients', icon: '👤' },
    { to: '/reservations', label: 'Réservations', icon: '📋' },
  ];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">⚓</span>
          <div>
            <div className="brand-name">L'BATEAU</div>
            <div className="brand-sub">Management System</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {nav.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="status-dot" />
          <span>API Connected</span>
        </div>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bateaux" element={<Bateaux />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/reservations" element={<Reservations />} />
        </Routes>
      </main>
    </div>
  );
}