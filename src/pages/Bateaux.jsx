import { useEffect, useState } from 'react';
import { bateauxAPI } from '../api';

const EMPTY = { nom: '', type: '', capaciteMax: '', proprietaireNom: '', prixParHeure: '', disponible: true };

export default function Bateaux() {
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(EMPTY);
  const [editId, setEditId]   = useState(null);
  const [openId, setOpenId]   = useState(null); // accordion state

  const load = () => bateauxAPI.getAll()
    .then(r => setList(r.data))
    .catch(() => setError('Erreur de chargement'))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const toggle    = (id) => setOpenId(prev => prev === id ? null : id);
  const openCreate = ()  => { setForm(EMPTY); setEditId(null); setModal(true); setError(''); };
  const openEdit  = (b)  => { setForm(b); setEditId(b.id); setModal(true); setError(''); };

  const save = async () => {
    try {
      const payload = {
        ...form,
        capaciteMax:  parseInt(form.capaciteMax)   || 0,
        prixParHeure: parseFloat(form.prixParHeure) || 0,
        disponible:   form.disponible === true || form.disponible === 'true',
      };
      if (editId) await bateauxAPI.update(editId, payload);
      else        await bateauxAPI.create(payload);
      setModal(false); load();
    } catch { setError('Erreur lors de la sauvegarde'); }
  };

  const del = async (id) => {
    if (!confirm('Supprimer ce bateau ?')) return;
    await bateauxAPI.delete(id); load();
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">BATEAUX</div>
          <div className="page-subtitle">Gestion de la flotte</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Ajouter</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">Chargement...</div>
        ) : list.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">⛵</div><p>Aucun bateau enregistré</p></div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="table-wrap desktop-only">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Nom</th><th>Type</th><th>Capacité</th>
                    <th>Propriétaire</th><th>Prix/H</th><th>Disponible</th>
                    <th>Créé le</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(b => (
                    <tr key={b.id}>
                      <td><span className="badge badge-blue">{b.id?.slice(-6)}</span></td>
                      <td><strong>{b.nom}</strong></td>
                      <td><span className="badge badge-gold">{b.type}</span></td>
                      <td>{b.capaciteMax}</td>
                      <td>{b.proprietaireNom || '—'}</td>
                      <td className="text-green fw-500">{b.prixParHeure} MAD</td>
                      <td><span className={`badge ${b.disponible ? 'badge-green' : 'badge-red'}`}>{b.disponible ? '✅ Oui' : '❌ Non'}</span></td>
                      <td className="text-muted fs-sm">{formatDate(b.dateCreation)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(b)}>✏️ Modifier</button>
                          <button className="btn btn-danger btn-sm" onClick={() => del(b.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE ACCORDION */}
            <div className="mobile-only mobile-list">
              {list.map(b => {
                const isOpen = openId === b.id;
                const accentCls = b.disponible ? 'accent-green' : 'accent-red';
                return (
                  <div key={b.id} className={`mobile-card ${accentCls} ${isOpen ? 'open' : ''}`}>

                    {/* Summary row — always visible */}
                    <div className="mc-summary" onClick={() => toggle(b.id)}>
                      <div className="mc-summary-left">
                        <span className="mc-name">⛵ {b.nom}</span>
                        <span className="badge badge-gold">{b.type}</span>
                      </div>
                      <div className="mc-summary-right">
                        <span className={`badge ${b.disponible ? 'badge-green' : 'badge-red'}`}>
                          {b.disponible ? '✅ Dispo' : '❌ Indispo'}
                        </span>
                        <span className="mc-chevron">▼</span>
                      </div>
                    </div>

                    {/* Expanded details */}
                    <div className="mc-body">
                      <div className="mc-row"><span className="mc-label">ID</span><span className="mc-value"><span className="badge badge-blue">{b.id?.slice(-6)}</span></span></div>
                      <div className="mc-row"><span className="mc-label">Propriétaire</span><span className="mc-value">{b.proprietaireNom || '—'}</span></div>
                      <div className="mc-row"><span className="mc-label">Capacité</span><span className="mc-value">{b.capaciteMax} pers.</span></div>
                      <div className="mc-row"><span className="mc-label">Prix / Heure</span><span className="mc-value text-green fw-500">{b.prixParHeure} MAD</span></div>
                      <div className="mc-row"><span className="mc-label">Créé le</span><span className="mc-value text-muted">{formatDate(b.dateCreation)}</span></div>
                      <div className="mc-actions">
                        <button className="btn" onClick={() => openEdit(b)}>✏️ Modifier</button>
                        <button className="btn" onClick={() => del(b.id)}>🗑️ Supprimer</button>
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
            <div className="modal-title">{editId ? 'MODIFIER BATEAU' : 'NOUVEAU BATEAU'}</div>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group"><label>Nom</label><input value={form.nom || ''} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Ex: Sea Star" /></div>
            <div className="form-group"><label>Type</label><input value={form.type || ''} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} placeholder="Ex: Yacht, Voilier..." /></div>
            <div className="form-group"><label>Capacité Max</label><input type="number" value={form.capaciteMax || ''} onChange={e => setForm(p => ({ ...p, capaciteMax: e.target.value }))} /></div>
            <div className="form-group"><label>Propriétaire</label><input value={form.proprietaireNom || ''} onChange={e => setForm(p => ({ ...p, proprietaireNom: e.target.value }))} /></div>
            <div className="form-group"><label>Prix / Heure (MAD)</label><input type="number" value={form.prixParHeure || ''} onChange={e => setForm(p => ({ ...p, prixParHeure: e.target.value }))} /></div>
            <div className="form-group"><label>Disponible</label>
              <select value={form.disponible} onChange={e => setForm(p => ({ ...p, disponible: e.target.value === 'true' }))}>
                <option value="true">✅ Oui</option>
                <option value="false">❌ Non</option>
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