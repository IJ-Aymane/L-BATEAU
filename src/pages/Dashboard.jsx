import { useEffect, useState } from 'react';
import { bateauxAPI, clientsAPI, reservationsAPI } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState({ bateaux: 0, clients: 0, reservations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([bateauxAPI.getAll(), clientsAPI.getAll(), reservationsAPI.getAll()])
      .then(([b, c, r]) => setStats({
        bateaux:      b.data.length,
        clients:      c.data.length,
        reservations: r.data.length,
      }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Bateaux',      value: stats.bateaux,      icon: '⛵', color: 'var(--accent)', borderColor: 'var(--accent)' },
    { label: 'Clients',      value: stats.clients,      icon: '👤', color: 'var(--gold)',   borderColor: 'var(--gold)'   },
    { label: 'Réservations', value: stats.reservations, icon: '📋', color: 'var(--green)',  borderColor: 'var(--green)'  },
  ];

  const sysInfo = [
    ['API Base URL',          'http://localhost:8080/api'],
    ['Bateaux endpoint',      '/api/bateaux'],
    ['Clients endpoint',      '/api/clients'],
    ['Réservations endpoint', '/api/reservations'],
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">DASHBOARD</div>
          <div className="page-subtitle">Vue d'ensemble du système</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : (
        /* ── Stats cards — uses .stats-grid from CSS (responsive) */
        <div className="stats-grid">
          {cards.map(c => (
            <div
              key={c.label}
              className="card stat-card"
              style={{ borderTopColor: c.borderColor }}
            >
              <div>
                <div className="stat-label">{c.label}</div>
                <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
              </div>
              <span className="stat-icon">{c.icon}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── System info */}
      <div className="card" style={{ padding: '20px' }}>
        <div className="section-title">SYSTÈME</div>
        <div className="info-grid">
          {sysInfo.map(([k, v]) => (
            <div key={k} className="info-item">
              <div className="info-item-label">{k}</div>
              <div className="info-item-value">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}