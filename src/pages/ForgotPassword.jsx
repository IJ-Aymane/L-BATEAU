import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

export default function ForgotPassword() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [loading, setLoading]           = useState(false);
  const [sent, setSent]                 = useState(false);
  const [error, setError]               = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailOrPhone) { setError('Entrez votre email ou téléphone'); return; }
    setLoading(true);
    setError('');
    try {
      await authAPI.forgotPassword(emailOrPhone);
      setSent(true);
    } catch {
      setError('Erreur serveur, réessayez.');
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
          <div className="login-brand-sub">Réinitialisation</div>
        </div>

        {sent ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              color: 'var(--green)',
              padding: '14px',
              borderRadius: '8px',
              fontSize: '13px',
              textAlign: 'center'
            }}>
              ✅ Code envoyé ! Vérifiez votre boîte mail.
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => navigate('/reset-password')}
            >
              Entrer le code →
            </button>
            <button
              className="btn btn-ghost"
              style={{ width: '100%' }}
              onClick={() => navigate('/login')}
            >
              Retour au login
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label>Email ou téléphone</label>
              <input
                type="text"
                value={emailOrPhone}
                onChange={e => setEmailOrPhone(e.target.value)}
                placeholder="admin@example.com"
                autoFocus
              />
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', marginTop: '4px' }}
            >
              {loading ? 'Envoi...' : 'Envoyer le code'}
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%' }}
              onClick={() => navigate('/login')}
            >
              ← Retour au login
            </button>
          </form>
        )}

      </div>
    </div>
  );
}