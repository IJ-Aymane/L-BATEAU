import { useEffect, useState } from 'react';
import { reservationsAPI, clientsAPI, bateauxAPI } from '../api';

const EMPTY = { clientId: '', bateauId: '', dateDebut: '', dateFin: '', statut: 'PENDING' };

export default function Reservations() {
  const [list, setList] = useState([]);
  const [clients, setClients] = useState([]);
  const [bateaux, setBateaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const load = () => Promise.all([
    reservationsAPI.getAll(),
    clientsAPI.getAll(),
    bateauxAPI.getAll()
  ]).then(([r, c, b]) => { setList(r.data); setClients(c.data); setBateaux(b.data); })
    .catch(() => setError('Erreur de chargement'))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setModal(true); setError(''); };

  // ✅ Convert ISO date from DB → datetime-local format (YYYY-MM-DDTHH:mm)
  const toDatetimeLocal = (val) => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d)) return '';
    return d.toISOString().slice(0, 16);
  };

  const openEdit = (r) => {
    setForm({
      ...r,
      dateDebut: toDatetimeLocal(r.dateDebut),
      dateFin: toDatetimeLocal(r.dateFin),
    });
    setEditId(r.id);
    setModal(true);
    setError('');
  };

  const save = async () => {
    if (!form.clientId || !form.bateauId || !form.dateDebut || !form.dateFin) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (new Date(form.dateDebut) >= new Date(form.dateFin)) {
      setError('La date de fin doit être après la date de début.');
      return;
    }
    try {
      const payload = {
        ...form,
        dateDebut: new Date(form.dateDebut).toISOString(),
        dateFin: new Date(form.dateFin).toISOString(),
      };
      if (editId) await reservationsAPI.update(editId, payload);
      else await reservationsAPI.create(payload);
      setModal(false); load();
    } catch { setError('Erreur lors de la sauvegarde'); }
  };

  const del = async (id) => {
    if (!confirm('Supprimer cette réservation ?')) return;
    await reservationsAPI.delete(id); load();
  };

  const clientName = (id) => {
    const c = clients.find(c => c.id === id);
    return c ? c.nomComplet : id;
  };

  const bateauName = (id) => {
    const b = bateaux.find(b => b.id === id);
    return b ? b.nom : id;
  };

  const statusBadge = (s) => {
    const map = { CONFIRMED: 'badge-green', PENDING: 'badge-gold', CANCELLED: 'badge-blue' };
    return <span className={`badge ${map[s] || 'badge-blue'}`}>{s}</span>;
  };

  // ✅ Format: 09/03/2026 à 14:30
  const formatDatetime = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date)) return '—';
    return date.toLocaleDateString('fr-FR') + ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

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
        {loading ? <div className="loading">Chargement...</div> : (
          <div className="table-wrap">
            {list.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📋</div><p>Aucune réservation</p></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Client</th><th>Bateau</th>
                    <th>Date Début</th><th>Date Fin</th><th>Statut</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(r => (
                    <tr key={r.id}>
                      <td><span className="badge badge-blue">{r.id?.slice(-6)}</span></td>
                      <td><strong>{clientName(r.clientId)}</strong></td>
                      <td>{bateauName(r.bateauId)}</td>
                      <td style={{ fontSize: '13px', fontFamily: 'monospace' }}>{formatDatetime(r.dateDebut)}</td>
                      <td style={{ fontSize: '13px', fontFamily: 'monospace' }}>{formatDatetime(r.dateFin)}</td>
                      <td>{statusBadge(r.statut)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>✏️ Modifier</button>
                          <button className="btn btn-danger btn-sm" onClick={() => del(r.id)}>🗑️ Supprimer</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-title">{editId ? 'MODIFIER RÉSERVATION' : 'NOUVELLE RÉSERVATION'}</div>
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label>Client</label>
              <select value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}>
                <option value="">-- Choisir un client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nomComplet} — {c.cin}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Bateau</label>
              <select value={form.bateauId} onChange={e => setForm(p => ({ ...p, bateauId: e.target.value }))}>
                <option value="">-- Choisir un bateau --</option>
                {bateaux.map(b => (
                  <option key={b.id} value={b.id}>{b.nom} — {b.prixParHeure} MAD/h</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Date & Heure Début</label>
              {/* ✅ datetime-local input */}
              <input
                type="datetime-local"
                value={form.dateDebut || ''}
                onChange={e => setForm(p => ({ ...p, dateDebut: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Date & Heure Fin</label>
              <input
                type="datetime-local"
                value={form.dateFin || ''}
                onChange={e => setForm(p => ({ ...p, dateFin: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Statut</label>
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