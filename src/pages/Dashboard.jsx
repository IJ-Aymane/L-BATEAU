import { useEffect, useState } from 'react';
import { bateauxAPI, clientsAPI, reservationsAPI } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState({ bateaux: 0, clients: 0, reservations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([bateauxAPI.getAll(), clientsAPI.getAll(), reservationsAPI.getAll()])
      .then(([b, c, r]) => setStats({ bateaux: b.data.length, clients: c.data.length, reservations: r.data.length }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Bateaux', value: stats.bateaux, icon: '⛵', color: 'var(--accent)', link: '/bateaux' },
    { label: 'Clients', value: stats.clients, icon: '👤', color: 'var(--gold)', link: '/clients' },
    { label: 'Réservations', value: stats.reservations, icon: '📋', color: 'var(--green)', link: '/reservations' },
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
          {cards.map(c => (
            <div key={c.label} className="card" style={{ padding: '24px', borderTop: `3px solid ${c.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: '8px' }}>{c.label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '52px', color: c.color, lineHeight: 1 }}>{c.value}</div>
                </div>
                <span style={{ fontSize: '32px' }}>{c.icon}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: '24px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', letterSpacing: '2px', marginBottom: '12px', color: 'var(--muted)' }}>SYSTÈME</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            ['API Base URL', 'http://localhost:8080/api'],
            ['Bateaux endpoint', '/api/bateaux'],
            ['Clients endpoint', '/api/clients'],
            ['Réservations endpoint', '/api/reservations'],
          ].map(([k, v]) => (
            <div key={k} style={{ background: 'var(--deep)', borderRadius: '8px', padding: '12px 16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{k}</div>
              <div style={{ fontSize: '13px', color: 'var(--accent)', fontFamily: 'monospace' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}