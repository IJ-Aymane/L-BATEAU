import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

export default function ResetPassword() {
  const [code, setCode]               = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm]         = useState('');
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);
  const [error, setError]             = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code || !newPassword || !confirm) { setError('Remplir tous les champs'); return; }
    if (newPassword !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    if (newPassword.length < 6) { setError('Mot de passe trop court (6 caractères min)'); return; }

    setLoading(true);
    setError('');
    try {
      await authAPI.resetPassword(code, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Code invalide ou expiré.');
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
          <div className="login-brand-sub">Nouveau mot de passe</div>
        </div>

        {success ? (
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
              ✅ Mot de passe changé avec succès !
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => navigate('/login')}
            >
              Se connecter →
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label>Code reçu par email</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                autoFocus
                style={{ letterSpacing: '6px', fontSize: '20px', textAlign: 'center' }}
              />
            </div>

            <div className="form-group">
              <label>Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label>Confirmer le mot de passe</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', marginTop: '4px' }}
            >
              {loading ? 'Enregistrement...' : 'Changer le mot de passe'}
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%' }}
              onClick={() => navigate('/forgot-password')}
            >
              ← Renvoyer un code
            </button>
          </form>
        )}

      </div>
    </div>
  );
}