import { useEffect, useState } from 'react';
import { clientsAPI, reservationsAPI, bateauxAPI } from '../api';

const EMPTY = { nomComplet: '', telephone: '', cin: '' };

export default function Clients() {
  const [list, setList]             = useState([]);
  const [reservations, setRes]      = useState([]);
  const [bateaux, setBateaux]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [modal, setModal]           = useState(false);
  const [form, setForm]             = useState(EMPTY);
  const [editId, setEditId]         = useState(null);
  const [openId, setOpenId]         = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([clientsAPI.getAll(), reservationsAPI.getAll(), bateauxAPI.getAll()])
      .then(([c, r, b]) => { setList(c.data); setRes(r.data); setBateaux(b.data); })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle     = (id) => setOpenId(prev => prev === id ? null : id);
  const openCreate = ()   => { setForm(EMPTY); setEditId(null); setModal(true); setError(''); };
  const openEdit   = (c)  => { setForm(c); setEditId(c.id); setModal(true); setError(''); };

  const save = async () => {
    try {
      if (editId) await clientsAPI.update(editId, form);
      else        await clientsAPI.create(form);
      setModal(false); load();
    } catch { setError('Erreur lors de la sauvegarde'); }
  };

  const del = async (id) => {
    if (!window.confirm('Supprimer ce client ?')) return;
    await clientsAPI.delete(id); load();
  };

  const getStats = (clientId) => {
    const res = reservations.filter(r => r.clientId === clientId);
    const bateauxNoms = [...new Set(res.map(r => bateaux.find(b => b.id === r.bateauId)?.nom).filter(Boolean))];
    return {
      nbRes: res.length,
      bateauxNoms,
      total:   res.reduce((a, r) => a + (r.montantTotal   || 0), 0),
      paye:    res.reduce((a, r) => a + (r.montantPaye    || 0), 0),
      restant: res.reduce((a, r) => a + (r.montantRestant || 0), 0),
    };
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">CLIENTS</div>
          <div className="page-subtitle">Gestion des clients et suivi financier</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Ajouter</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">Chargement...</div>
        ) : list.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">👤</div><p>Aucun client enregistré</p></div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="table-wrap desktop-only">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th><th>Téléphone</th><th>CIN</th><th>Bateaux</th>
                    <th>Réservations</th><th>Total</th><th>Avance</th><th>Reste</th><th>État</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(c => {
                    const s = getStats(c.id);
                    const etat = s.total === 0
                      ? <span className="badge badge-blue">Aucune résa</span>
                      : s.restant <= 0
                        ? <span className="badge badge-green">✅ Payé</span>
                        : <span className="badge badge-gold">⚠️ Reste</span>;
                    return (
                      <tr key={c.id}>
                        <td><strong>{c.nomComplet || '—'}</strong></td>
                        <td>{c.telephone}</td>
                        <td className="font-mono fs-sm">{c.cin || '—'}</td>
                        <td>{s.bateauxNoms.join(', ') || '—'}</td>
                        <td>{s.nbRes}</td>
                        <td className="fw-500">{s.total} MAD</td>
                        <td className="text-green fw-500">{s.paye} MAD</td>
                        <td className={s.restant > 0 ? 'text-gold fw-bold' : 'text-muted'}>{s.restant} MAD</td>
                        <td>{etat}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>✏️</button>
                            <button className="btn btn-danger btn-sm" onClick={() => del(c.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE ACCORDION */}
            <div className="mobile-only mobile-list">
              {list.map(c => {
                const s = getStats(c.id);
                const isPaid  = s.total > 0 && s.restant <= 0;
                const hasDebt = s.restant > 0;
                const accentCls = isPaid ? 'accent-green' : hasDebt ? 'accent-gold' : 'accent-blue';
                const isOpen = openId === c.id;

                return (
                  <div key={c.id} className={`mobile-card ${accentCls} ${isOpen ? 'open' : ''}`}>

                    <div className="mc-summary" onClick={() => toggle(c.id)}>
                      <div className="mc-summary-left">
                        <span className="mc-name">👤 {c.nomComplet || '—'}</span>
                      </div>
                      <div className="mc-summary-right">
                        {s.total === 0
                          ? <span className="badge badge-blue">Aucune résa</span>
                          : isPaid
                            ? <span className="badge badge-green">✅ Payé</span>
                            : <span className="badge badge-gold">⚠️ Reste</span>
                        }
                        <span className="mc-chevron">▼</span>
                      </div>
                    </div>

                    <div className="mc-body">
                      <div className="mc-row"><span className="mc-label">Téléphone</span><span className="mc-value">{c.telephone || '—'}</span></div>
                      <div className="mc-row"><span className="mc-label">CIN</span><span className="mc-value font-mono">{c.cin || '—'}</span></div>
                      <div className="mc-row"><span className="mc-label">Réservations</span><span className="mc-value">{s.nbRes}</span></div>
                      <div className="mc-row"><span className="mc-label">Bateaux</span><span className="mc-value">{s.bateauxNoms.join(', ') || '—'}</span></div>
                      <div className="mc-row"><span className="mc-label">Total</span><span className="mc-value fw-500">{s.total} MAD</span></div>
                      <div className="mc-row"><span className="mc-label">Avance</span><span className="mc-value text-green fw-500">{s.paye} MAD</span></div>
                      <div className="mc-row">
                        <span className="mc-label">Reste</span>
                        <span className={`mc-value fw-bold ${s.restant > 0 ? 'text-gold' : 'text-muted'}`}>{s.restant} MAD</span>
                      </div>
                      <div className="mc-actions">
                        <button className="btn" onClick={() => openEdit(c)}>✏️ Modifier</button>
                        <button className="btn" onClick={() => del(c.id)}>🗑️ Supprimer</button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-title">{editId ? 'MODIFIER CLIENT' : 'NOUVEAU CLIENT'}</div>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group"><label>Nom Complet</label><input value={form.nomComplet || ''} onChange={e => setForm(p => ({ ...p, nomComplet: e.target.value }))} /></div>
            <div className="form-group"><label>Téléphone</label><input value={form.telephone || ''} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} /></div>
            <div className="form-group"><label>CIN</label><input value={form.cin || ''} onChange={e => setForm(p => ({ ...p, cin: e.target.value }))} /></div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={save}>💾 Sauvegarder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}