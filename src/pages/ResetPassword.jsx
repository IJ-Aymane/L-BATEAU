import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

// ── Password strength helper ──────────────────────────────
const getStrength = (pwd) => {
  if (!pwd) return null;
  let score = 0;
  if (pwd.length >= 8)              score++;
  if (/[A-Z]/.test(pwd))           score++;
  if (/[0-9]/.test(pwd))           score++;
  if (/[^A-Za-z0-9]/.test(pwd))   score++;
  if (score <= 1) return { level: 'faible',  color: '#ef4444', width: '25%'  };
  if (score === 2) return { level: 'moyen',   color: '#f97316', width: '50%'  };
  if (score === 3) return { level: 'bien',    color: '#eab308', width: '75%'  };
  return                 { level: 'fort',     color: '#22c55e', width: '100%' };
};

export default function ResetPassword() {
  const [code, setCode]               = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm]         = useState('');
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);
  const [error, setError]             = useState('');
  const [fieldErrors, setFieldErrors] = useState({}); // { code, newPassword, confirm }
  const [showPwd, setShowPwd]         = useState(false);
  const [attempts, setAttempts]       = useState(0);
  const navigate = useNavigate();

  const strength = getStrength(newPassword);

  // ── Field-level validators ────────────────────────────────
  const validators = {
    code: (v) => {
      if (!v.trim()) return 'Le code est obligatoire.';
      if (!/^\d{6}$/.test(v.trim())) return 'Le code doit contenir exactement 6 chiffres.';
      return '';
    },
    newPassword: (v) => {
      if (!v) return 'Le mot de passe est obligatoire.';
      if (v.length < 6) return 'Minimum 6 caractères.';
      return '';
    },
    confirm: (v, pwd = newPassword) => {
      if (!v) return 'Confirmez le mot de passe.';
      if (v !== pwd) return 'Les mots de passe ne correspondent pas.';
      return '';
    },
  };

  const setField = (field, value) => {
    if (field === 'code')        setCode(value);
    if (field === 'newPassword') setNewPassword(value);
    if (field === 'confirm')     setConfirm(value);
    // Clear field error on change
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (error) setError('');
  };

  const handleBlur = (field, value) => {
    const err = field === 'confirm'
      ? validators.confirm(value, newPassword)
      : validators[field](value);
    setFieldErrors(prev => ({ ...prev, [field]: err }));
  };

  // ── Full validation before submit ─────────────────────────
  const validateAll = () => {
    const errors = {
      code:        validators.code(code),
      newPassword: validators.newPassword(newPassword),
      confirm:     validators.confirm(confirm),
    };
    setFieldErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) return;

    // Block after 5 failed attempts (brute-force guard)
    if (attempts >= 5) {
      setError('Trop de tentatives échouées. Demandez un nouveau code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authAPI.resetPassword(code.trim(), newPassword);
      setSuccess(true);
    } catch (err) {
      const status = err.response?.status;

      if (!err.response) {
        setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
      } else if (status === 400 || status === 404) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        const remaining = 5 - newAttempts;
        const serverMsg = err.response?.data?.message || 'Code invalide ou expiré.';
        setError(
          remaining > 0
            ? `${serverMsg} (${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''})`
            : 'Trop de tentatives. Veuillez demander un nouveau code.'
        );
        // Highlight code field
        setFieldErrors(prev => ({ ...prev, code: 'Code incorrect.' }));
      } else if (status === 410) {
        setError('Ce code a expiré. Veuillez demander un nouveau code.');
        setFieldErrors(prev => ({ ...prev, code: 'Code expiré.' }));
      } else if (status >= 500) {
        setError('Erreur serveur. Réessayez dans quelques instants.');
      } else {
        setError('Une erreur inattendue s\'est produite.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Shared input style helper ─────────────────────────────
  const inputStyle = (field) => ({
    borderColor: fieldErrors[field] ? 'var(--red, #ef4444)' : undefined,
  });

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
          <form className="login-form" onSubmit={handleSubmit} noValidate>

            {/* Global error */}
            {error && (
              <div className="error-msg" role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Code field */}
            <div className="form-group">
              <label htmlFor="reset-code">Code reçu par email</label>
              <input
                id="reset-code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={e => setField('code', e.target.value.replace(/\D/g, '').slice(0, 6))}
                onBlur={e => handleBlur('code', e.target.value)}
                placeholder="123456"
                maxLength={6}
                autoFocus
                autoComplete="one-time-code"
                aria-invalid={!!fieldErrors.code}
                aria-describedby={fieldErrors.code ? 'code-error' : undefined}
                style={{ ...inputStyle('code'), letterSpacing: '6px', fontSize: '20px', textAlign: 'center' }}
              />
              {fieldErrors.code && (
                <span id="code-error" role="alert" style={{ color: 'var(--red, #ef4444)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {fieldErrors.code}
                </span>
              )}
            </div>

            {/* New password field */}
            <div className="form-group">
              <label htmlFor="new-password">Nouveau mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="new-password"
                  type={showPwd ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setField('newPassword', e.target.value)}
                  onBlur={e => handleBlur('newPassword', e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={!!fieldErrors.newPassword}
                  aria-describedby={fieldErrors.newPassword ? 'pwd-error' : 'pwd-strength'}
                  style={{ ...inputStyle('newPassword'), paddingRight: '40px' }}
                />
                {/* Show/hide toggle */}
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--muted)',
                    padding: '4px',
                  }}
                >
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Password strength bar */}
              {newPassword && strength && (
                <div id="pwd-strength" style={{ marginTop: '6px' }}>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: strength.width,
                      background: strength.color,
                      transition: 'width 0.3s ease, background 0.3s ease',
                      borderRadius: '4px',
                    }} />
                  </div>
                  <span style={{ fontSize: '11px', color: strength.color, marginTop: '2px', display: 'block' }}>
                    Force : {strength.level}
                  </span>
                </div>
              )}

              {fieldErrors.newPassword && (
                <span id="pwd-error" role="alert" style={{ color: 'var(--red, #ef4444)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {fieldErrors.newPassword}
                </span>
              )}
            </div>

            {/* Confirm password field */}
            <div className="form-group">
              <label htmlFor="confirm-password">Confirmer le mot de passe</label>
              <input
                id="confirm-password"
                type={showPwd ? 'text' : 'password'}
                value={confirm}
                onChange={e => setField('confirm', e.target.value)}
                onBlur={e => handleBlur('confirm', e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                aria-invalid={!!fieldErrors.confirm}
                aria-describedby={fieldErrors.confirm ? 'confirm-error' : undefined}
                style={inputStyle('confirm')}
              />
              {fieldErrors.confirm && (
                <span id="confirm-error" role="alert" style={{ color: 'var(--red, #ef4444)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {fieldErrors.confirm}
                </span>
              )}
              {/* Live match indicator */}
              {confirm && !fieldErrors.confirm && confirm === newPassword && (
                <span style={{ color: '#22c55e', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  ✓ Les mots de passe correspondent
                </span>
              )}
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading || attempts >= 5}
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