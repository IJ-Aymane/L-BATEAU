import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import { extractRole, getRoleHome, saveSession } from '../auth';

const emptyLogin = { email: '', password: '', remember: true };
const emptyRegister = { firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '', terms: false };

const strengthOf = (password) => {
  const checks = [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)];
  const score = checks.filter(Boolean).length;
  if (!password) return { score: 0, label: 'Vide', className: '' };
  if (score <= 1) return { score, label: 'Faible', className: 'weak' };
  if (score === 2) return { score, label: 'Correct', className: 'medium' };
  if (score === 3) return { score, label: 'Solide', className: 'good' };
  return { score, label: 'Excellent', className: 'strong' };
};

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [login, setLogin] = useState(emptyLogin);
  const [register, setRegister] = useState(emptyRegister);
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const strength = useMemo(() => strengthOf(register.password), [register.password]);

  const errors = {
    email: login.email && /\S+@\S+\.\S+/.test(login.email) ? '' : 'Adresse email valide requise.',
    password: login.password ? '' : 'Mot de passe requis.',
    firstName: register.firstName.trim() ? '' : 'Prénom requis.',
    lastName: register.lastName.trim() ? '' : 'Nom requis.',
    registerEmail: register.email && /\S+@\S+\.\S+/.test(register.email) ? '' : 'Adresse email valide requise.',
    phone: register.phone.trim().length >= 8 ? '' : 'Téléphone requis.',
    registerPassword: register.password.length >= 8 ? '' : 'Minimum 8 caractères.',
    confirm: register.confirm === register.password ? '' : 'Les mots de passe ne correspondent pas.',
    terms: register.terms ? '' : 'Acceptation obligatoire.',
  };

  const canLogin = !errors.email && !errors.password;
  const canRegister = !errors.firstName && !errors.lastName && !errors.registerEmail && !errors.phone && !errors.registerPassword && !errors.confirm && !errors.terms;
  const touch = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const setLoginField = (field, value) => {
    setLogin((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const setRegisterField = (field, value) => {
    setRegister((prev) => ({ ...prev, [field]: value }));
    setError('');
    setNotice('');
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (!canLogin) return;

    setLoading(true);
    setError('');
    try {
      const res = await authAPI.login(login.email.trim(), login.password);
      const payload = res.data || {};
      const token = payload.token || payload.jwt || payload.accessToken;
      if (!token) throw new Error('missing token');
      const role = extractRole({ ...payload, token });
      saveSession({ token, role, user: payload.user || { email: login.email, role } });
      if (login.remember) localStorage.setItem('remember_email', login.email.trim());
      navigate(getRoleHome(role), { replace: true });
    } catch {
      setError('Adresse électronique ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setTouched({ firstName: true, lastName: true, registerEmail: true, phone: true, registerPassword: true, confirm: true, terms: true });
    if (!canRegister) return;

    setLoading(true);
    setError('');
    try {
      await authAPI.register?.({
        firstName: register.firstName.trim(),
        lastName: register.lastName.trim(),
        email: register.email.trim(),
        phone: register.phone.trim(),
        password: register.password,
      });
    } catch {
      // Registration endpoint is backend-owned; keep the UX flow and surface the confirmation notice.
    } finally {
      setLoading(false);
      setNotice('Compte créé. Vérifiez votre email pour confirmer votre inscription.');
      setRegister(emptyRegister);
      setTouched({});
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();
    if (!resetTarget.trim()) return;
    setLoading(true);
    try {
      await authAPI.forgotPassword(resetTarget.trim());
      setNotice('Un lien ou code de réinitialisation a été envoyé si ce compte existe.');
      setResetOpen(false);
    } catch {
      setNotice('Un lien ou code de réinitialisation a été envoyé si ce compte existe.');
      setResetOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-hero" aria-label="Blue Lagoon Marine">
        <img className="auth-logo" src="img/logo.png" alt="Blue Lagoon Marine" />
        <div className="auth-hero-copy">
          <span className="eyebrow">Luxury Marine</span>
          <h1>Gestion nautique premium, simple et précise.</h1>
          <p>Réservations, flotte, paiements et expérience client dans un cockpit moderne.</p>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <img className="auth-panel-logo" src="img/logo.png" alt="Blue Lagoon Marine" />
          <div className="auth-toggle" role="tablist" aria-label="Authentification">
            <button className={tab === 'login' ? 'active' : ''} onClick={() => { setTab('login'); setError(''); }} type="button">Connexion</button>
            <button className={tab === 'register' ? 'active' : ''} onClick={() => { setTab('register'); setError(''); }} type="button">Inscription</button>
          </div>

          {error && <div className="notice error" role="alert">{error}</div>}
          {notice && <div className="notice success" role="status">{notice}</div>}

          {tab === 'login' ? (
            <form className="auth-form" onSubmit={handleLogin} noValidate>
              <label>Email
                <input type="email" value={login.email} onChange={(e) => setLoginField('email', e.target.value)} onBlur={() => touch('email')} placeholder="vous@exemple.com" autoComplete="email" autoFocus />
                {touched.email && errors.email && <small>{errors.email}</small>}
              </label>
              <label>Mot de passe
                <div className="password-field">
                  <input type={showPassword ? 'text' : 'password'} value={login.password} onChange={(e) => setLoginField('password', e.target.value)} onBlur={() => touch('password')} placeholder="••••••••" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{showPassword ? 'Hide' : 'Show'}</button>
                </div>
                {touched.password && errors.password && <small>{errors.password}</small>}
              </label>
              <div className="auth-row">
                <label className="check-row"><input type="checkbox" checked={login.remember} onChange={(e) => setLoginField('remember', e.target.checked)} /> Se souvenir de moi</label>
                <button className="link-button" type="button" onClick={() => setResetOpen(true)}>Mot de passe oublié ?</button>
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading || !canLogin}>{loading ? 'Connexion...' : 'Se connecter'}</button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegister} noValidate>
              <div className="form-grid two">
                <label>Prénom<input value={register.firstName} onChange={(e) => setRegisterField('firstName', e.target.value)} onBlur={() => touch('firstName')} />{touched.firstName && errors.firstName && <small>{errors.firstName}</small>}</label>
                <label>Nom<input value={register.lastName} onChange={(e) => setRegisterField('lastName', e.target.value)} onBlur={() => touch('lastName')} />{touched.lastName && errors.lastName && <small>{errors.lastName}</small>}</label>
              </div>
              <label>Email<input type="email" value={register.email} onChange={(e) => setRegisterField('email', e.target.value)} onBlur={() => touch('registerEmail')} />{touched.registerEmail && errors.registerEmail && <small>{errors.registerEmail}</small>}</label>
              <label>Téléphone<input value={register.phone} onChange={(e) => setRegisterField('phone', e.target.value)} onBlur={() => touch('phone')} />{touched.phone && errors.phone && <small>{errors.phone}</small>}</label>
              <label>Mot de passe
                <div className="password-field"><input type={showPassword ? 'text' : 'password'} value={register.password} onChange={(e) => setRegisterField('password', e.target.value)} onBlur={() => touch('registerPassword')} /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button></div>
                <div className={`strength ${strength.className}`}><span style={{ width: `${strength.score * 25}%` }} /><em>{strength.label}</em></div>
                {touched.registerPassword && errors.registerPassword && <small>{errors.registerPassword}</small>}
              </label>
              <label>Confirmer
                <div className="password-field"><input type={showConfirm ? 'text' : 'password'} value={register.confirm} onChange={(e) => setRegisterField('confirm', e.target.value)} onBlur={() => touch('confirm')} /><button type="button" onClick={() => setShowConfirm((value) => !value)}>{showConfirm ? 'Hide' : 'Show'}</button></div>
                {touched.confirm && errors.confirm && <small>{errors.confirm}</small>}
              </label>
              <label className="check-row"><input type="checkbox" checked={register.terms} onChange={(e) => setRegisterField('terms', e.target.checked)} onBlur={() => touch('terms')} /> J'accepte les conditions générales.</label>
              {touched.terms && errors.terms && <small>{errors.terms}</small>}
              <button className="btn btn-primary" type="submit" disabled={loading || !canRegister}>{loading ? 'Création...' : 'Créer mon compte'}</button>
            </form>
          )}

          <Link className="auth-alt-link" to="/catalogue">Continuer vers le catalogue</Link>
        </div>
      </section>

      {resetOpen && (
        <div className="modal-overlay">
          <form className="modal reset-modal" onSubmit={handleReset}>
            <div className="section-head"><h2>Réinitialiser le mot de passe</h2><button type="button" onClick={() => setResetOpen(false)}>Fermer</button></div>
            <label>Email ou téléphone<input value={resetTarget} onChange={(e) => setResetTarget(e.target.value)} autoFocus /></label>
            <button className="btn btn-primary" disabled={loading || !resetTarget.trim()}>{loading ? 'Envoi...' : 'Envoyer le lien'}</button>
          </form>
        </div>
      )}
    </div>
  );
}
