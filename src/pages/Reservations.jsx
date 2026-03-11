import { useEffect, useState } from 'react';
import { reservationsAPI, clientsAPI, bateauxAPI } from '../api';

const EMPTY = {
  clientId: '',
  bateauId: '',
  dateDebut: '',
  dateFin: '',
  statut: 'PENDING',
  montantTotal: 0,
  montantPaye: 0,
  montantRestant: 0,
  nbHeures: 0
};

export default function Reservations() {
  const [list, setList] = useState([]);
  const [clients, setClients] = useState([]);
  const [bateaux, setBateaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([reservationsAPI.getAll(), clientsAPI.getAll(), bateauxAPI.getAll()])
      .then(([r, c, b]) => {
        const updated = (r.data || r).map(res => {
          const dDebut = new Date(res.dateDebut);
          const dFin = new Date(res.dateFin);
          const nbHeures = (!isNaN(dDebut) && !isNaN(dFin) && dFin>dDebut)
            ? Math.round((dFin-dDebut)/(1000*60*60))
            : 0;
          return { ...res, nbHeures };
        });
        setList(updated);
        setClients(c.data || c);
        setBateaux(b.data || b);
      })
      .catch(()=>setError('Erreur de chargement'))
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{ load(); }, []);

  const openCreate = ()=> { setForm(EMPTY); setEditId(null); setModal(true); setError(''); };
  const openEdit = (r)=> {
    const toDatetimeLocal = val=> val ? new Date(val).toISOString().slice(0,16) : '';
    setForm({...r, dateDebut: toDatetimeLocal(r.dateDebut), dateFin: toDatetimeLocal(r.dateFin)});
    setEditId(r.id);
    setModal(true);
    setError('');
  };

  // حساب nbHeures و montantRestant
  useEffect(()=>{
    const dDebut = new Date(form.dateDebut);
    const dFin = new Date(form.dateFin);
    const nbHeures = (!isNaN(dDebut) && !isNaN(dFin) && dFin>dDebut)
      ? Math.round((dFin-dDebut)/(1000*60*60))
      : 0;
    const montantRestant = (Number(form.montantTotal)||0) - (Number(form.montantPaye)||0);
    setForm(prev=>({...prev, nbHeures, montantRestant}));
  },[form.dateDebut, form.dateFin, form.montantTotal, form.montantPaye]);

  const save = async()=>{
    if(!form.clientId || !form.bateauId || !form.dateDebut || !form.dateFin){
      setError("Remplir tous les champs"); return;
    }
    const dDebut=new Date(form.dateDebut), dFin=new Date(form.dateFin);
    if(dDebut>=dFin){ setError("Date fin doit être après date début"); return; }

    const isConflict = list.some(r=>
      r.statut!=="CANCELLED" &&
      r.bateauId===form.bateauId &&
      !(editId && r.id===editId) &&
      (dDebut<new Date(r.dateFin) && dFin>new Date(r.dateDebut))
    );
    if(isConflict){ setError("Ce bateau est déjà réservé pour cette période"); return; }

    const nbHeures = Math.round((dFin-dDebut)/(1000*60*60));
    const montantRestant = (Number(form.montantTotal)||0)-(Number(form.montantPaye)||0);

    try{
      const payload = {...form, nbHeures, montantRestant};
      if(editId) await reservationsAPI.update(editId,payload);
      else await reservationsAPI.create(payload);
      setModal(false);
      load();
    }catch{
      setError("Erreur lors de la sauvegarde");
    }
  };

  const del = async(id)=> {
    if(!window.confirm("Supprimer réservation ?")) return;
    await reservationsAPI.delete(id);
    load();
  };

  const clientName=id=>{ const c=clients.find(c=>c.id===id); return c?c.nomComplet:id; };
  const bateauName=id=>{ const b=bateaux.find(b=>b.id===id); return b?b.nom:id; };

  const statusBadge=s=>{
    const map={CONFIRMED:"badge-green",PENDING:"badge-gold",CANCELLED:"badge-blue"};
    return <span className={`badge ${map[s]||'badge-blue'}`}>{s}</span>;
  };

  const paymentBadge=(total,paye,restant)=>{
    if(total>0 && paye>=total) return <span className="badge badge-green">✅ Payé</span>;
    if(restant>0) return <span className="badge badge-red">❌ Reste</span>;
    return <span className="badge badge-blue">—</span>;
  };

  const formatDatetime=d=> d
    ? new Date(d).toLocaleString('fr-FR',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'})
    : '—';

  return(
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">RÉSERVATIONS</div>
          <div className="page-subtitle">Gestion des réservations</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Ajouter</button>
      </div>

      <div className="card">
        {loading
          ? <div className="loading">Chargement...</div>
          : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Client</th><th>Bateau</th>
                  <th>Date Début</th><th>Date Fin</th><th>Nb. Heures</th>
                  <th>Total</th><th>Payé</th><th>Restant</th><th>Paiement</th><th>Statut</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.length===0
                  ? <tr><td colSpan={12} style={{textAlign:"center"}}>Aucune réservation</td></tr>
                  : list.map(r=>(
                    <tr key={r.id}>
                      <td>{r.id?.slice(-6)}</td>
                      <td>{clientName(r.clientId)}</td>
                      <td>{bateauName(r.bateauId)}</td>
                      <td>{formatDatetime(r.dateDebut)}</td>
                      <td>{formatDatetime(r.dateFin)}</td>
                      <td>{r.nbHeures}</td>
                      <td>{r.montantTotal||0} MAD</td>
                      <td style={{color:"green"}}>{r.montantPaye||0} MAD</td>
                      <td style={{color:"red"}}>{r.montantRestant||0} MAD</td>
                      <td>{paymentBadge(r.montantTotal,r.montantPaye,r.montantRestant)}</td>
                      <td>{statusBadge(r.statut)}</td>
                      <td>
                        <div style={{display:"flex",gap:"8px"}}>
                          <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(r)}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={()=>del(r.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e=> e.target===e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-title">{editId?"MODIFIER RÉSERVATION":"NOUVELLE RÉSERVATION"}</div>
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label>Client</label>
              <select value={form.clientId} onChange={e=>setForm(p=>({...p, clientId:e.target.value}))}>
                <option value="">Choisir client</option>
                {clients.map(c=><option key={c.id} value={c.id}>{c.nomComplet}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Bateau</label>
              <select value={form.bateauId} onChange={e=>setForm(p=>({...p, bateauId:e.target.value}))}>
                <option value="">Choisir bateau</option>
                {bateaux.map(b=><option key={b.id} value={b.id}>{b.nom}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Date Début</label>
              <input type="datetime-local" value={form.dateDebut||''} onChange={e=>setForm(p=>({...p,dateDebut:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label>Date Fin</label>
              <input type="datetime-local" value={form.dateFin||''} onChange={e=>setForm(p=>({...p,dateFin:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label>Montant Total</label>
              <input type="number" value={form.montantTotal||0} onChange={e=>setForm(p=>({...p,montantTotal:Number(e.target.value)}))}/>
            </div>
            <div className="form-group">
              <label>Avance Payée</label>
              <input type="number" value={form.montantPaye||0} onChange={e=>setForm(p=>({...p,montantPaye:Number(e.target.value)}))}/>
            </div>
            <div className="form-group">
              <label>Montant Restant</label>
              <input type="number" value={form.montantRestant||0} disabled/>
            </div>
            <div className="form-group">
              <label>Nb. Heures</label>
              <input type="number" value={form.nbHeures||0} disabled/>
            </div>
            <div className="form-group">
              <label>Statut</label>
              <select value={form.statut} onChange={e=>setForm(p=>({...p,statut:e.target.value}))}>
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={save}>💾 Sauvegarder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}