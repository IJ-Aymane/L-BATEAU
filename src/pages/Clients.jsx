import { useEffect, useState } from 'react';
import { clientsAPI } from '../api';

const EMPTY = { nomComplet: '', telephone: '', cin: '' };

export default function Clients() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const load = () => clientsAPI.getAll().then(r => setList(r.data)).catch(() => setError('Erreur de chargement')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setModal(true); setError(''); };
  const openEdit = (c) => { setForm(c); setEditId(c.id); setModal(true); setError(''); };

  const save = async () => {
    try {
      if (editId) await clientsAPI.update(editId, form);
      else await clientsAPI.create(form);
      setModal(false); load();
    } catch { setError('Erreur lors de la sauvegarde'); }
  };

  const del = async (id) => {
    if (!confirm('Supprimer ce client ?')) return;
    await clientsAPI.delete(id); load();
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">CLIENTS</div>
          <div className="page-subtitle">Gestion des clients</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Ajouter</button>
      </div>

      <div className="card">
        {loading ? <div className="loading">Chargement...</div> : (
          <div className="table-wrap">
            {list.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">👤</div><p>Aucun client enregistré</p></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nom Complet</th>
                    <th>Téléphone</th>
                    <th>CIN</th>
                    <th>Date Création</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(c => (
                    <tr key={c.id}>
                      <td><span className="badge badge-blue">{c.id?.slice(-6)}</span></td>
                      <td><strong>{c.nomComplet || '—'}</strong></td>
                      <td>{c.telephone}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{c.cin || '—'}</td>
                      <td style={{ fontSize: '13px', color: 'var(--muted)' }}>{formatDate(c.dateCreation)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>✏️ Modifier</button>
                          <button className="btn btn-danger btn-sm" onClick={() => del(c.id)}>🗑️ Supprimer</button>
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
            <div className="modal-title">{editId ? 'MODIFIER CLIENT' : 'NOUVEAU CLIENT'}</div>
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label>Nom Complet</label>
              <input value={form.nomComplet || ''} onChange={e => setForm(p => ({ ...p, nomComplet: e.target.value }))} placeholder="Ex: Ahmed Benali" />
            </div>
            <div className="form-group">
              <label>Téléphone</label>
              <input value={form.telephone || ''} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} placeholder="Ex: +212 6XXXXXXXX" />
            </div>
            <div className="form-group">
              <label>CIN</label>
              <input value={form.cin || ''} onChange={e => setForm(p => ({ ...p, cin: e.target.value }))} placeholder="Ex: AB123456" />
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