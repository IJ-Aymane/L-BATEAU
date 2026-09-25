import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api, { bateauxAPI, catalogueAPI, clientsAPI, reservationsAPI, usersAPI } from '../api';
import { getStoredUser, hasValidToken } from '../auth';

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

const isClientAccount = (user) => {
  const roles = user?.roles || [];
  return roles.length === 1 && roles.includes('ROLE_CLIENT');
};

const hasValue = (value) => value !== undefined && value !== null && value !== '';
const boatImages = (item) => {
  const urls = Array.isArray(item?.imageUrls) ? item.imageUrls.filter(Boolean) : [];
  return Array.from(new Set([...urls, item?.imageUrl, item?.photoUrl, item?.photo, item?.image].filter(Boolean)));
};
const boatImage = (item) => boatImages(item)[0] || '';
const priceLabel = (value) => hasValue(value) ? `${money(value)}/h` : 'Tarif non renseigné';
const bookingPath = (suffix = '') => {
  const destination = `/reservation/tunnel${suffix}`;
  return hasValidToken() ? destination : `/creer-compte?redirect=${encodeURIComponent(destination)}`;
};

const readImageAsDataUrl = (file) => new Promise((resolve, reject) => {
  if (!file) {
    resolve('');
    return;
  }
  if (!file.type.startsWith('image/')) {
    reject(new Error('Veuillez choisir une image valide.'));
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const maxSize = 1200;
    const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(objectUrl);
    resolve(canvas.toDataURL('image/jpeg', 0.78));
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('Impossible de lire cette image.'));
  };
  image.src = objectUrl;
});

const asciiText = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\x20-\x7E]/g, ' ');

const escapePdfText = (value) => asciiText(value)
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

const buildPdf = (lines) => {
  const content = [
    'BT',
    '/F1 18 Tf',
    '50 800 Td',
    `(Blue Lagoon Marine) Tj`,
    '/F1 11 Tf',
    '0 -28 Td',
    ...lines.flatMap((line) => [`(${escapePdfText(line)}) Tj`, '0 -18 Td']),
    'ET',
  ].join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
    `4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += object;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

const downloadInvoicePdf = ({ reservation = {}, client = {}, boat = {}, reference, title = 'Facture' } = {}) => {
  const ref = reference || reservation.id || `BLM-${Date.now()}`;
  const lines = [
    `${title} ${ref}`,
    `Date edition: ${new Date().toLocaleDateString('fr-FR')}`,
    '',
    `Client: ${client.nomComplet || reservation.clientName || '-'}`,
    `Telephone: ${client.telephone || '-'}`,
    `Email: ${client.email || '-'}`,
    '',
    `Reservation: ${ref}`,
    `Date prestation: ${fmtDate(reservation.dateDebut)}`,
    `Bateau: ${boat.nom || reservation.bateauNom || '-'}`,
    `Duree: ${reservation.nbHeures || reservation.nombreHeures || reservation.duration || '-'}h`,
    `Statut: ${reservation.statut || '-'}`,
    '',
    `Montant total: ${money(reservation.montantTotal)}`,
    `Montant paye: ${money(reservation.montantPaye)}`,
    `Montant restant: ${money(reservation.montantRestant)}`,
    '',
    'Merci pour votre confiance.',
  ];
  downloadBlob(buildPdf(lines), `${asciiText(title).toLowerCase().replace(/\s+/g, '-')}-${asciiText(ref)}.pdf`);
};


function BrandLogo({ className = '' }) {
  return <img className={`brand-logo ${className}`.trim()} src="/img/logo.png" alt="Blue Lagoon Marine" />;
}

function PublicHeader() {
  return (
    <header className="public-header">
      <Link className="public-brand" to="/" aria-label="Blue Lagoon Marine">
        <BrandLogo />
      </Link>
      <nav className="public-nav">
        <Link to="/">Accueil</Link>
        <Link to="/catalogue">Catalogue</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/creer-compte">Créer compte</Link>
        <Link className="btn btn-primary btn-sm" to="/connexion">Se connecter</Link>
      </nav>
    </header>
  );
}

function EmptyState({ title = 'Aucune donnée', message = 'Les informations apparaîtront ici dès qu’elles seront enregistrées.' }) {
  return <div className="empty-state"><p><strong>{title}</strong></p><p>{message}</p></div>;
}

function BoatImage({ item, className = '', alt = '' }) {
  const [failedSrc, setFailedSrc] = useState('');
  const src = boatImage(item);

  if (!src || failedSrc === src) {
    return <div className={`image-placeholder ${className}`.trim()} role="img" aria-label="Aucune photo"><span>Photo</span></div>;
  }

  return <img className={className} src={src} alt={alt} onError={() => setFailedSrc(src)} />;
}

function BoatGallery({ item }) {
  const images = boatImages(item);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(new Set());
  const visibleImages = images.filter((src) => !failed.has(src));
  const currentIndex = visibleImages.length ? Math.min(active, visibleImages.length - 1) : 0;
  const current = visibleImages[currentIndex];

  const markFailed = (src) => setFailed((prev) => new Set([...prev, src]));
  const go = (direction) => {
    if (!visibleImages.length) return;
    setActive((prev) => (prev + direction + visibleImages.length) % visibleImages.length);
  };

  if (!current) {
    return <div className="boat-gallery"><div className="image-placeholder"><span>Photo</span></div></div>;
  }

  return (
    <div className="boat-gallery">
      <div className="boat-gallery-main">
        <img src={current} alt={`${item?.nom || 'Bateau'} photo ${currentIndex + 1}`} onError={() => markFailed(current)} />
        {visibleImages.length > 1 && <span>{currentIndex + 1}/{visibleImages.length}</span>}
        {visibleImages.length > 1 && <button type="button" className="gallery-prev" onClick={() => go(-1)} aria-label="Photo précédente">‹</button>}
        {visibleImages.length > 1 && <button type="button" className="gallery-next" onClick={() => go(1)} aria-label="Photo suivante">›</button>}
      </div>
      {visibleImages.length > 1 && (
        <div className="boat-gallery-thumbs" aria-label="Photos du bateau">
          {visibleImages.map((src, index) => (
            <button type="button" key={`${src}-${index}`} className={index === currentIndex ? 'active' : ''} onClick={() => setActive(index)}>
              <img src={src} alt={`${item?.nom || 'Bateau'} miniature ${index + 1}`} onError={() => markFailed(src)} />
            </button>
          ))}
        </div>
      )}
    </div>
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
          boats: b.status === 'fulfilled' ? unwrap(b.value) : [],
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

export function HomePage() {
  const gallery = [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1100&q=80',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1100&q=80',
    'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1100&q=80',
  ];

  return (
    <div className="public-page home-page">
      <PublicHeader />
      <section className="home-hero">
        <video autoPlay muted loop playsInline poster="/img/auth-hero.png">
          <source src="https://videos.pexels.com/video-files/3765078/3765078-uhd_2560_1440_30fps.mp4" type="video/mp4" />
        </video>
        <div className="home-hero-copy">
          <span className="eyebrow">Blue Lagoon Marine</span>
          <h1>Location de bateaux, réservations et aventures en mer.</h1>
          <p>Une expérience nautique propre, rapide et élégante: flotte, créneaux, factures et accès client dans un seul espace.</p>
          <div className="home-actions">
            <Link className="btn btn-primary" to={bookingPath()}>Réserver maintenant</Link>
            <Link className="btn btn-secondary" to="/catalogue">Voir les bateaux</Link>
          </div>
        </div>
      </section>

      <main className="public-main home-content">
        <section className="home-welcome">
          <div>
            <span className="eyebrow">Bienvenue</span>
            <h2>Votre base nautique digitale</h2>
            <p>Réservez un bateau, confirmez un créneau, suivez vos factures et profitez d'une gestion claire pour les clients comme pour l'équipe.</p>
          </div>
          <div className="home-stat-row">
            <div><strong>20%</strong><span>TVA facture</span></div>
            <div><strong>24h</strong><span>Planning lisible</span></div>
            <div><strong>PDF</strong><span>Factures prêtes</span></div>
          </div>
        </section>

        <section className="home-media-grid">
          {gallery.map((src, index) => <img key={src} src={src} alt={`Expérience nautique ${index + 1}`} />)}
        </section>

        <section className="home-split">
          <div>
            <span className="eyebrow">Expérience</span>
            <h2>Mer, bateau, planning et facture dans le même flux.</h2>
            <p>Le client choisit son bateau et son horaire. L'équipe garde la main sur les réservations manuelles, l'avance, le reste à payer et l'impression de facture.</p>
            <Link className="btn btn-primary" to={bookingPath()}>Créer un compte et réserver</Link>
          </div>
          <video controls poster="/img/auth-hero.png">
            <source src="https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_30fps.mp4" type="video/mp4" />
          </video>
        </section>
      </main>
    </div>
  );
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
            <div className="contact-detail"><span>Adresse</span><strong>Marina Smir M’diq 93200</strong></div>
            <div className="contact-detail"><span>Téléphone</span><strong><a href="tel:+212647002326">0647002326</a></strong></div>
            <div className="contact-detail"><span>Email</span><strong><a href="mailto:Yassin.abdelmalek93@gmail.com">Yassin.abdelmalek93@gmail.com</a></strong></div>
            <div className="contact-detail"><span>Horaires</span><strong>09:00 - 03:00, 7j/7</strong></div>
            <div className="social-row">
              <a href="https://www.instagram.com/yassinabicha.yachts?stkn=MXhzOHBhanEwc2Q3dA%3D%3D&utm_source=qr" target="_blank" rel="noreferrer">Instagram</a>
              <a href="https://maps.app.goo.gl/5wkNuXPNYbfqtvFt8?g_st=iw" target="_blank" rel="noreferrer">Google Maps</a>
              <a href="https://share.google/Julkvd1TaLe9EWotG" target="_blank" rel="noreferrer">Localisation</a>
            </div>
            <div className="map-panel map-link-panel" aria-label="Localisation Blue Lagoon Marine">
              <span>Marina Smir M’diq</span>
              <strong>Base de départ Blue Lagoon Marine</strong>
              <a className="btn btn-secondary btn-sm" href="https://maps.app.goo.gl/5wkNuXPNYbfqtvFt8?g_st=iw" target="_blank" rel="noreferrer">Ouvrir l'itinéraire</a>
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
          {reservations.length ? <div className="trend-chart">
            {trend.map((day) => (
              <span key={day.key} style={{ height: `${Math.max(8, Math.min(100, day.bookings * 18 + day.revenue / 500))}%` }} title={`${fmtDate(day.key)} - ${day.bookings} réservations`} />
            ))}
          </div> : <EmptyState title="Aucune tendance" message="Les réservations enregistrées alimenteront ce graphique." />}
        </div>
        <div className="card chart-card">
          <h2>Répartition équipements</h2>
          <div className="donut-list">
            {categories.length ? categories.map(([label, count]) => (
              <div key={label}><span>{label}</span><strong>{count}</strong></div>
            )) : null}
          </div>
          {!categories.length && <EmptyState title="Aucun équipement" message="Ajoutez des équipements pour voir la répartition." />}
        </div>
      </section>

      <section className="dashboard-grid bottom">
        <div className="card">
          <div className="section-head"><h2>Réservations du jour</h2><Link to="/manager/planning">Planning</Link></div>
          <div className="responsive-table">
            <table>
              <thead><tr><th>Heure</th><th>Client</th><th>Équipement</th><th>Durée</th><th>Statut</th><th>Montant</th></tr></thead>
              <tbody>
                {todays.map((r) => (
                  <tr key={r.id || `${r.clientId}-${r.dateDebut}`}>
                    <td>{fmtTime(r.dateDebut)}</td>
                    <td>{clients.find((c) => c.id === r.clientId)?.nomComplet || r.clientName || r.username || '-'}</td>
                    <td>{boats.find((b) => b.id === r.bateauId)?.nom || r.bateauNom || '-'}</td>
                    <td>{r.nbHeures || '-'}h</td>
                    <td><span className={`badge ${statusBadge(r.statut)}`}>{r.statut || '-'}</span></td>
                    <td>{money(r.montantTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!todays.length && <EmptyState title="Aucune réservation aujourd’hui" message="Les réservations confirmées du jour apparaîtront ici." />}
          </div>
        </div>
        <div className="card alerts-panel">
          <h2>Alertes</h2>
          {unavailable.length === 0 && pending.length === 0 ? <EmptyState title="Aucune alerte" message="Tout est à jour avec les données actuelles." /> : <>
            {unavailable.length > 0 && <p><span className="badge badge-danger">{unavailable.length}</span> équipement(s) en maintenance ou retrait.</p>}
            {pending.length > 0 && <p><span className="badge badge-pending">{pending.length}</span> paiement(s) à relancer.</p>}
          </>}
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

  const categories = ['ALL', ...new Set(boats.map((b) => b.type || 'Autre'))];
  const filtered = boats.filter((boat) => {
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
      permis: boat.permis || '',
      description: boat.description || '',
      statut: boat.statut || (boat.disponible === false ? 'HORS_SERVICE' : 'ACTIVE'),
      imageUrls: boatImages(boat),
      imageUrl: boatImage(boat),
    });
    setDrawer(boat.id ? boat : { id: null });
  };

  const save = async () => {
    const payload = {
      ...form,
      capaciteMax: Number(form.capaciteMax || 0),
      prixParHeure: Number(form.prixParHeure || 0),
      disponible: Boolean(form.disponible),
      imageUrls: form.imageUrls || [],
      imageUrl: (form.imageUrls || [])[0] || '',
      statut: form.statut || (form.disponible ? 'ACTIVE' : 'HORS_SERVICE'),
    };
    try {
      if (drawer?.id) await bateauxAPI.update(drawer.id, payload);
      else await bateauxAPI.create(payload);
      setDrawer(null);
      reload();
    } catch (err) {
      alert(err.userMessage || 'Impossible de sauvegarder cet équipement.');
    }
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    try {
      const uploaded = await Promise.all(files.map(readImageAsDataUrl));
      setForm((prev) => {
        const imageUrls = [...(prev.imageUrls || []), ...uploaded].filter(Boolean);
        return { ...prev, imageUrls, imageUrl: imageUrls[0] || '' };
      });
    } catch (err) {
      alert(err.message || 'Impossible de charger cette image.');
    }
  };

  const removeImage = (index) => {
    setForm((prev) => {
      const imageUrls = (prev.imageUrls || []).filter((_, i) => i !== index);
      return { ...prev, imageUrls, imageUrl: imageUrls[0] || '' };
    });
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

      <div className="toolbar fleet-toolbar card">
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
                  <td><BoatImage className="thumb" item={boat} /></td>
                  <td><strong>{boat.nom}</strong></td>
                  <td>{boat.type || '-'}</td>
                  <td>{boat.marque || boat.model || '-'}</td>
                  <td className="font-mono">{boat.internalId || boat.id?.slice?.(-6) || '-'}</td>
                  <td>{boat.capaciteMax || '-'}</td>
                  <td><span className={`badge ${statusBadge(equipmentStatus(boat))}`}>{equipmentStatus(boat)}</span></td>
                  <td>{priceLabel(boat.prixParHeure)}</td>
                  <td><div className="action-row"><button onClick={() => openDrawer(boat)}>Gérer</button><button onClick={() => retire(boat)}>Retirer</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <EmptyState title="Aucun équipement" message="Ajoutez votre flotte depuis le bouton en haut de page." />}
        </div>
      ) : (
        <div className="equipment-grid">
          {!filtered.length && <EmptyState title="Aucun équipement" message="Ajoutez votre flotte depuis le bouton en haut de page." />}
          {filtered.map((boat) => (
            <article className="equipment-card" key={boat.id}>
              <BoatImage item={boat} />
              <div><span className={`badge ${statusBadge(equipmentStatus(boat))}`}>{equipmentStatus(boat)}</span><h3>{boat.nom}</h3><p>{[boat.type, hasValue(boat.capaciteMax) ? `${boat.capaciteMax} pers.` : null].filter(Boolean).join(' · ') || 'Informations à compléter'}</p><strong>{priceLabel(boat.prixParHeure)}</strong></div>
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
            <div className="drawer-section"><h3>Galerie photos</h3><div className="photo-strip multi">{(form.imageUrls || []).length ? form.imageUrls.map((url, index) => <span className="photo-item" key={`${url}-${index}`}><img src={url} alt={`Photo ${index + 1}`} />{index === 0 && <em>Principale</em>}<button type="button" onClick={() => removeImage(index)}>×</button></span>) : <div className="image-placeholder"><span>Photo</span></div>}<label className="btn btn-secondary btn-sm">Ajouter<input type="file" accept="image/*" multiple hidden onChange={handleImageUpload} /></label></div></div>
            <button className="btn btn-primary" onClick={save}>Sauvegarder</button>
          </aside>
        </div>
      )}
    </div>
  );
}

export function AdminUsers() {
  const { clients, reservations } = useFleetData();
  const [tab, setTab] = useState('accounts');
  const [query, setQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [accountForm, setAccountForm] = useState({ username: '', password: '', email: '', telephone: '' });
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');

  const loadUsers = useCallback(() => {
    setUsersLoading(true);
    usersAPI.getAll()
      .then((res) => setUsers(unwrap(res).filter(isClientAccount)))
      .catch((err) => setError(err.userMessage || 'Impossible de charger les comptes client.'))
      .finally(() => setUsersLoading(false));
  }, []);

  useEffect(() => {
    const id = window.setTimeout(loadUsers, 0);
    return () => window.clearTimeout(id);
  }, [loadUsers]);

  const filteredUsers = users.filter((user) => `${user.username} ${user.email || ''} ${user.telephone || ''}`.toLowerCase().includes(query.toLowerCase()));
  const filteredClients = clients.filter((client) => `${client.nomComplet} ${client.email || ''} ${client.telephone || ''}`.toLowerCase().includes(query.toLowerCase()));

  const statsFor = (clientId) => {
    const rows = reservations.filter((r) => r.clientId === clientId);
    return {
      count: rows.length,
      total: rows.reduce((sum, r) => sum + Number(r.montantTotal || 0), 0),
      last: rows.map((r) => r.dateDebut).sort().at(-1),
    };
  };

  const usernameFromClient = (client) => {
    const base = (client.nomComplet || client.telephone || 'client')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.|\.$/g, '') || 'client';
    return base.slice(0, 28);
  };

  const prepareClientAccount = (client = selectedClient) => {
    if (!client) return;
    setTab('accounts');
    setNotice('');
    setError('');
    setAccountForm({
      username: usernameFromClient(client),
      password: '',
      email: client.email || '',
      telephone: client.telephone || '',
    });
  };

  const createAccount = async (event) => {
    event.preventDefault();
    setNotice('');
    setError('');
    if (!accountForm.username.trim() || accountForm.password.length < 6) {
      setError('Username et mot de passe de 6 caractères minimum sont obligatoires.');
      return;
    }
    try {
      await usersAPI.create({ ...accountForm, username: accountForm.username.trim(), roles: ['ROLE_CLIENT'] });
      setNotice(`Compte client ${accountForm.username.trim()} créé. Il peut se connecter à /connexion.`);
      setAccountForm({ username: '', password: '', email: '', telephone: '' });
      loadUsers();
    } catch (err) {
      setError(err.userMessage || 'Impossible de créer ce compte client.');
    }
  };

  const submitPasswordReset = async (event) => {
    event.preventDefault();
    if (!resetTarget || resetPassword.length < 6) return;
    setNotice('');
    setError('');
    try {
      await usersAPI.updatePassword(resetTarget.id, resetPassword);
      setNotice(`Mot de passe mis à jour pour ${resetTarget.username}.`);
      setResetTarget(null);
      setResetPassword('');
    } catch (err) {
      setError(err.userMessage || 'Impossible de mettre à jour le mot de passe.');
    }
  };

  return (
    <div>
      <PageIntro
        eyebrow="Administration"
        title="Comptes clients"
        action={<button className="btn btn-primary" onClick={() => setTab('accounts')}>+ Créer accès client</button>}
      >
        Créez un username et un mot de passe pour donner accès au dashboard client.
      </PageIntro>

      {(notice || error) && <div className={`notice ${error ? 'error' : 'success'}`}>{error || notice}</div>}

      <div className="tabs"><button className={tab === 'accounts' ? 'active' : ''} onClick={() => setTab('accounts')}>Accès</button><button className={tab === 'clients' ? 'active' : ''} onClick={() => setTab('clients')}>Clients</button></div>

      {tab === 'accounts' ? (
        <div className="split-grid">
          <form className="card form-card" onSubmit={createAccount}>
            <h2>Créer un accès client</h2>
            <div className="form-grid">
              <label>Username<input value={accountForm.username} onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })} placeholder="client.nom" required /></label>
              <label>Mot de passe<input type="password" value={accountForm.password} onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })} placeholder="Minimum 6 caractères" required /></label>
              <label>Email<input type="email" value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} /></label>
              <label>Téléphone<input value={accountForm.telephone} onChange={(e) => setAccountForm({ ...accountForm, telephone: e.target.value })} /></label>
            </div>
            <button className="btn btn-primary" type="submit">Créer compte client</button>
          </form>

          <div className="card responsive-table">
            <div className="section-head"><h2>Accès clients</h2><input placeholder="Rechercher" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
            {usersLoading ? <p>Chargement...</p> : <table>
              <thead><tr><th>Username</th><th>Contact</th><th>Rôle</th><th>Création</th><th></th></tr></thead>
              <tbody>{filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.username}</strong></td>
                  <td>{user.email || user.telephone || '-'}</td>
                  <td><span className="badge badge-neutral">Client</span></td>
                  <td>{fmtDate(user.dateCreation)}</td>
                  <td><button onClick={() => setResetTarget(user)}>Mot de passe</button></td>
                </tr>
              ))}</tbody>
            </table>}
          </div>
        </div>
      ) : (
        <div className="split-grid">
          <div className="card">
            <input placeholder="Rechercher un client" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="client-list">
              {filteredClients.map((client) => {
                const s = statsFor(client.id);
                return (
                  <button key={client.id} onClick={() => setSelectedClient(client)}>
                    <strong>{client.nomComplet}</strong><span>{s.count} réservations · {money(s.total)}</span><small>Dernière: {fmtDate(s.last)}</small>
                  </button>
                );
              })}
            </div>
            {!filteredClients.length && <EmptyState title="Aucun client" message="Les clients créés depuis la base apparaîtront ici." />}
          </div>
          <div className="card detail-card">
            <h2>{selectedClient?.nomComplet || 'Sélectionnez un client'}</h2>
            <p>{selectedClient ? 'Historique, solde et accès espace client.' : 'Choisissez un client pour préparer son accès.'}</p>
            <div className="timeline">
              {reservations.filter((r) => r.clientId === selectedClient?.id).map((r) => <div key={r.id}><span>{fmtDate(r.dateDebut)}</span><strong>{money(r.montantTotal)}</strong><em>{r.statut}</em></div>)}
            </div>
            <button className="btn btn-primary" disabled={!selectedClient} onClick={() => prepareClientAccount()}>Préparer accès client</button>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setResetTarget(null)}>
          <form className="modal" onSubmit={submitPasswordReset}>
            <div className="section-head"><h2>Nouveau mot de passe</h2><button type="button" onClick={() => setResetTarget(null)}>Fermer</button></div>
            <p>Compte: <strong>{resetTarget.username}</strong></p>
            <label>Mot de passe<input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} autoFocus /></label>
            <button className="btn btn-primary" disabled={resetPassword.length < 6}>Enregistrer</button>
          </form>
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
  const [drag, setDrag] = useState(null);
  const navigate = useNavigate();
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);
  const categories = ['ALL', ...new Set(boats.map((b) => b.type || 'Autre'))];
  const equipment = boats.filter((b) => (category === 'ALL' || b.type === category) && `${b.nom} ${b.type}`.toLowerCase().includes(query.toLowerCase()));
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
      <PageIntro eyebrow="Manager" title="Planning interactif" action={<Link className="btn btn-primary" to="/manager/reservations/new">+ Nouvelle réservation</Link>}>
        Vue opérationnelle avec rafraîchissement automatique toutes les 30 secondes.
      </PageIntro>
      <div className="toolbar planning-toolbar card">
        <button onClick={() => moveDate(-1)}>Prev</button><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /><button onClick={() => moveDate(1)}>Next</button>
        <div className="segmented"><button className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}>Jour</button><button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Semaine</button></div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
        <input placeholder="Rechercher" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="planning-shell">
        <div className="card timeline-grid">
          <div className="timeline-header"><span>Équipement</span>{hours.map((h) => <span key={h}>{h}:00</span>)}</div>
          {!equipment.length && <EmptyState title="Aucun équipement" message="Le planning sera disponible dès que la flotte est enregistrée." />}
          {equipment.map((boat) => (
            <div className="timeline-row" key={boat.id}>
              <strong>{boat.nom}<small>{boat.type}</small></strong>
              <div className="timeline-cells">
                {hours.map((h) => <button key={h} onClick={() => navigate(`/manager/reservations/new?bateauId=${boat.id}&date=${date}&time=${String(h).padStart(2, '0')}:00`)} onDragOver={(e) => e.preventDefault()} onDrop={() => dropBooking(boat.id, h)} />)}
                {blocksFor(boat.id).map((r) => (
                  <Link draggable onDragStart={() => setDrag(r)} to={`/manager/reservations/${r.id}`} key={r.id} className={`booking-block ${statusBadge(r.statut)}`} style={blockStyle(r)}>
                    {clients.find((c) => c.id === r.clientId)?.nomComplet || r.clientName || r.username || '-'} · {r.nbHeures || '-'}h
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
    </div>
  );
}

function ReservationForm({ initial = {}, compact = false, onCreated }) {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [boats, setBoats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [invoice, setInvoice] = useState(null);
  const [created, setCreated] = useState(null);
  const [form, setForm] = useState({
    userId: initial.userId || searchParams.get('userId') || '',
    bateauId: initial.boatId || initial.bateauId || searchParams.get('bateauId') || '',
    date: initial.date || searchParams.get('date') || todayKey(),
    time: initial.time || searchParams.get('time') || (initial.hour ? `${String(initial.hour).padStart(2, '0')}:00` : '10:00'),
    nombreHeures: initial.nombreHeures || 2,
    montantAvance: initial.montantAvance || 0,
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.allSettled([reservationsAPI.getUsers(), bateauxAPI.getAll()])
      .then(([u, b]) => {
        if (!active) return;
        const userRows = u.status === 'fulfilled' ? unwrap(u.value) : [];
        const boatRows = b.status === 'fulfilled' ? unwrap(b.value) : [];
        setUsers(userRows);
        setBoats(boatRows);
        setForm((prev) => ({
          ...prev,
          userId: prev.userId || userRows[0]?.id || '',
          bateauId: prev.bateauId || boatRows[0]?.id || '',
        }));
        if (u.status === 'rejected') setError(u.reason?.userMessage || 'Impossible de charger les clients.');
        else if (b.status === 'rejected') setError(b.reason?.userMessage || 'Impossible de charger les bateaux.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const selectedBoat = boats.find((boat) => String(boat.id) === String(form.bateauId));
  const hours = Math.max(1, Number(form.nombreHeures || 1));
  const prixHT = Number(selectedBoat?.prixParHeure || 0) * hours;
  const tva = prixHT * 0.2;
  const totalTTC = prixHT + tva;
  const avance = Math.max(0, Math.min(Number(form.montantAvance || 0), totalTTC));
  const reste = Math.max(0, totalTTC - avance);
  const canSubmit = Boolean(form.userId && form.bateauId && form.date && form.time && hours > 0 && !submitting && !loading);

  const setField = (field, value) => {
    setError('');
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    setCreated(null);
    setInvoice(null);

    try {
      const payload = {
        userId: form.userId,
        bateauId: form.bateauId,
        dateDebut: `${form.date}T${form.time}:00`,
        nombreHeures: hours,
        montantAvance: avance,
      };
      const res = await reservationsAPI.create(payload);
      const saved = res.data;
      setCreated(saved);
      const invoiceRes = await reservationsAPI.getInvoice(saved.id);
      setInvoice(invoiceRes.data);
      onCreated?.(saved, invoiceRes.data);
    } catch (err) {
      setError(err.userMessage || 'Créneau indisponible pour ce bateau.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`reservation-form-layout ${compact ? 'compact' : ''}`}>
      <form className="card form-card reservation-form" onSubmit={submit}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Réservation</span>
            <h2>Nouvelle réservation</h2>
          </div>
          {created && <span className="badge badge-success">{created.statut}</span>}
        </div>
        {error && <div className="notice error" role="alert">{error}</div>}
        <div className="form-grid two">
          <label>Client
            <select value={form.userId} onChange={(e) => setField('userId', e.target.value)} disabled={loading} required>
              <option value="">Sélectionner un client</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.username}</option>)}
            </select>
          </label>
          <label>Bateau
            <select value={form.bateauId} onChange={(e) => setField('bateauId', e.target.value)} disabled={loading} required>
              <option value="">Sélectionner un bateau</option>
              {boats.map((boat) => <option key={boat.id} value={boat.id}>{boat.nom} · {priceLabel(boat.prixParHeure)}</option>)}
            </select>
          </label>
          <label>Date
            <input type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} required />
          </label>
          <label>Heure
            <input type="time" value={form.time} onChange={(e) => setField('time', e.target.value)} required />
          </label>
          <label>Combien d'heures
            <input type="number" min="1" max="24" value={form.nombreHeures} onChange={(e) => setField('nombreHeures', e.target.value)} required />
          </label>
          <label>Avance
            <input type="number" min="0" max={Math.ceil(totalTTC)} value={form.montantAvance} onChange={(e) => setField('montantAvance', e.target.value)} />
          </label>
        </div>
        <button className="btn btn-primary" disabled={!canSubmit}>{submitting ? 'Création...' : 'Créer la réservation'}</button>
      </form>

      <aside className="card price-breakdown">
        <h2>Calcul facture</h2>
        {selectedBoat && <p>{selectedBoat.nom} · {money(selectedBoat.prixParHeure)} / heure</p>}
        <div><span>Total HT</span><strong>{money(prixHT)}</strong></div>
        <div><span>TVA 20%</span><strong>{money(tva)}</strong></div>
        <div><span>Total TTC</span><strong>{money(totalTTC)}</strong></div>
        <div><span>Avance</span><strong>{money(avance)}</strong></div>
        <div><span>Reste</span><strong>{money(reste)}</strong></div>
      </aside>

      {invoice && <InvoicePanel invoice={invoice} onPrint={() => window.print()} />}
    </div>
  );
}

function ManualBookingPage() {
  return (
    <div>
      <PageIntro eyebrow="Manager" title="Réservation manuelle">Un seul formulaire pour sélectionner le client, le bateau, le créneau, l'avance et générer la facture.</PageIntro>
      <ReservationForm />
    </div>
  );
}

export function ReservationDetail() {
  const { id } = useParams();
  const { boats, clients, reservations } = useFleetData();
  const reservation = id ? reservations.find((r) => String(r.id) === String(id)) : null;
  const [status, setStatus] = useState(reservation?.statut || 'PENDING');

  if (!id || !reservation) return <ManualBookingPage />;
  const client = clients.find((c) => c.id === reservation.clientId) || { nomComplet: reservation.clientName || reservation.username, telephone: reservation.userTelephone };
  const boat = boats.find((b) => b.id === reservation.bateauId) || { nom: reservation.bateauNom, type: reservation.bateauType };
  const actions = status === 'PENDING' ? ['Confirm', 'Edit', 'Cancel', 'Send Reminder'] : status === 'CONFIRMED' ? ['Start Prestation', 'Add Payment', 'Generate Invoice', 'Cancel'] : ['Complete Prestation', 'Generate Invoice'];

  return (
    <div>
      <PageIntro eyebrow="Réservation" title={`Référence ${reservation.id?.slice?.(-8) || '-'}`}>
        Détail client, service, paiements et journal d'audit.
      </PageIntro>
      <div className="detail-layout">
        <section className="card detail-card"><h2>Client</h2><p>{client?.nomComplet || '-'}<br />{client?.telephone || '-'}</p></section>
        <section className="card detail-card"><h2>Service</h2><p>{boat?.nom || '-'}<br />{fmtDate(reservation.dateDebut)} · {reservation.nbHeures || '-'}h</p></section>
        <section className="card detail-card"><h2>Tarification</h2><p>Total {money(reservation.montantTotal)}<br />Payé {money(reservation.montantPaye)}<br />Reste {money(reservation.montantRestant)}</p></section>
        <section className="card detail-card"><h2>Paiement</h2><span className={`badge ${statusBadge(status)}`}>{status}</span></section>
      </div>
      <div className="card action-bar">{actions.map((action) => <button key={action} className="btn btn-secondary" onClick={() => { if (action === 'Confirm') setStatus('CONFIRMED'); if (action === 'Generate Invoice') downloadInvoicePdf({ reservation: { ...reservation, statut: status }, client, boat }); }}>{action}</button>)}</div>
      <div className="card timeline"><h2>Audit timeline</h2><div><span>{fmtDate(reservation.dateDebut)}</span><strong>Réservation créée</strong><em>{status}</em></div><div><span>Aujourd'hui</span><strong>Consultation manager</strong><em>Journal</em></div></div>
    </div>
  );
}

export function CataloguePage() {
  const [equipment, setEquipment] = useState([]);
  const [filters, setFilters] = useState({ category: 'ALL', date: todayKey(), time: '10:00', group: 1, price: 10000 });
  useEffect(() => { catalogueAPI.getAll().then((res) => { const rows = unwrap(res); if (rows.length) setEquipment(rows); }).catch(() => {}); }, []);
  const categories = ['ALL', ...new Set(equipment.map((item) => item.type || 'Autre'))];
  const filtered = equipment.filter((item) => {
    const matchesCategory = filters.category === 'ALL' || item.type === filters.category;
    const matchesCapacity = !filters.group || !hasValue(item.capaciteMax) || Number(item.capaciteMax) >= Number(filters.group);
    const matchesPrice = !filters.price || !hasValue(item.prixParHeure) || Number(item.prixParHeure) <= Number(filters.price);
    return matchesCategory && matchesCapacity && matchesPrice;
  });

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
            <label>Prix max<input type="range" min="250" max="10000" step="250" value={filters.price} onChange={(e) => setFilters({ ...filters, price: e.target.value })} /><strong>{money(filters.price)}</strong></label>
          </aside>
          <section className="equipment-grid catalogue">
            {!filtered.length && <EmptyState title="Catalogue vide" message="Aucun équipement disponible dans la base de données." />}
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
      <BoatImage item={item} />
      <div>
        <span className="badge badge-neutral">{item.type || 'Équipement'}</span>
        <h3>{item.nom}</h3>
        <p>{[
          hasValue(item.capaciteMax) ? `${item.capaciteMax} pers.` : null,
          item.puissance || null,
          hasValue(item.note) ? `Note ${item.note}` : null,
        ].filter(Boolean).join(' · ') || 'Informations à compléter'}</p>
        <strong>{priceLabel(item.prixParHeure)}</strong>
      </div>
      <div className="card-actions"><Link className="btn btn-secondary" to={`/catalogue/${item.id}`}>Détails</Link><Link className="btn btn-primary" to={bookingPath(`?bateauId=${item.id}`)}>Réserver</Link></div>
    </article>
  );
}

export function CatalogueDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  useEffect(() => { if (id) catalogueAPI.getById(id).then((res) => setItem(res.data)).catch(() => {}); }, [id]);
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="public-main">
        {!item ? <EmptyState title="Équipement introuvable" message="Aucune donnée n’est disponible pour cet équipement." /> : <>
          <div className="detail-hero card">
            <BoatGallery key={item.id} item={item} />
            <div><span className="badge badge-neutral">{item.type || 'Équipement'}</span><h1>{item.nom}</h1><p>{item.description || 'Description non renseignée.'}</p><Link className="btn btn-primary" to={bookingPath(`?bateauId=${item.id}`)}>Choisir un créneau</Link></div>
          </div>
          <div className="detail-layout">
            <div className="card detail-card"><h2>Specs techniques</h2><p>Capacité {item.capaciteMax || '-'} pers.<br />Puissance {item.puissance || '-'}<br />Modèle {item.marque || '-'}</p></div>
            <div className="card detail-card"><h2>Règles</h2><p>{item.permis || 'Règles non renseignées.'}</p></div>
            <div className="card detail-card"><h2>Tarifs</h2><p>{hasValue(item.prixParHeure) ? <>1h {money(item.prixParHeure)}<br />Demi-journée {money(Number(item.prixParHeure) * 3.5)}<br />Journée {money(Number(item.prixParHeure) * 6)}</> : 'Tarifs non renseignés.'}</p></div>
          </div>
        </>}
      </main>
    </div>
  );
}

function InvoicePanel({ invoice, onPrint }) {
  if (!invoice) return null;
  const startDate = fmtDate(invoice.dateDebut);
  const startTime = fmtTime(invoice.dateDebut);
  const endTime = fmtTime(invoice.dateFin);

  return (
    <section className="card invoice-panel">
      <div className="section-head invoice-head">
        <div>
          <span className="eyebrow">Facture</span>
          <h2>{invoice.reference || 'Facture réservation'}</h2>
          <p>Blue Lagoon Marine · ICE 003082242000034</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={onPrint}>Imprimer</button>
      </div>

      <div className="invoice-meta">
        <div><span>Client</span><strong>{invoice.client?.username || '-'}</strong><p>{invoice.client?.email || invoice.client?.telephone || '-'}</p></div>
        <div><span>Bateau</span><strong>{invoice.bateau?.nom || '-'}</strong><p>{invoice.bateau?.type || invoice.bateau?.marque || '-'}</p></div>
        <div><span>Statut paiement</span><strong>{invoice.paymentStatus || 'PENDING'}</strong><p>{invoice.statut || '-'}</p></div>
      </div>

      <div className="invoice-table-wrap">
        <table className="invoice-table">
          <thead><tr><th>Désignation</th><th>Unité</th><th>Qte</th><th>P.U</th><th>Montants</th></tr></thead>
          <tbody>
            <tr>
              <td><strong>Location du bateau</strong><br />Date: {startDate}<br />Horaire: {startTime}-{endTime}</td>
              <td>H</td>
              <td>{invoice.nombreHeures}</td>
              <td>{money(invoice.prixParHeure)}</td>
              <td>{money(invoice.subtotal)}</td>
            </tr>
            <tr><td colSpan="4"><strong>Total HT</strong></td><td>{money(invoice.subtotal)}</td></tr>
            <tr><td colSpan="4"><strong>TVA 20%</strong></td><td>{money(invoice.tva)}</td></tr>
            <tr><td colSpan="4"><strong>Total TTC</strong></td><td>{money(invoice.totalPrice)}</td></tr>
            <tr><td colSpan="4"><strong>Avance</strong></td><td>{money(invoice.montantAvance)}</td></tr>
            <tr><td colSpan="4"><strong>Reste</strong></td><td>{money(invoice.montantRestant)}</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ReservationTunnelPage() {
  const [searchParams] = useSearchParams();
  const currentUser = getStoredUser();
  const [boats, setBoats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reservation, setReservation] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [form, setForm] = useState({
    bateauId: searchParams.get('bateauId') || '',
    date: todayKey(),
    time: '10:00',
    nombreHeures: 2,
    montantAvance: 0,
  });
  const queryString = searchParams.toString();
  const redirectTarget = `/reservation/tunnel${queryString ? `?${queryString}` : ''}`;

  useEffect(() => {
    setLoading(true);
    catalogueAPI.getAll()
      .then((res) => {
        const rows = unwrap(res);
        setBoats(rows);
        setForm((prev) => ({
          ...prev,
          bateauId: prev.bateauId || rows[0]?.id || '',
        }));
      })
      .catch((err) => setError(err.userMessage || 'Impossible de charger les bateaux.'))
      .finally(() => setLoading(false));
  }, []);

  const selectedBoat = boats.find((boat) => String(boat.id) === String(form.bateauId));
  const hours = Math.max(1, Number(form.nombreHeures || 1));
  const prixHT = Number(selectedBoat?.prixParHeure || 0) * hours;
  const tva = prixHT * 0.2;
  const pricePreview = prixHT + tva;
  const avance = Math.max(0, Math.min(Number(form.montantAvance || 0), pricePreview));
  const reste = Math.max(0, pricePreview - avance);
  const canSubmit = Boolean(currentUser?.id && form.bateauId && form.date && form.time && hours > 0 && !submitting);

  const setField = (field, value) => {
    setError('');
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setReservation(null);
    setInvoice(null);

    if (!currentUser?.id) {
      setError('Connectez-vous de nouveau pour créer une réservation client.');
      return;
    }
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const payload = {
        userId: currentUser.id,
        bateauId: form.bateauId,
        dateDebut: `${form.date}T${form.time}:00`,
        nombreHeures: hours,
        montantAvance: avance,
      };
      const created = await reservationsAPI.create(payload);
      const savedReservation = created.data;
      setReservation(savedReservation);
      const invoiceRes = await reservationsAPI.getInvoice(savedReservation.id);
      setInvoice(invoiceRes.data);
    } catch (err) {
      setError(err.userMessage || 'Ce bateau est indisponible sur le créneau sélectionné.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="public-page">
      <PublicHeader />
      <main className="public-main tunnel-layout booking-layout">
        <section className="card wizard-card booking-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Réservation</span>
              <h1>Choisir un créneau</h1>
            </div>
            {reservation && <span className="badge badge-success">{reservation.statut}</span>}
          </div>

          {error && <div className="notice error" role="alert">{error}</div>}
          {!currentUser?.id && (
            <div className="notice error guest-booking-notice">
              <span>Créez un compte client ou connectez-vous pour confirmer cette réservation.</span>
              <div className="notice-actions">
                <Link className="btn btn-primary btn-sm" to={`/creer-compte?redirect=${encodeURIComponent(redirectTarget)}`}>Créer un compte</Link>
                <Link className="btn btn-secondary btn-sm" to="/connexion">Se connecter</Link>
              </div>
            </div>
          )}

          <form className="form-grid" onSubmit={submit}>
            <label>Bateau
              <select value={form.bateauId} onChange={(e) => setField('bateauId', e.target.value)} disabled={loading} required>
                <option value="">Sélectionner un bateau</option>
                {boats.map((boat) => (
                  <option key={boat.id} value={boat.id}>
                    {boat.nom} · {boat.type || 'Bateau'} · {priceLabel(boat.prixParHeure)}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-grid two">
              <label>Date de départ
                <input type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} required />
              </label>
              <label>Heure de départ
                <input type="time" value={form.time} onChange={(e) => setField('time', e.target.value)} required />
              </label>
            </div>

            <div className="form-grid two">
              <label>Nombre d'heures
                <input type="number" min="1" max="24" value={form.nombreHeures} onChange={(e) => setField('nombreHeures', e.target.value)} required />
              </label>
              <label>Avance
                <input type="number" min="0" max={Math.ceil(pricePreview)} value={form.montantAvance} onChange={(e) => setField('montantAvance', e.target.value)} />
              </label>
            </div>

            <div className="price-preview">
              <span>Total TTC estimé</span>
              <strong>{money(pricePreview)}</strong>
              <small>{selectedBoat ? `${money(selectedBoat.prixParHeure)} x ${hours}h + TVA 20%` : 'Choisissez un bateau pour calculer le prix.'}</small>
              <div><span>HT</span><strong>{money(prixHT)}</strong></div>
              <div><span>TVA</span><strong>{money(tva)}</strong></div>
              <div><span>Avance</span><strong>{money(avance)}</strong></div>
              <div><span>Reste</span><strong>{money(reste)}</strong></div>
            </div>

            <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
              {submitting ? 'Création...' : 'Confirmer la réservation'}
            </button>
          </form>
        </section>

        <aside className="sticky-summary card booking-summary">
          {selectedBoat ? <>
            <BoatImage item={selectedBoat} />
            <h2>{selectedBoat.nom}</h2>
            <p>{selectedBoat.type || '-'} · {selectedBoat.capaciteMax || '-'} pers.</p>
            <div><span>Tarif horaire</span><strong>{money(selectedBoat.prixParHeure)}</strong></div>
            <div><span>Durée</span><strong>{hours}h</strong></div>
            <div><span>Total TTC</span><strong>{money(pricePreview)}</strong></div>
            <div><span>Avance</span><strong>{money(avance)}</strong></div>
            <div><span>Reste</span><strong>{money(reste)}</strong></div>
          </> : <EmptyState title="Aucun bateau" message="Ajoutez des bateaux disponibles dans la base." />}
        </aside>

        {invoice && <InvoicePanel invoice={invoice} onPrint={() => window.print()} />}
      </main>
    </div>
  );
}

export function ClientAccountPage() {
  const { tab = 'reservations' } = useParams();
  const currentUser = getStoredUser();
  const { boats, clients, reservations: allReservations } = useFleetData();
  const [userReservations, setUserReservations] = useState([]);
  const tabs = [['reservations', 'Mes réservations'], ['historique', 'Historique'], ['factures', 'Mes factures'], ['profil', 'Mon profil']];
  const userReservationKeys = useMemo(() => [...new Set([
    currentUser?.id,
    currentUser?._id,
    currentUser?.userId,
    currentUser?.clientId,
    currentUser?.username,
    currentUser?.email,
  ].filter(Boolean).map(String))], [
    currentUser?.id,
    currentUser?._id,
    currentUser?.userId,
    currentUser?.clientId,
    currentUser?.username,
    currentUser?.email,
  ]);
  const reservationLookupKey = userReservationKeys.join('|');

  useEffect(() => {
    if (!userReservationKeys.length) {
      const id = window.setTimeout(() => setUserReservations([]), 0);
      return () => window.clearTimeout(id);
    }

    let active = true;
    const loadReservations = async () => {
      for (const key of userReservationKeys) {
        try {
          const rows = unwrap(await reservationsAPI.getByUser(key));
          if (!active) return;
          if (rows.length || key === userReservationKeys[userReservationKeys.length - 1]) {
            setUserReservations(rows);
            return;
          }
        } catch {
          // Try the next identifier shape returned by Mongo/JWT payloads.
        }
      }
      if (active) setUserReservations([]);
    };

    loadReservations();
    return () => { active = false; };
  }, [reservationLookupKey, userReservationKeys]);

  const belongsToCurrentUser = (reservation) => {
    if (!userReservationKeys.length) return false;
    return [
      reservation.userId,
      reservation.clientId,
      reservation.user?.id,
      reservation.user?._id,
      reservation.client?.id,
      reservation.client?._id,
      reservation.username,
      reservation.userName,
      reservation.userEmail,
      reservation.email,
    ].filter(Boolean).map(String).some((value) => userReservationKeys.includes(value));
  };
  const fallbackReservations = currentUser ? allReservations.filter(belongsToCurrentUser) : allReservations;
  const reservations = currentUser ? (userReservations.length ? userReservations : fallbackReservations) : allReservations;
  const upcoming = reservations.filter((r) => !r.dateDebut || new Date(r.dateDebut) >= new Date());
  const past = reservations.filter((r) => r.dateDebut && new Date(r.dateDebut) < new Date());
  const clientFor = (reservation) => clients.find((client) => client.id === reservation.clientId) || { nomComplet: reservation.clientName || reservation.username, email: reservation.userEmail, telephone: reservation.userTelephone };
  const boatFor = (reservation) => boats.find((boat) => boat.id === reservation.bateauId) || { nom: reservation.bateauNom, type: reservation.bateauType };

  return (
    <div>
      <PageIntro
        eyebrow="Compte client"
        title="Espace personnel"
        action={<Link className="btn btn-primary" to="/catalogue">Nouvelle réservation</Link>}
      >
        Réservations, factures, avis et préférences de notification.
      </PageIntro>
      <div className="tabs">{tabs.map(([key, label]) => <Link className={tab === key ? 'active' : ''} to={`/compte/${key}`} key={key}>{label}</Link>)}</div>
      {tab === 'reservations' && (
        <div className="reservation-cards">
          {!upcoming.length ? <ReservationEmptyState /> : upcoming.map((r) => <ReservationCard key={r.id} reservation={r} client={clientFor(r)} boat={boatFor(r)} />)}
        </div>
      )}
      {tab === 'historique' && <div className="reservation-cards">{!past.length && <EmptyState title="Aucun historique" message="Les prestations terminées apparaîtront ici." />}{past.map((r) => <ReservationCard key={r.id} reservation={r} client={clientFor(r)} boat={boatFor(r)} />)}</div>}
      {tab === 'factures' && <div className="card responsive-table"><table><thead><tr><th>Facture</th><th>Date</th><th>Montant</th><th></th></tr></thead><tbody>{reservations.map((r, i) => <tr key={r.id || i}><td>FAC-{i + 1}</td><td>{fmtDate(r.dateDebut)}</td><td>{money(r.montantTotal)}</td><td><button onClick={() => downloadInvoicePdf({ reservation: r, client: clientFor(r), boat: boatFor(r), reference: `FAC-${i + 1}` })}>Télécharger PDF</button></td></tr>)}</tbody></table>{!reservations.length && <EmptyState title="Aucune facture" message="Les factures seront disponibles après une réservation." />}</div>}
      {tab === 'profil' && <div className="card form-card"><h2>Profil</h2><EmptyState title="Profil non chargé" message="Les informations du compte connecté apparaîtront ici quand l’API profil sera disponible." /></div>}
    </div>
  );
}

function ReservationEmptyState() {
  return (
    <div className="card empty-reservations">
      <span className="badge badge-neutral">Mes réservations</span>
      <h2>Aucune réservation active</h2>
      <p>Choisissez un équipement dans le catalogue pour créer votre prochaine sortie nautique.</p>
      <div className="card-actions">
        <Link className="btn btn-primary" to="/catalogue">Réserver maintenant</Link>
        <Link className="btn btn-secondary" to="/reservation/tunnel">Ouvrir le tunnel</Link>
      </div>
    </div>
  );
}

function ReservationCard({ reservation, client = {}, boat = {} }) {
  return (
    <article className="reservation-card card">
      <div><span className={`badge ${statusBadge(reservation.statut)}`}>{reservation.statut || '-'}</span><h3>{fmtDate(reservation.dateDebut)}</h3><p>{reservation.nbHeures || '-'}h · {money(reservation.montantTotal)}</p></div>
      <div className="card-actions"><button className="btn btn-secondary" onClick={() => downloadInvoicePdf({ reservation, client, boat })}>Facture</button></div>
    </article>
  );
}

export function TechFleetPage() {
  const { boats } = useFleetData();
  const rows = boats;
  return (
    <div>
      <PageIntro eyebrow="Technicien" title="Flotte technique">
        Suivi maintenance, indisponibilités et historique d'intervention.
      </PageIntro>
      <div className="equipment-grid">
        {!rows.length && <EmptyState title="Aucun équipement" message="Les données techniques apparaîtront après création de la flotte." />}
        {rows.map((boat) => (
          <article className="equipment-card" key={boat.id}>
            <BoatImage item={boat} />
            <div><span className={`badge ${statusBadge(equipmentStatus(boat))}`}>{equipmentStatus(boat)}</span><h3>{boat.nom}</h3><p>{boat.description || 'Aucune note technique enregistrée.'}</p></div>
            <button className="btn btn-primary">Ouvrir fiche tech</button>
          </article>
        ))}
      </div>
    </div>
  );
}
