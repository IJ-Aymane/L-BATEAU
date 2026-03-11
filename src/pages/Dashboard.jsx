import { useEffect, useState } from 'react';
import { bateauxAPI, clientsAPI, reservationsAPI } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState({ bateaux: 0, clients: 0, reservations: 0 });
  const [loading, setLoading] = useState(true);

  // Remplace l'URL de base par celle de Render
  const RENDER_URL = "https://bateau-backend.onrender.com";

  useEffect(() => {
    Promise.all([bateauxAPI.getAll(), clientsAPI.getAll(), reservationsAPI.getAll()])
      .then(([b, c, r]) => setStats({
        bateaux:      b.data.length,
        clients:      c.data.length,
        reservations: r.data.length,
      }))
      .catch((err) => console.error("Erreur API:", err))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Bateaux',      value: stats.bateaux,      icon: '⛵', color: 'var(--accent)', borderColor: 'var(--accent)' },
    { label: 'Clients',      value: stats.clients,      icon: '👤', color: 'var(--gold)',   borderColor: 'var(--gold)'   },
    { label: 'Réservations', value: stats.reservations, icon: '📋', color: 'var(--green)',  borderColor: 'var(--green)'  },
  ];

  // Mise à jour de l'affichage des infos système pour refléter la production
  const sysInfo = [
    ['API Status',            loading ? 'Connecting...' : 'Online'],
    ['Production URL',        RENDER_URL],
    ['Database',              'MongoDB Atlas (Cloud)'],
    ['Region',                'Oregon (US)'],
  ];

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <div className="page-title">DASHBOARD</div>
          <div className="page-subtitle">Système en ligne - Surveillance active</div>
        </div>
      </div>

      {loading ? (
        <div className="loading" style={{textAlign: 'center', padding: '2rem', color: 'var(--accent)'}}>
          <div className="spinner"></div> 
          CHARGEMENT DES DONNÉES...
        </div>
      ) : (
        <div className="stats-grid">
          {cards.map(c => (
            <div
              key={c.label}
              className="card stat-card"
              style={{ 
                borderTop: `4px solid ${c.borderColor}`,
                background: 'rgba(0, 20, 20, 0.8)' // Effet terminal
              }}
            >
              <div>
                <div className="stat-label">{c.label}</div>
                <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
              </div>
              <span className="stat-icon" style={{ fontSize: '2rem' }}>{c.icon}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: '20px', marginTop: '20px', borderLeft: '4px solid var(--accent)' }}>
        <div className="section-title" style={{ letterSpacing: '2px', color: 'var(--accent)' }}>INFOS SYSTÈME</div>
        <div className="info-grid">
          {sysInfo.map(([k, v]) => (
            <div key={k} className="info-item" style={{ borderBottom: '1px solid #222', padding: '10px 0' }}>
              <div className="info-item-label" style={{ opacity: 0.6, fontSize: '0.8rem' }}>{k}</div>
              <div className="info-item-value" style={{ fontFamily: 'monospace', color: '#fff' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}