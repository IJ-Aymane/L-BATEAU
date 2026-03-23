import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

export default function ForgotPassword() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [loading, setLoading]           = useState(false);
  const [sent, setSent]                 = useState(false);
  const [error, setError]               = useState('');
  const [fieldError, setFieldError]     = useState('');
  const [retryAfter, setRetryAfter]     = useState(0); // rate-limit countdown
  const navigate = useNavigate();

  // ── Field-level validation ────────────────────────────────
  const validate = (value) => {
    if (!value.trim()) return 'Ce champ est obligatoire.';
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const isPhone = /^[\d\s+\-().]{8,15}$/.test(value);
    if (!isEmail && !isPhone) return 'Entrez un email valide ou un numéro de téléphone.';
    return '';
  };

  const handleChange = (e) => {
    setEmailOrPhone(e.target.value);
    if (fieldError) setFieldError(validate(e.target.value));
    if (error) setError('');
  };

  const handleBlur = () => {
    setFieldError(validate(emailOrPhone));
  };

  // ── Rate-limit countdown ──────────────────────────────────
  const startCountdown = (seconds) => {
    setRetryAfter(seconds);
    const interval = setInterval(() => {
      setRetryAfter(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErr = validate(emailOrPhone);
    if (validationErr) { setFieldError(validationErr); return; }
    if (retryAfter > 0) return;

    setLoading(true);
    setError('');
    setFieldError('');

    try {
      await authAPI.forgotPassword(emailOrPhone);
      setSent(true);
    } catch (err) {
      const status = err.response?.status;

      if (!err.response) {
        // Network / server unreachable
        setError('Impossible de contacter le serveur. Vérifiez votre connexion internet.');
      } else if (status === 429) {
        // Too many requests
        const wait = err.response?.data?.retryAfter || 60;
        startCountdown(wait);
        setError(`Trop de tentatives. Réessayez dans ${wait} secondes.`);
      } else if (status === 400) {
        setFieldError(err.response?.data?.message || 'Format invalide.');
      } else if (status >= 500) {
        setError('Erreur serveur. Veuillez réessayer dans quelques instants.');
      } else {
        setError('Une erreur inattendue s\'est produite.');
      }
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
              ✅ Code envoyé ! Vérifiez votre boîte mail ou vos SMS.
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', margin: 0 }}>
              Vous n'avez rien reçu ?{' '}
              <button
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, fontSize: '12px' }}
                onClick={() => setSent(false)}
              >
                Renvoyer
              </button>
            </p>
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
          <form className="login-form" onSubmit={handleSubmit} noValidate>

            {/* Global error */}
            {error && (
              <div className="error-msg" role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="emailOrPhone">Email ou téléphone</label>
              <input
                id="emailOrPhone"
                type="text"
                value={emailOrPhone}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="admin@example.com"
                autoFocus
                autoComplete="email"
                aria-invalid={!!fieldError}
                aria-describedby={fieldError ? 'emailOrPhone-error' : undefined}
                style={{ borderColor: fieldError ? 'var(--red, #ef4444)' : undefined }}
              />
              {/* Field-level error */}
              {fieldError && (
                <span
                  id="emailOrPhone-error"
                  role="alert"
                  style={{ color: 'var(--red, #ef4444)', fontSize: '12px', marginTop: '4px', display: 'block' }}
                >
                  {fieldError}
                </span>
              )}
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading || retryAfter > 0}
              style={{ width: '100%', marginTop: '4px' }}
            >
              {loading
                ? 'Envoi en cours...'
                : retryAfter > 0
                  ? `Réessayer dans ${retryAfter}s`
                  : 'Envoyer le code'}
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