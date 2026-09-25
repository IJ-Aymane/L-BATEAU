import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import { extractRole, getRoleHome, saveSession } from '../auth';

const emptyLogin = { username: '', password: '', remember: true };

export default function Login() {
  const navigate = useNavigate();
  const [login, setLogin] = useState(() => ({
    ...emptyLogin,
    username: localStorage.getItem('remember_username') || '',
  }));
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const errors = {
    username: login.username.trim() ? '' : 'Nom d\'utilisateur requis.',
    password: login.password ? '' : 'Mot de passe requis.',
  };

  const canLogin = !errors.username && !errors.password;

  const touch = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const setLoginField = (field, value) => {
    setLogin((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setTouched({ username: true, password: true });
    if (!canLogin) return;

    setLoading(true);
    setError('');
    setNotice('');

    try {
      const res = await authAPI.login(login.username.trim(), login.password);
      const payload = res.data || {};
      const token = payload.token || payload.jwt || payload.accessToken;
      if (!token) throw new Error('missing token');

      const role = extractRole({ ...payload, token });
      saveSession({
        token,
        role,
        remember: login.remember,
        user: payload.user || {
          id: payload.id || payload.userId,
          username: payload.username || login.username.trim(),
          email: payload.email,
          telephone: payload.telephone,
          roles: payload.roles || [],
          role,
        },
      });

      if (login.remember) localStorage.setItem('remember_username', login.username.trim());
      else localStorage.removeItem('remember_username');

      navigate(getRoleHome(role), { replace: true });
    } catch {
      setError('Nom d\'utilisateur ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();
    if (!resetTarget.trim()) return;

    setLoading(true);
    setError('');

    try {
      await authAPI.forgotPassword(resetTarget.trim());
    } catch {
      // Keep account existence private; users get the same response either way.
    } finally {
      setLoading(false);
      setNotice('Un lien ou code de réinitialisation a été envoyé si ce compte existe.');
      setResetOpen(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-hero" aria-label="Blue Lagoon Marine">
        <img className="auth-logo" src="/img/logo.png" alt="Logo" />
        <div className="auth-hero-copy">
          <span className="eyebrow">Luxury Marine</span>
          <h1>Gestion nautique premium, simple et précise.</h1>
          <p>Réservations, flotte, paiements et expérience client dans un cockpit moderne.</p>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card login-only-card">
          <img className="auth-panel-logo" src="/img/logo.png" alt="Logo" />
          <div className="auth-card-heading">
            <span className="eyebrow">Connexion</span>
            <h2>Accès sécurisé</h2>
            <p>Connectez-vous avec votre nom d'utilisateur et votre mot de passe.</p>
          </div>

          {error && <div className="notice error" role="alert">{error}</div>}
          {notice && <div className="notice success" role="status">{notice}</div>}

          <form className="auth-form" onSubmit={handleLogin} noValidate>
            <label>Nom d'utilisateur
              <input
                type="text"
                name="username"
                value={login.username}
                onChange={(event) => setLoginField('username', event.target.value)}
                onBlur={() => touch('username')}
                placeholder="admin"
                autoComplete="username"
                autoFocus
              />
              {touched.username && errors.username && <small>{errors.username}</small>}
            </label>

            <label>Mot de passe
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={login.password}
                  onChange={(event) => setLoginField('password', event.target.value)}
                  onBlur={() => touch('password')}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {touched.password && errors.password && <small>{errors.password}</small>}
            </label>

            <div className="auth-row">
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={login.remember}
                  onChange={(event) => setLoginField('remember', event.target.checked)}
                />
                Se souvenir de moi
              </label>
              <button className="link-button" type="button" onClick={() => setResetOpen(true)}>
                Mot de passe oublié ?
              </button>
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading || !canLogin}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </section>

      {resetOpen && (
        <div className="modal-overlay">
          <form className="modal reset-modal" onSubmit={handleReset}>
            <div className="section-head">
              <h2>Réinitialiser le mot de passe</h2>
              <button type="button" onClick={() => setResetOpen(false)}>Fermer</button>
            </div>
            <label>Nom d'utilisateur ou téléphone
              <input value={resetTarget} onChange={(event) => setResetTarget(event.target.value)} autoFocus />
            </label>
            <button className="btn btn-primary" disabled={loading || !resetTarget.trim()}>
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
