import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { bateauxAPI, catalogueAPI, clientsAPI, reservationsAPI } from '../api';

const heroImage = 'img/auth-hero.png';

const fallbackEquipment = [
  {
    id: 'yacht-signature',
    nom: 'Lagoon Signature',
    type: 'Yacht',
    marque: 'Prestige 460',
    capaciteMax: 10,
    puissance: '2 x 440 CV',
    prixParHeure: 1250,
    disponible: true,
    note: 4.9,
  },
  {
    id: 'voilier-azur',
    nom: 'Voilier Azur',
    type: 'Voilier',
    marque: 'Beneteau Oceanis',
    capaciteMax: 8,
    puissance: '57 CV',
    prixParHeure: 720,
    disponible: true,
    note: 4.8,
  },
  {
    id: 'jet-atlas',
    nom: 'Jet Atlas',
    type: 'Jet Ski',
    marque: 'Sea-Doo GTX',
    capaciteMax: 2,
    puissance: '170 CV',
    prixParHeure: 390,
    disponible: true,
    note: 4.7,
  },
];

const personnel = [
  { id: 'p1', name: 'Amine El Idrissi', email: 'amine@bluelagoon.ma', roles: ['ADMIN'], createdAt: '2026-01-12', lastLogin: '2026-09-25', status: 'ACTIF' },
  { id: 'p2', name: 'Sara Benjelloun', email: 'sara@bluelagoon.ma', roles: ['MANAGER'], createdAt: '2026-02-04', lastLogin: '2026-09-24', status: 'ACTIF' },
  { id: 'p3', name: 'Youssef Radi', email: 'youssef@bluelagoon.ma', roles: ['TECHNICIAN'], createdAt: '2026-03-18', lastLogin: '2026-09-20', status: 'ACTIF' },
];

const faqs = [
  ['Quel est l\'âge minimum ?', 'Le conducteur doit avoir 18 ans minimum. Les passagers mineurs sont acceptés avec un adulte responsable.'],
  ['Faut-il un permis bateau ?', 'Certains équipements nécessitent un permis. Cette exigence est indiquée sur chaque fiche et contrôlée avant départ.'],
  ['Puis-je annuler ma réservation ?', 'Oui, selon la fenêtre d\'annulation indiquée dans votre contrat. Les annulations tardives peuvent être partiellement facturées.'],
  ['Quels paiements acceptez-vous ?', 'Cartes bancaires, espèces en agence, virement confirmé et paiement CMI pour les réservations en ligne.'],
  ['Que se passe-t-il en cas de météo défavorable ?', 'La base peut proposer un report sans frais ou un remboursement selon la décision opérationnelle de sécurité.'],
  ['L\'équipement est-il fourni ?', 'Gilets, briefing sécurité, matériel obligatoire et assistance au départ sont inclus.'],
];

const subjects = [
  'Demande d\'information',
  'Devis groupe',
  'Événement ou privatisation',
  'Question sur une réservation existante',
  'Réclamation',
  'Autre',
];

const unwrap = (res) => {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

const money = (value) => `${Number(value || 0).toLocaleString('fr-FR')} MAD`;
const todayKey = () => new Date().toISOString().slice(0, 10);
const dateKey = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const fmtDate = (value) => value ? new Date(value).toLocaleDateString('fr-FR') : '-';
const fmtTime = (value) => value ? new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-';

const statusBadge = (status = '') => {
  const key = String(status).toUpperCase();
  if (['CONFIRMED', 'ACTIVE', 'ACTIF', 'EN_COURS', 'IN_PROGRESS'].some((s) => key.includes(s))) return 'badge-success';
  if (['PENDING', 'PAYMENT', 'NOUVEAU', 'ATTENTE'].some((s) => key.includes(s))) return 'badge-pending';
  if (['CANCELLED', 'HORS_SERVICE', 'RETIRE', 'DISABLED'].some((s) => key.includes(s))) return 'badge-danger';
  return 'badge-neutral';
};

const equipmentStatus = (item) => {
  if (item?.statut) return item.statut;
  return item?.disponible === false ? 'HORS_SERVICE' : 'ACTIVE';
};

function BrandLogo({ className = '' }) {
  return <img className={`brand-logo ${className}`.trim()} src="img/logo.png" alt="Blue Lagoon Marine" />;
}

function PublicHeader() {
  return (
    <header className="public-header">
      <Link className="public-brand" to="/catalogue" aria-label="Blue Lagoon Marine">
        <BrandLogo />
      </Link>
      <nav className="public-nav">
        <Link to="/catalogue">Catalogue</Link>
        <Link to="/contact">Contact</Link>
        <Link className="btn btn-primary btn-sm" to="/connexion">Se connecter</Link>
      </nav>
    </header>
  );
}

function PageIntro({ eyebrow, title, children, action }) {
  return (
    <div className="page-intro">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  );
}

function useFleetData() {
  const [state, setState] = useState({ boats: [], clients: [], reservations: [], loading: true });

  const load = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true }));
    Promise.allSettled([bateauxAPI.getAll(), clientsAPI.getAll(), reservationsAPI.getAll()])
      .then(([b, c, r]) => {
        setState({
          boats: b.status === 'fulfilled' ? unwrap(b.value) : fallbackEquipment,
          clients: c.status === 'fulfilled' ? unwrap(c.value) : [],
          reservations: r.status === 'fulfilled' ? unwrap(r.value) : [],
          loading: false,
        });
      });
  }, []);

  useEffect(() => {
    const id = window.setTimeout(load, 0);
    return () => window.clearTimeout(id);
  }, [load]);
  return { ...state, reload: load };
}

export function ContactPage() {
  const [open, setOpen] = useState(0);
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: subjects[0],
    message: '',
    consent: false,
    website: '',
  });

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const canSubmit = form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && form.message.trim() && form.consent;

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit || form.website) return;
    setSending(true);
    setStatus('');

    const payload = { ...form, status: 'NOUVEAU', source: 'contact_page' };
    try {
      await api.post('/contact', payload);
      setStatus('Votre demande a été enregistrée. Notre équipe vous répondra rapidement.');
      setForm({ name: '', email: '', phone: '', subject: subjects[0], message: '', consent: false, website: '' });
    } catch {
      const queue = JSON.parse(localStorage.getItem('contact_outbox') || '[]');
      localStorage.setItem('contact_outbox', JSON.stringify([...queue, payload]));
      setStatus('Votre message est prêt et sera synchronisé dès que le back-office contact sera disponible.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="public-page">
      <PublicHeader />
      <main className="public-main contact-layout">
        <PageIntro eyebrow="Base nautique" title="Contact & assistance">
          Un point d'entrée clair pour les demandes clients, groupes, réclamations et réservations existantes.
        </PageIntro>

        <section className="contact-grid">
          <div className="contact-panel">
            <h2>Blue Lagoon Marine</h2>
            <div className="contact-detail"><span>Adresse</span><strong>Base navale, Marina de Casablanca</strong></div>
            <div className="contact-detail"><span>Téléphone</span><strong>+212 5 22 00 00 00</strong></div>
            <div className="contact-detail"><span>Email</span><strong>contact@bluelagoon.ma</strong></div>
            <div className="contact-detail"><span>Horaires</span><strong>09:00 - 19:00, 7j/7</strong></div>
            <div className="social-row">
              <a href="https://www.instagram.com" target="_blank" rel="noreferrer">Instagram</a>
              <a href="https://www.facebook.com" target="_blank" rel="noreferrer">Facebook</a>
              <a href="https://www.linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
            </div>
            <div className="map-panel" aria-label="Carte de la base navale">
              <iframe
                title="Base navale Blue Lagoon Marine"
                loading="lazy"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-7.637%2C33.586%2C-7.592%2C33.614&layer=mapnik"
              />
            </div>
          </div>

          <form className="card form-card" onSubmit={submit}>
            <h2>Envoyer une demande</h2>
            {status && <div className="notice success">{status}</div>}
            <input className="honeypot" tabIndex="-1" value={form.website} onChange={(e) => setField('website', e.target.value)} aria-hidden="true" />
            <div className="form-grid">
              <label>Nom complet<input value={form.name} onChange={(e) => setField('name', e.target.value)} onBlur={(e) => setField('name', e.target.value.trim())} required /></label>
              <label>Email<input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} required /></label>
              <label>Téléphone<input value={form.phone} onChange={(e) => setField('phone', e.target.value)} /></label>
              <label>Sujet<select value={form.subject} onChange={(e) => setField('subject', e.target.value)}>{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label>
            </div>
            <label>Message<textarea rows="7" value={form.message} onChange={(e) => setField('message', e.target.value)} required /></label>
            <label className="check-row"><input type="checkbox" checked={form.consent} onChange={(e) => setField('consent', e.target.checked)} /> J'accepte que mes données soient utilisées pour traiter cette demande.</label>
            <button className="btn btn-primary" type="submit" disabled={!canSubmit || sending}>{sending ? 'Envoi...' : 'Envoyer la demande'}</button>
          </form>
        </section>

        <section className="faq-section">
          <h2>Questions fréquentes</h2>
          <div className="accordion">
            {faqs.map(([q, a], index) => (
              <div className={`accordion-item ${open === index ? 'open' : ''}`} key={q}>
                <button onClick={() => setOpen(open === index ? -1 : index)}>{q}<span>+</span></button>
                <p>{a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export function AdminDashboard() {
  const { boats, clients, reservations, loading } = useFleetData();
  const todays = reservations.filter((r) => dateKey(r.dateDebut) === todayKey());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdays = reservations.filter((r) => dateKey(r.dateDebut) === yesterday.toISOString().slice(0, 10));
  const unavailable = boats.filter((b) => equipmentStatus(b) !== 'ACTIVE');
  const pending = reservations.filter((r) => String(r.statut).includes('PENDING') || Number(r.montantRestant) > 0);
  const revenue = todays.reduce((sum, r) => sum + Number(r.montantPaye || r.montantTotal || 0), 0);
  const occupancy = boats.length ? Math.round((todays.length / boats.length) * 100) : 0;

  const trend = Array.from({ length: 30 }, (_, index) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - index));
    const key = d.toISOString().slice(0, 10);
    const dayReservations = reservations.filter((r) => dateKey(r.dateDebut) === key);
    return {
      key,
      bookings: dayReservations.length,
      revenue: dayReservations.reduce((sum, r) => sum + Number(r.montantTotal || 0), 0),
    };
  });

  const categories = Object.entries(boats.reduce((acc, boat) => {
    const type = boat.type || 'Autre';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {}));

  return (
    <div>
      <PageIntro eyebrow="Administration" title="Dashboard opérationnel">
        Pilotage quotidien des réservations, revenus, flotte et alertes.
      </PageIntro>

      <div className="metric-grid">
        {[
          ['Réservations du jour', todays.length, `${todays.length - yesterdays.length >= 0 ? '+' : ''}${todays.length - yesterdays.length} vs hier`],
          ['Occupation flotte', `${occupancy}%`, `${boats.length} équipements`],
          ['Revenu journalier', money(revenue), 'encaissements estimés'],
          ['Indisponibles', unavailable.length, 'maintenance / retrait'],
          ['Paiements en attente', pending.length, 'à relancer'],
        ].map(([label, value, meta]) => (
          <div className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{loading ? '...' : value}</strong>
            <small>{meta}</small>
          </div>
        ))}
      </div>

      <section className="dashboard-grid">
        <div className="card chart-card">
          <div className="section-head"><h2>Tendance 30 jours</h2><select defaultValue="30"><option value="30">30 jours</option><option value="7">7 jours</option></select></div>
          <div className="trend-chart">
            {trend.map((day) => (
              <span key={day.key} style={{ height: `${Math.max(8, Math.min(100, day.bookings * 18 + day.revenue / 500))}%` }} title={`${fmtDate(day.key)} - ${day.bookings} réservations`} />
            ))}
          </div>
        </div>
        <div className="card chart-card">
          <h2>Répartition équipements</h2>
          <div className="donut-list">
            {(categories.length ? categories : [['Yacht', 2], ['Voilier', 1], ['Jet Ski', 1]]).map(([label, count]) => (
              <div key={label}><span>{label}</span><strong>{count}</strong></div>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-grid bottom">
        <div className="card">
          <div className="section-head"><h2>Réservations du jour</h2><Link to="/manager/planning">Planning</Link></div>
          <div className="responsive-table">
            <table>
              <thead><tr><th>Heure</th><th>Client</th><th>Équipement</th><th>Durée</th><th>Statut</th><th>Montant</th></tr></thead>
              <tbody>
                {(todays.length ? todays : reservations.slice(0, 5)).map((r) => (
                  <tr key={r.id || `${r.clientId}-${r.dateDebut}`}>
                    <td>{fmtTime(r.dateDebut)}</td>
                    <td>{clients.find((c) => c.id === r.clientId)?.nomComplet || 'Client'}</td>
                    <td>{boats.find((b) => b.id === r.bateauId)?.nom || 'Équipement'}</td>
                    <td>{r.nbHeures || 2}h</td>
                    <td><span className={`badge ${statusBadge(r.statut)}`}>{r.statut || 'CONFIRMED'}</span></td>
                    <td>{money(r.montantTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card alerts-panel">
          <h2>Alertes</h2>
          <p><span className="badge badge-danger">{unavailable.length}</span> équipement(s) en maintenance ou retrait.</p>
          <p><span className="badge badge-pending">{pending.length}</span> paiement(s) à relancer.</p>
          <p><span className="badge badge-neutral">3</span> avis clients à modérer.</p>
          <p><span className="badge badge-pending">2</span> maintenances préventives à planifier.</p>
        </div>
      </section>
    </div>
  );
}

export function AdminFleet() {
  const { boats, reservations, reload } = useFleetData();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [view, setView] = useState('table');
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState({});

  const categories = ['ALL', ...new Set((boats.length ? boats : fallbackEquipment).map((b) => b.type || 'Autre'))];
  const filtered = (boats.length ? boats : fallbackEquipment).filter((boat) => {
    const text = `${boat.nom} ${boat.type} ${boat.marque || ''}`.toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesCategory = category === 'ALL' || boat.type === category;
    const matchesStatus = status === 'ALL' || equipmentStatus(boat) === status;
    return matchesQuery && matchesCategory && matchesStatus;
  });

  const openDrawer = (boat = {}) => {
    setForm({
      nom: boat.nom || '',
      type: boat.type || '',
      marque: boat.marque || '',
      internalId: boat.internalId || boat.id || '',
      capaciteMax: boat.capaciteMax || '',
      puissance: boat.puissance || '',
      prixParHeure: boat.prixParHeure || '',
      disponible: boat.disponible !== false,
      permis: boat.permis || 'Selon catégorie',
      description: boat.description || '',
    });
    setDrawer(boat.id ? boat : { id: null });
  };

  const save = async () => {
    const payload = {
      ...form,
      capaciteMax: Number(form.capaciteMax || 0),
      prixParHeure: Number(form.prixParHeure || 0),
      disponible: Boolean(form.disponible),
    };
    try {
      if (drawer?.id) await bateauxAPI.update(drawer.id, payload);
      else await bateauxAPI.create(payload);
      setDrawer(null);
      reload();
    } catch {
      setDrawer(null);
    }
  };

  const retire = async (boat) => {
    const hasBookings = reservations.some((r) => r.bateauId === boat.id);
    const payload = { ...boat, statut: 'RETIRE', disponible: false };
    if (hasBookings) alert('Soft-delete appliqué : des réservations existent, le statut passe à RETIRE.');
    try {
      await bateauxAPI.update(boat.id, payload);
      reload();
    } catch {
      alert('Retrait préparé localement. Le backend doit exposer la règle RETIRE.');
    }
  };

  return (
    <div>
      <PageIntro
        eyebrow="Administration"
        title="Gestion de flotte"
        action={<button className="btn btn-primary" onClick={() => openDrawer()}>+ Ajouter un équipement</button>}
      >
        Inventaire, disponibilité, photos, tarifs et historique technique.
      </PageIntro>

      <div className="toolbar card">
        <input placeholder="Rechercher un équipement" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option>ALL</option><option>ACTIVE</option><option>HORS_SERVICE</option><option>RETIRE</option></select>
        <div className="segmented"><button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>Table</button><button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}>Grid</button></div>
      </div>

      {view === 'table' ? (
        <div className="card responsive-table">
          <table>
            <thead><tr><th>Photo</th><th>Désignation</th><th>Catégorie</th><th>Modèle</th><th>ID interne</th><th>Capacité</th><th>Statut</th><th>Tarif</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((boat) => (
                <tr key={boat.id}>
                  <td><img className="thumb" src={heroImage} alt="" /></td>
                  <td><strong>{boat.nom}</strong></td>
                  <td>{boat.type || '-'}</td>
                  <td>{boat.marque || boat.model || '-'}</td>
                  <td className="font-mono">{boat.internalId || boat.id?.slice?.(-6) || '-'}</td>
                  <td>{boat.capaciteMax || 0}</td>
                  <td><span className={`badge ${statusBadge(equipmentStatus(boat))}`}>{equipmentStatus(boat)}</span></td>
                  <td>{money(boat.prixParHeure)}/h</td>
                  <td><div className="action-row"><button onClick={() => openDrawer(boat)}>Edit</button><button>Photos</button><button>Tarifs</button><button>Tech</button><button onClick={() => retire(boat)}>Retire</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="equipment-grid">
          {filtered.map((boat) => (
            <article className="equipment-card" key={boat.id}>
              <img src={heroImage} alt="" />
              <div><span className={`badge ${statusBadge(equipmentStatus(boat))}`}>{equipmentStatus(boat)}</span><h3>{boat.nom}</h3><p>{boat.type} · {boat.capaciteMax || 0} pers.</p><strong>{money(boat.prixParHeure)}/h</strong></div>
              <button className="btn btn-secondary" onClick={() => openDrawer(boat)}>Gérer</button>
            </article>
          ))}
        </div>
      )}

      {drawer && (
        <div className="drawer-backdrop" onClick={(e) => e.target === e.currentTarget && setDrawer(null)}>
          <aside className="side-drawer">
            <div className="section-head"><h2>{drawer.id ? 'Modifier équipement' : 'Nouvel équipement'}</h2><button onClick={() => setDrawer(null)}>Fermer</button></div>
            <div className="drawer-section"><h3>Informations générales</h3><label>Nom<input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></label><label>Catégorie<input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></label><label>Marque / modèle<input value={form.marque} onChange={(e) => setForm({ ...form, marque: e.target.value })} /></label></div>
            <div className="drawer-section"><h3>Specs techniques</h3><label>ID interne<input value={form.internalId} onChange={(e) => setForm({ ...form, internalId: e.target.value })} /></label><label>Capacité<input type="number" value={form.capaciteMax} onChange={(e) => setForm({ ...form, capaciteMax: e.target.value })} /></label><label>Puissance<input value={form.puissance} onChange={(e) => setForm({ ...form, puissance: e.target.value })} /></label></div>
            <div className="drawer-section"><h3>Usage & tarifs</h3><label>Permis requis<input value={form.permis} onChange={(e) => setForm({ ...form, permis: e.target.value })} /></label><label>Tarif de base / heure<input type="number" value={form.prixParHeure} onChange={(e) => setForm({ ...form, prixParHeure: e.target.value })} /></label><label className="check-row"><input type="checkbox" checked={form.disponible} onChange={(e) => setForm({ ...form, disponible: e.target.checked })} /> Disponible</label></div>
            <div className="drawer-section"><h3>Description commerciale</h3><textarea rows="5" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="drawer-section"><h3>Galerie photos</h3><div className="photo-strip"><img src={heroImage} alt="" /><button>Définir primaire</button><button>Ajouter</button></div></div>
            <button className="btn btn-primary" onClick={save}>Sauvegarder</button>
          </aside>
        </div>
      )}
    </div>
  );
}

export function AdminUsers() {
  const { clients, reservations } = useFleetData();
  const [tab, setTab] = useState('personnel');
  const [query, setQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const currentEmail = JSON.parse(localStorage.getItem('user_profile') || '{}')?.email;

  const filteredClients = clients.filter((client) => `${client.nomComplet} ${client.email || ''} ${client.telephone || ''}`.toLowerCase().includes(query.toLowerCase()));
  const statsFor = (clientId) => {
    const rows = reservations.filter((r) => r.clientId === clientId);
    return {
      count: rows.length,
      total: rows.reduce((sum, r) => sum + Number(r.montantTotal || 0), 0),
      last: rows.map((r) => r.dateDebut).sort().at(-1),
    };
  };

  return (
    <div>
      <PageIntro eyebrow="Administration" title="Utilisateurs & clients">
        Gestion des accès du personnel, profils clients, historique et demandes RGPD.
      </PageIntro>
      <div className="tabs"><button className={tab === 'personnel' ? 'active' : ''} onClick={() => setTab('personnel')}>Personnel</button><button className={tab === 'clients' ? 'active' : ''} onClick={() => setTab('clients')}>Clients</button></div>
      {tab === 'personnel' ? (
        <div className="card responsive-table">
          <table>
            <thead><tr><th>Nom</th><th>Email</th><th>Rôles</th><th>Création</th><th>Dernière connexion</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {personnel.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.name}</strong></td><td>{user.email}</td><td>{user.roles.join(', ')}</td><td>{fmtDate(user.createdAt)}</td><td>{fmtDate(user.lastLogin)}</td><td><span className={`badge ${statusBadge(user.status)}`}>{user.status}</span></td>
                  <td><div className="action-row"><button>Edit</button><button>Reset</button><button>Roles</button><button disabled={currentEmail === user.email}>Disable</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="split-grid">
          <div className="card">
            <input placeholder="Rechercher un client" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="client-list">
              {(filteredClients.length ? filteredClients : [{ id: 'demo-client', nomComplet: 'Client Démo', telephone: '+212 600 000 000' }]).map((client) => {
                const s = statsFor(client.id);
                return (
                  <button key={client.id} onClick={() => setSelectedClient(client)}>
                    <strong>{client.nomComplet}</strong><span>{s.count} réservations · {money(s.total)}</span><small>Dernière: {fmtDate(s.last)}</small>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="card detail-card">
            <h2>{selectedClient?.nomComplet || 'Sélectionnez un client'}</h2>
            <p>Historique réservations, paiements, avis soumis et suppression RGPD.</p>
            <div className="timeline">
              {reservations.filter((r) => r.clientId === selectedClient?.id).map((r) => <div key={r.id}><span>{fmtDate(r.dateDebut)}</span><strong>{money(r.montantTotal)}</strong><em>{r.statut}</em></div>)}
            </div>
            <button className="btn btn-secondary">Demande suppression RGPD</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ManagerPlanning() {
  const { boats, clients, reservations, reload } = useFleetData();
  const [date, setDate] = useState(todayKey());
  const [view, setView] = useState('day');
  const [category, setCategory] = useState('ALL');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(null);
  const [drag, setDrag] = useState(null);
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);
  const categories = ['ALL', ...new Set((boats.length ? boats : fallbackEquipment).map((b) => b.type || 'Autre'))];
  const equipment = (boats.length ? boats : fallbackEquipment).filter((b) => (category === 'ALL' || b.type === category) && `${b.nom} ${b.type}`.toLowerCase().includes(query.toLowerCase()));
  const dayReservations = reservations.filter((r) => dateKey(r.dateDebut) === date);

  useEffect(() => {
    const id = setInterval(reload, 30000);
    return () => clearInterval(id);
  }, [reload]);

  const moveDate = (delta) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const blocksFor = (boatId) => dayReservations.filter((r) => r.bateauId === boatId);
  const blockStyle = (r) => {
    const start = new Date(r.dateDebut).getHours() + (new Date(r.dateDebut).getMinutes() / 60);
    const duration = Number(r.nbHeures || 2);
    return { left: `${Math.max(0, (start - 8) / 13) * 100}%`, width: `${Math.max(8, duration / 13 * 100)}%` };
  };

  const dropBooking = (boatId, hour) => {
    if (!drag) return;
    const conflict = dayReservations.some((r) => r.id !== drag.id && r.bateauId === boatId && new Date(r.dateDebut).getHours() === hour);
    if (conflict) alert('Conflit détecté : ce créneau est déjà occupé.');
    else alert(`Réaffectation préparée vers ${hour}:00. Le backend doit valider et persister ce déplacement.`);
    setDrag(null);
  };

  return (
    <div>
      <PageIntro eyebrow="Manager" title="Planning interactif" action={<button className="btn btn-primary" onClick={() => setDraft({ step: 1 })}>+ Nouvelle réservation</button>}>
        Vue opérationnelle avec rafraîchissement automatique toutes les 30 secondes.
      </PageIntro>
      <div className="toolbar card">
        <button onClick={() => moveDate(-1)}>Prev</button><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /><button onClick={() => moveDate(1)}>Next</button>
        <div className="segmented"><button className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}>Jour</button><button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Semaine</button></div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
        <input placeholder="Rechercher" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="planning-shell">
        <div className="card timeline-grid">
          <div className="timeline-header"><span>Équipement</span>{hours.map((h) => <span key={h}>{h}:00</span>)}</div>
          {equipment.map((boat) => (
            <div className="timeline-row" key={boat.id}>
              <strong>{boat.nom}<small>{boat.type}</small></strong>
              <div className="timeline-cells">
                {hours.map((h) => <button key={h} onClick={() => setDraft({ boatId: boat.id, hour: h, step: 1 })} onDragOver={(e) => e.preventDefault()} onDrop={() => dropBooking(boat.id, h)} />)}
                {blocksFor(boat.id).map((r) => (
                  <Link draggable onDragStart={() => setDrag(r)} to={`/manager/reservations/${r.id}`} key={r.id} className={`booking-block ${statusBadge(r.statut)}`} style={blockStyle(r)}>
                    {clients.find((c) => c.id === r.clientId)?.nomComplet || 'Client'} · {r.nbHeures || 2}h
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <aside className="card metrics-panel">
          <h2>Résumé journée</h2>
          <div><span>Total réservations</span><strong>{dayReservations.length}</strong></div>
          <div><span>Occupation</span><strong>{equipment.length ? Math.round((dayReservations.length / equipment.length) * 100) : 0}%</strong></div>
          <div><span>Arrivées &lt; 1h</span><strong>{dayReservations.filter((r) => Math.abs(new Date(r.dateDebut) - new Date()) < 3600000).length}</strong></div>
        </aside>
      </div>
      {draft && <ManualBookingModal initial={draft} onClose={() => setDraft(null)} />}
    </div>
  );
}

function ManualBookingModal({ initial, onClose }) {
  const [step, setStep] = useState(initial.step || 1);
  const [client, setClient] = useState('');
  const [slot, setSlot] = useState({ boatId: initial.boatId || '', hour: initial.hour || 10 });
  const [payment, setPayment] = useState('CMI');
  return (
    <div className="modal-overlay">
      <div className="modal wizard-modal">
        <div className="section-head"><h2>Nouvelle réservation</h2><button onClick={onClose}>Fermer</button></div>
        <div className="stepper"><span className={step >= 1 ? 'active' : ''}>Client</span><span className={step >= 2 ? 'active' : ''}>Créneau</span><span className={step >= 3 ? 'active' : ''}>Paiement</span></div>
        {step === 1 && <div className="drawer-section"><label>Téléphone ou email<input value={client} onChange={(e) => setClient(e.target.value)} placeholder="+212..." /></label><button className="btn btn-primary" onClick={() => setStep(2)} disabled={!client}>Continuer</button></div>}
        {step === 2 && <div className="drawer-section"><label>Équipement<input value={slot.boatId} onChange={(e) => setSlot({ ...slot, boatId: e.target.value })} /></label><label>Heure<input type="number" value={slot.hour} onChange={(e) => setSlot({ ...slot, hour: e.target.value })} /></label><button className="btn btn-primary" onClick={() => setStep(3)}>Continuer</button></div>}
        {step === 3 && <div className="drawer-section"><label>Méthode<select value={payment} onChange={(e) => setPayment(e.target.value)}><option>CMI</option><option>Espèces</option><option>Virement</option></select></label><button className="btn btn-primary" onClick={onClose}>Confirmer</button></div>}
      </div>
    </div>
  );
}

export function ReservationDetail() {
  const { id } = useParams();
  const { boats, clients, reservations } = useFleetData();
  const reservation = id ? reservations.find((r) => String(r.id) === String(id)) : null;
  const [status, setStatus] = useState(reservation?.statut || 'PENDING');

  if (!id || !reservation) return <ManualBookingPage />;
  const client = clients.find((c) => c.id === reservation.clientId);
  const boat = boats.find((b) => b.id === reservation.bateauId);
  const actions = status === 'PENDING' ? ['Confirm', 'Edit', 'Cancel', 'Send Reminder'] : status === 'CONFIRMED' ? ['Start Prestation', 'Add Payment', 'Generate Invoice', 'Cancel'] : ['Complete Prestation', 'Generate Invoice'];

  return (
    <div>
      <PageIntro eyebrow="Réservation" title={`Référence ${reservation.id?.slice?.(-8) || 'BLM-0001'}`}>
        Détail client, service, paiements et journal d'audit.
      </PageIntro>
      <div className="detail-layout">
        <section className="card detail-card"><h2>Client</h2><p>{client?.nomComplet || 'Client'}<br />{client?.telephone || '+212...'}</p></section>
        <section className="card detail-card"><h2>Service</h2><p>{boat?.nom || 'Équipement'}<br />{fmtDate(reservation.dateDebut)} · {reservation.nbHeures || 2}h</p></section>
        <section className="card detail-card"><h2>Tarification</h2><p>Total {money(reservation.montantTotal)}<br />Payé {money(reservation.montantPaye)}<br />Reste {money(reservation.montantRestant)}</p></section>
        <section className="card detail-card"><h2>Paiement</h2><span className={`badge ${statusBadge(status)}`}>{status}</span></section>
      </div>
      <div className="card action-bar">{actions.map((action) => <button key={action} className="btn btn-secondary" onClick={() => action === 'Confirm' && setStatus('CONFIRMED')}>{action}</button>)}</div>
      <div className="card timeline"><h2>Audit timeline</h2><div><span>{fmtDate(reservation.dateDebut)}</span><strong>Réservation créée</strong><em>{status}</em></div><div><span>Aujourd'hui</span><strong>Consultation manager</strong><em>Journal</em></div></div>
    </div>
  );
}

function ManualBookingPage() {
  return (
    <div>
      <PageIntro eyebrow="Manager" title="Réservation manuelle">Créez une réservation en trois étapes depuis le back-office.</PageIntro>
      <ManualBookingModal initial={{ step: 1 }} onClose={() => window.history.back()} />
    </div>
  );
}

export function CataloguePage() {
  const [equipment, setEquipment] = useState(fallbackEquipment);
  const [filters, setFilters] = useState({ category: 'ALL', date: todayKey(), time: '10:00', group: 2, price: 1500 });
  useEffect(() => { catalogueAPI.getAll().then((res) => { const rows = unwrap(res); if (rows.length) setEquipment(rows); }).catch(() => {}); }, []);
  const categories = ['ALL', ...new Set(equipment.map((item) => item.type || 'Autre'))];
  const filtered = equipment.filter((item) => (filters.category === 'ALL' || item.type === filters.category) && Number(item.capaciteMax || 0) >= Number(filters.group) && Number(item.prixParHeure || 0) <= Number(filters.price));

  return (
    <div className="public-page">
      <PublicHeader />
      <main className="public-main catalogue-page">
        <PageIntro eyebrow="Catalogue" title="Choisissez votre expérience nautique">
          Disponibilités, capacités, tarifs et réservation en quelques étapes.
        </PageIntro>
        <div className="catalogue-layout">
          <aside className="card filter-sidebar">
            <label>Catégorie<select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>Date<input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} /></label>
            <label>Heure<input type="time" value={filters.time} onChange={(e) => setFilters({ ...filters, time: e.target.value })} /></label>
            <label>Taille du groupe<input type="number" min="1" value={filters.group} onChange={(e) => setFilters({ ...filters, group: e.target.value })} /></label>
            <label>Prix max<input type="range" min="250" max="2500" value={filters.price} onChange={(e) => setFilters({ ...filters, price: e.target.value })} /><strong>{money(filters.price)}</strong></label>
          </aside>
          <section className="equipment-grid catalogue">
            {filtered.map((item) => <EquipmentCard key={item.id} item={item} />)}
          </section>
        </div>
      </main>
    </div>
  );
}

function EquipmentCard({ item }) {
  return (
    <article className="equipment-card">
      <img src={heroImage} alt="" />
      <div>
        <span className="badge badge-neutral">{item.type || 'Équipement'}</span>
        <h3>{item.nom}</h3>
        <p>{item.capaciteMax || 2} pers. · {item.puissance || 'Puissance selon modèle'} · ★ {item.note || '4.8'}</p>
        <strong>À partir de {money(item.prixParHeure)}/h</strong>
      </div>
      <div className="card-actions"><Link className="btn btn-secondary" to={`/catalogue/${item.id}`}>Détails</Link><Link className="btn btn-primary" to="/reservation/tunnel">Réserver</Link></div>
    </article>
  );
}

export function CatalogueDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState(fallbackEquipment.find((x) => x.id === id) || fallbackEquipment[0]);
  useEffect(() => { if (id) catalogueAPI.getById(id).then((res) => setItem(res.data)).catch(() => {}); }, [id]);
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="public-main">
        <div className="detail-hero card">
          <img src={heroImage} alt="" />
          <div><span className="badge badge-neutral">{item.type}</span><h1>{item.nom}</h1><p>{item.description || 'Une expérience nautique premium avec briefing sécurité, équipement obligatoire et assistance au départ.'}</p><Link className="btn btn-primary" to="/reservation/tunnel">Choisir un créneau</Link></div>
        </div>
        <div className="detail-layout">
          <div className="card detail-card"><h2>Specs techniques</h2><p>Capacité {item.capaciteMax} pers.<br />Puissance {item.puissance || 'Selon modèle'}<br />Modèle {item.marque || 'Premium'}</p></div>
          <div className="card detail-card"><h2>Règles</h2><p>Briefing obligatoire, caution selon équipement, permis requis pour certaines catégories.</p></div>
          <div className="card detail-card"><h2>Tarifs</h2><p>1h {money(item.prixParHeure)}<br />Demi-journée {money((item.prixParHeure || 0) * 3.5)}<br />Journée {money((item.prixParHeure || 0) * 6)}</p></div>
        </div>
      </main>
    </div>
  );
}

export function ReservationTunnelPage() {
  const [step, setStep] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [timer, setTimer] = useState(600);
  const [form, setForm] = useState({ date: todayKey(), time: '10:00', duration: 2, name: '', email: '', options: 'Skipper', method: 'CMI' });
  const reference = `BLM-${form.date.replaceAll('-', '').slice(2)}-${form.time.replace(':', '')}`;

  useEffect(() => {
    if (confirmed) return undefined;
    const id = setInterval(() => setTimer((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, [confirmed]);

  if (confirmed) {
    return (
      <div className="public-page">
        <PublicHeader />
        <main className="public-main confirmation-page">
          <div className="card confirmation-card"><span className="badge badge-success">Confirmée</span><h1>Réservation {reference}</h1><p>Votre reçu et les instructions pratiques sont prêts.</p><button className="btn btn-secondary">Télécharger le reçu</button><Link className="btn btn-primary" to="/compte/reservations">Voir mon compte</Link></div>
        </main>
      </div>
    );
  }

  return (
    <div className="public-page">
      <PublicHeader />
      <main className="public-main tunnel-layout">
        <section className="card wizard-card">
          <div className="stepper"><span className={step >= 1 ? 'active' : ''}>Créneau</span><span className={step >= 2 ? 'active' : ''}>Client</span><span className={step >= 3 ? 'active' : ''}>Paiement</span></div>
          {step === 1 && <div className="form-grid"><label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>Heure<input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label><label>Durée<input type="number" min="1" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></label><button className="btn btn-primary" onClick={() => setStep(2)}>Continuer</button></div>}
          {step === 2 && <div className="form-grid"><label>Nom complet<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Options<select value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })}><option>Skipper</option><option>Sans option</option><option>Pack groupe</option></select></label><button className="btn btn-primary" onClick={() => setStep(3)}>Continuer</button></div>}
          {step === 3 && <div className="form-grid"><label>Paiement<select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}><option>CMI</option><option>Payer en agence</option></select></label><button className="btn btn-primary" onClick={() => setConfirmed(true)}>Redirection CMI</button><button className="btn btn-secondary" onClick={() => setStep(2)}>Retour</button></div>}
        </section>
        <aside className="sticky-summary card"><span className="badge badge-pending">Verrouillage {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</span><h2>Récapitulatif</h2><p>{form.date} à {form.time}<br />Durée {form.duration}h<br />Option {form.options}</p><strong>{money(Number(form.duration) * 720)}</strong></aside>
      </main>
    </div>
  );
}

export function ClientAccountPage() {
  const { tab = 'reservations' } = useParams();
  const { reservations } = useFleetData();
  const tabs = [['reservations', 'Mes réservations'], ['historique', 'Historique'], ['factures', 'Mes factures'], ['profil', 'Mon profil']];
  const upcoming = reservations.filter((r) => !r.dateDebut || new Date(r.dateDebut) >= new Date());
  const past = reservations.filter((r) => r.dateDebut && new Date(r.dateDebut) < new Date());

  return (
    <div>
      <PageIntro eyebrow="Compte client" title="Espace personnel">
        Réservations, factures, avis et préférences de notification.
      </PageIntro>
      <div className="tabs">{tabs.map(([key, label]) => <Link className={tab === key ? 'active' : ''} to={`/compte/${key}`} key={key}>{label}</Link>)}</div>
      {tab === 'reservations' && <div className="reservation-cards">{(upcoming.length ? upcoming : [{ id: 'demo', dateDebut: new Date(), nbHeures: 2, montantTotal: 1440, statut: 'CONFIRMED' }]).map((r) => <ReservationCard key={r.id} reservation={r} />)}</div>}
      {tab === 'historique' && <div className="reservation-cards">{past.map((r) => <ReservationCard key={r.id} reservation={r} past />)}<div className="card review-card"><h2>Soumettre un avis</h2><textarea rows="4" placeholder="Votre retour après une prestation terminée" /><button className="btn btn-primary">Publier</button></div></div>}
      {tab === 'factures' && <div className="card responsive-table"><table><thead><tr><th>Facture</th><th>Date</th><th>Montant</th><th></th></tr></thead><tbody>{reservations.slice(0, 6).map((r, i) => <tr key={r.id || i}><td>FAC-{i + 1}</td><td>{fmtDate(r.dateDebut)}</td><td>{money(r.montantTotal)}</td><td><button>Télécharger PDF</button></td></tr>)}</tbody></table></div>}
      {tab === 'profil' && <div className="card form-card"><h2>Profil</h2><div className="form-grid"><label>Nom<input defaultValue="Client Blue Lagoon" /></label><label>Email<input defaultValue="client@example.com" /></label><label>Téléphone<input defaultValue="+212 600 000 000" /></label><label>Nouveau mot de passe<input type="password" /></label></div><label className="check-row"><input type="checkbox" defaultChecked /> Notifications email</label><label className="check-row"><input type="checkbox" /> Notifications SMS</label><button className="btn btn-primary">Sauvegarder</button><button className="btn btn-secondary">Demande suppression compte</button></div>}
    </div>
  );
}

function ReservationCard({ reservation, past = false }) {
  return (
    <article className="reservation-card card">
      <div><span className={`badge ${statusBadge(reservation.statut)}`}>{reservation.statut || 'CONFIRMED'}</span><h3>{fmtDate(reservation.dateDebut)}</h3><p>{reservation.nbHeures || 2}h · {money(reservation.montantTotal)}</p></div>
      <div className="card-actions"><button className="btn btn-secondary">Facture</button>{past ? <button className="btn btn-primary">Avis</button> : <button className="btn btn-secondary">Calendrier</button>}<button className="btn btn-secondary">Annuler</button></div>
    </article>
  );
}

export function TechFleetPage() {
  const { boats } = useFleetData();
  const rows = boats.length ? boats : fallbackEquipment;
  return (
    <div>
      <PageIntro eyebrow="Technicien" title="Flotte technique">
        Suivi maintenance, indisponibilités et historique d'intervention.
      </PageIntro>
      <div className="equipment-grid">
        {rows.map((boat) => (
          <article className="equipment-card" key={boat.id}>
            <img src={heroImage} alt="" />
            <div><span className={`badge ${statusBadge(equipmentStatus(boat))}`}>{equipmentStatus(boat)}</span><h3>{boat.nom}</h3><p>Prochaine maintenance préventive dans 12 jours.</p></div>
            <button className="btn btn-primary">Ouvrir fiche tech</button>
          </article>
        ))}
      </div>
    </div>
  );
}
