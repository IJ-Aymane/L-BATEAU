import { useEffect, useState } from 'react';
import { reservationsAPI, clientsAPI, bateauxAPI } from '../api';

const EMPTY = { clientId: '', bateauId: '', dateDebut: '', dateFin: '', statut: 'PENDING', montantTotal: 0, montantPaye: 0, montantRestant: 0, nbHeures: 0 };

export default function Reservations() {
  const [list, setList]       = useState([]);
  const [clients, setClients] = useState([]);
  const [bateaux, setBateaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(EMPTY);
  const [editId, setEditId]   = useState(null);
  const [openId, setOpenId]   = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([reservationsAPI.getAll(), clientsAPI.getAll(), bateauxAPI.getAll()])
      .then(([r, c, b]) => {
        const updated = (r.data || r).map(res => {
          const dD = new Date(res.dateDebut), dF = new Date(res.dateFin);
          return { ...res, nbHeures: (!isNaN(dD) && !isNaN(dF) && dF > dD) ? Math.round((dF - dD) / 3600000) : 0 };
        });
        setList(updated); setClients(c.data || c); setBateaux(b.data || b);
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle     = (id) => setOpenId(prev => prev === id ? null : id);
  const openCreate = ()   => { setForm(EMPTY); setEditId(null); setModal(true); setError(''); };
  const openEdit   = (r)  => {
    const fmt = v => v ? new Date(v).toISOString().slice(0, 16) : '';
    setForm({ ...r, dateDebut: fmt(r.dateDebut), dateFin: fmt(r.dateFin) });
    setEditId(r.id); setModal(true); setError('');
  };

  useEffect(() => {
    const dD = new Date(form.dateDebut), dF = new Date(form.dateFin);
    const nbHeures = (!isNaN(dD) && !isNaN(dF) && dF > dD) ? Math.round((dF - dD) / 3600000) : 0;
    const montantRestant = (Number(form.montantTotal) || 0) - (Number(form.montantPaye) || 0);
    setForm(prev => ({ ...prev, nbHeures, montantRestant }));
  }, [form.dateDebut, form.dateFin, form.montantTotal, form.montantPaye]);

  const save = async () => {
    if (!form.clientId || !form.bateauId || !form.dateDebut || !form.dateFin) { setError('Remplir tous les champs'); return; }
    const dD = new Date(form.dateDebut), dF = new Date(form.dateFin);
    if (dD >= dF) { setError('Date fin doit être après date début'); return; }
    const conflict = list.some(r => r.statut !== 'CANCELLED' && r.bateauId === form.bateauId && !(editId && r.id === editId) && (dD < new Date(r.dateFin) && dF > new Date(r.dateDebut)));
    if (conflict) { setError('Ce bateau est déjà réservé pour cette période'); return; }
    try {
      const payload = { ...form, nbHeures: Math.round((dF - dD) / 3600000), montantRestant: (Number(form.montantTotal) || 0) - (Number(form.montantPaye) || 0) };
      if (editId) await reservationsAPI.update(editId, payload);
      else        await reservationsAPI.create(payload);
      setModal(false); load();
    } catch { setError('Erreur lors de la sauvegarde'); }
  };

  const del = async (id) => {
    if (!window.confirm('Supprimer réservation ?')) return;
    await reservationsAPI.delete(id); load();
  };

  const clientName = id => clients.find(c => c.id === id)?.nomComplet || '—';
  const bateauName = id => bateaux.find(b => b.id === id)?.nom || '—';
  const fmtDate    = d  => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
  const fmtDt      = d  => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const statutCls = { CONFIRMED: 'badge-green', PENDING: 'badge-gold', CANCELLED: 'badge-blue' };
  const accentMap = { CONFIRMED: 'accent-green', PENDING: 'accent-gold', CANCELLED: 'accent-blue' };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">RÉSERVATIONS</div>
          <div className="page-subtitle">Gestion des réservations</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Ajouter</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">Chargement...</div>
        ) : list.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📋</div><p>Aucune réservation</p></div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="table-wrap desktop-only">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Client</th><th>Bateau</th><th>Début</th><th>Fin</th>
                    <th>Heures</th><th>Total</th><th>Payé</th><th>Reste</th><th>Statut</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(r => (
                    <tr key={r.id}>
                      <td><span className="badge badge-blue">{r.id?.slice(-6)}</span></td>
                      <td>{clientName(r.clientId)}</td>
                      <td>{bateauName(r.bateauId)}</td>
                      <td className="fs-sm">{fmtDt(r.dateDebut)}</td>
                      <td className="fs-sm">{fmtDt(r.dateFin)}</td>
                      <td>{r.nbHeures}h</td>
                      <td className="fw-500">{r.montantTotal || 0} MAD</td>
                      <td className="text-green">{r.montantPaye || 0} MAD</td>
                      <td className={r.montantRestant > 0 ? 'text-gold fw-bold' : 'text-muted'}>{r.montantRestant || 0} MAD</td>
                      <td><span className={`badge ${statutCls[r.statut] || 'badge-blue'}`}>{r.statut}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={() => del(r.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE ACCORDION */}
            <div className="mobile-only mobile-list">
              {list.map(r => {
                const isOpen = openId === r.id;
                return (
                  <div key={r.id} className={`mobile-card ${accentMap[r.statut] || 'accent-blue'} ${isOpen ? 'open' : ''}`}>

                    <div className="mc-summary" onClick={() => toggle(r.id)}>
                      <div className="mc-summary-left">
                        <span className="mc-name">📋 {clientName(r.clientId)}</span>
                      </div>
                      <div className="mc-summary-right">
                        <span className={`badge ${statutCls[r.statut] || 'badge-blue'}`}>{r.statut}</span>
                        <span className="mc-chevron">▼</span>
                      </div>
                    </div>

                    <div className="mc-body">
                      <div className="mc-row"><span className="mc-label">ID</span><span className="mc-value"><span className="badge badge-blue">{r.id?.slice(-6)}</span></span></div>
                      <div className="mc-row"><span className="mc-label">Bateau</span><span className="mc-value">{bateauName(r.bateauId)}</span></div>
                      <div className="mc-row"><span className="mc-label">Début</span><span className="mc-value">{fmtDate(r.dateDebut)}</span></div>
                      <div className="mc-row"><span className="mc-label">Fin</span><span className="mc-value">{fmtDate(r.dateFin)}</span></div>
                      <div className="mc-row"><span className="mc-label">Durée</span><span className="mc-value">{r.nbHeures}h</span></div>
                      <div className="mc-row"><span className="mc-label">Total</span><span className="mc-value fw-500">{r.montantTotal || 0} MAD</span></div>
                      <div className="mc-row"><span className="mc-label">Avance</span><span className="mc-value text-green fw-500">{r.montantPaye || 0} MAD</span></div>
                      <div className="mc-row">
                        <span className="mc-label">Reste</span>
                        <span className={`mc-value fw-bold ${r.montantRestant > 0 ? 'text-gold' : 'text-muted'}`}>{r.montantRestant || 0} MAD</span>
                      </div>
                      <div className="mc-actions">
                        <button className="btn" onClick={() => openEdit(r)}>✏️ Modifier</button>
                        <button className="btn" onClick={() => del(r.id)}>🗑️ Supprimer</button>
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
            <div className="modal-title">{editId ? 'MODIFIER RÉSERVATION' : 'NOUVELLE RÉSERVATION'}</div>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group"><label>Client</label>
              <select value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}>
                <option value="">Choisir client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nomComplet}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Bateau</label>
              <select value={form.bateauId} onChange={e => setForm(p => ({ ...p, bateauId: e.target.value }))}>
                <option value="">Choisir bateau</option>
                {bateaux.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Date Début</label><input type="datetime-local" value={form.dateDebut || ''} onChange={e => setForm(p => ({ ...p, dateDebut: e.target.value }))} /></div>
            <div className="form-group"><label>Date Fin</label><input type="datetime-local" value={form.dateFin || ''} onChange={e => setForm(p => ({ ...p, dateFin: e.target.value }))} /></div>
            <div className="form-group"><label>Montant Total</label><input type="number" value={form.montantTotal || 0} onChange={e => setForm(p => ({ ...p, montantTotal: Number(e.target.value) }))} /></div>
            <div className="form-group"><label>Avance Payée</label><input type="number" value={form.montantPaye || 0} onChange={e => setForm(p => ({ ...p, montantPaye: Number(e.target.value) }))} /></div>
            <div className="form-group"><label>Montant Restant</label><input type="number" value={form.montantRestant || 0} disabled /></div>
            <div className="form-group"><label>Nb. Heures</label><input type="number" value={form.nbHeures || 0} disabled /></div>
            <div className="form-group"><label>Statut</label>
              <select value={form.statut} onChange={e => setForm(p => ({ ...p, statut: e.target.value }))}>
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
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