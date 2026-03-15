import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) { setError('Remplir tous les champs'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.login(username, password);
      localStorage.setItem('jwt_token', res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.status === 401 ? 'Identifiants incorrects' : 'Erreur serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-brand">
          <span className="login-brand-icon">⚓</span>
          <div className="login-brand-name">L'BATEAU</div>
          <div className="login-brand-sub">Management System</div>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          {error && <div className="error-msg">{error}</div>}

          <div className="form-group">
            <label>Nom d'utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: '4px' }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          {/* Forgot password link */}
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <Link
              to="/forgot-password"
              style={{
                fontSize: '12px',
                color: 'var(--muted)',
                textDecoration: 'none',
                letterSpacing: '0.3px',
              }}
              onMouseOver={e => e.target.style.color = 'var(--accent)'}
              onMouseOut={e => e.target.style.color = 'var(--muted)'}
            >
              Mot de passe oublié ?
            </Link>
          </div>
        </form>

      </div>
    </div>
  );
}