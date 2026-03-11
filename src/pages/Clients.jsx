import { useEffect, useState } from 'react';
import { clientsAPI, reservationsAPI, bateauxAPI } from '../api';

const EMPTY = { nomComplet: '', telephone: '', cin: '' };

export default function Clients() {
  const [list, setList] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [bateaux, setBateaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([clientsAPI.getAll(), reservationsAPI.getAll(), bateauxAPI.getAll()])
      .then(([clientsRes, reservationsRes, bateauxRes]) => {
        setList(clientsRes.data);
        setReservations(reservationsRes.data);
        setBateaux(bateauxRes.data);
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setModal(true); setError(''); };
  const openEdit = (c) => { setForm(c); setEditId(c.id); setModal(true); setError(''); };

  const save = async () => {
    try {
      if (editId) await clientsAPI.update(editId, form);
      else await clientsAPI.create(form);
      setModal(false); 
      load();
    } catch { setError('Erreur lors de la sauvegarde'); }
  };

  const del = async (id) => {
    if (!window.confirm('Supprimer ce client ?')) return;
    await clientsAPI.delete(id); 
    load();
  };

  // Finances et bateaux du client
  const getClientFinances = (clientId) => {
    const clientRes = reservations.filter(r => r.clientId === clientId);
    return clientRes.reduce((acc, curr) => ({
      total: acc.total + (curr.montantTotal || 0),
      paye: acc.paye + (curr.montantPaye || 0),
      restant: acc.restant + (curr.montantRestant || 0)
    }), { total: 0, paye: 0, restant: 0 });
  };

  const getClientBateaux = (clientId) => {
    const clientRes = reservations.filter(r => r.clientId === clientId);
    const noms = clientRes.map(r => {
      const b = bateaux.find(b => b.id === r.bateauId);
      return b ? b.nom : '—';
    });
    // Uniq noms
    return [...new Set(noms)];
  };

  const getClientSummary = (clientId) => {
    const clientRes = reservations.filter(r => r.clientId === clientId);
    const bateauxDiff = getClientBateaux(clientId);
    const finances = getClientFinances(clientId);
    return {
      nbReservations: clientRes.length,
      nbBateaux: bateauxDiff.length,
      total: finances.total,
      paye: finances.paye,
      restant: finances.restant
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
        {loading ? <div className="loading">Chargement...</div> : (
          <div className="table-wrap">
            {list.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">👤</div><p>Aucun client enregistré</p></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nom Complet</th>
                    <th>Téléphone</th>
                    <th>CIN</th>
                    <th>Bateaux</th>
                    <th>Nb Réservations</th>
                    <th>Nb Bateaux</th>
                    <th>Montant Total</th>
                    <th>Avance</th>
                    <th>Reste</th>
                    <th>État</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(c => {
                    const finances = getClientFinances(c.id);
                    const bateauxClient = getClientBateaux(c.id);
                    const summary = getClientSummary(c.id);

                    let etatBadge = <span className="badge badge-blue">Aucune résa</span>;
                    if (finances.total > 0) {
                      if (finances.restant <= 0) etatBadge = <span className="badge badge-green">✅ Payé</span>;
                      else etatBadge = <span className="badge badge-gold">⚠️ Reste à payer</span>;
                    }

                    return (
                      <tr key={c.id}>
                        <td><strong>{c.nomComplet || '—'}</strong></td>
                        <td>{c.telephone}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{c.cin || '—'}</td>
                        <td>{bateauxClient.join(', ') || '—'}</td>
                        <td>{summary.nbReservations}</td>
                        <td>{summary.nbBateaux}</td>
                        <td style={{ fontWeight: 500 }}>{summary.total} MAD</td>
                        <td style={{ color: 'var(--green)', fontWeight: 500 }}>{summary.paye} MAD</td>
                        <td style={{ color: summary.restant > 0 ? 'var(--gold)' : 'var(--muted)', fontWeight: 'bold' }}>{summary.restant} MAD</td>
                        <td>{etatBadge}</td>
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
              <input value={form.nomComplet || ''} onChange={e => setForm(p => ({ ...p, nomComplet: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Téléphone</label>
              <input value={form.telephone || ''} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>CIN</label>
              <input value={form.cin || ''} onChange={e => setForm(p => ({ ...p, cin: e.target.value }))} />
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