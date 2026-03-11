import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Bateaux from './pages/Bateaux';
import Clients from './pages/Clients';
import Reservations from './pages/Reservations';
import Dashboard from './pages/Dashboard';
import './App.css';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const nav = [
    { to: '/',             label: 'Dashboard',   icon: '◈' },
    { to: '/bateaux',      label: 'Bateaux',      icon: '⛵' },
    { to: '/clients',      label: 'Clients',      icon: '👤' },
    { to: '/reservations', label: 'Réservations', icon: '📋' },
  ];

  const pageTitle = nav.find(n =>
    n.to === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(n.to)
  );

  return (
    <div className="app-layout">

      {/* ── MOBILE TOPBAR ─────────────────────────────────── */}
      <header className="topbar">
        <button
          className="topbar-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <span className="hamburger-icon">
            <span /><span /><span />
          </span>
        </button>

        <div className="topbar-brand">
          <span className="topbar-brand-icon">⚓</span>
          <span className="topbar-brand-name">L'BATEAU</span>
        </div>

        {/* Current page indicator */}
        <div className="topbar-page">
          {pageTitle?.icon}
        </div>
      </header>

      {/* ── SIDEBAR OVERLAY (mobile) ───────────────────────── */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── SIDEBAR ───────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>

        {/* Close button — mobile only */}
        <button
          className="sidebar-close-btn"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fermer le menu"
        >
          ✕
        </button>

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
          <div className="status-dot" />
          <span>API Connected</span>
        </div>
      </aside>

      {/* ── MAIN CONTENT ──────────────────────────────────── */}
      <main className="main-content">
        <Routes>
          <Route path="/"             element={<Dashboard />} />
          <Route path="/bateaux"      element={<Bateaux />} />
          <Route path="/clients"      element={<Clients />} />
          <Route path="/reservations" element={<Reservations />} />
        </Routes>
      </main>

    </div>
  );
}