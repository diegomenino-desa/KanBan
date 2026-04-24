import React, { useState } from 'react';
import { LayoutDashboard, LogIn } from 'lucide-react';
import { useAuth } from './AuthContext';

export const LoginView: React.FC = () => {
  const { mode, error, loginPassword, loginOidc } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setSubmitting(true);
    try {
      await loginPassword(username, password);
    } catch {
      /* error surfaced via context */
    } finally {
      setSubmitting(false);
    }
  };

  const isPasswordMode = mode === 'ldap' || mode === 'local';
  const subtitle = mode === 'oidc'
    ? 'Continue with your Microsoft work or school account.'
    : mode === 'local'
      ? 'Sign in with your KanbanBoard account.'
      : 'Use your corporate account to continue.';
  const usernamePlaceholder = mode === 'local' ? 'username' : 'jdoe or jdoe@corp.example';

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--soft-cloud)',
      padding: '20px',
    }}>
      <div style={{
        width: '420px',
        maxWidth: '100%',
        background: 'var(--canvas)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: '40px 36px',
        boxShadow: 'rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.10) 0 4px 8px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--rausch)', marginBottom: '24px' }}>
          <LayoutDashboard size={24} />
          <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em' }}>KanbanBoard</span>
        </div>

        <h1 style={{ fontSize: '1.55rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
          Sign in
        </h1>
        <p style={{ color: 'var(--ash)', fontSize: '0.92rem', marginBottom: '28px' }}>
          {subtitle}
        </p>

        {error && (
          <div style={{
            background: 'rgba(193, 53, 21, 0.06)',
            border: '1px solid rgba(193, 53, 21, 0.3)',
            color: 'var(--error)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.88rem',
            fontWeight: 500,
            marginBottom: '18px',
          }}>
            {error}
          </div>
        )}

        {isPasswordMode ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ash)' }}>USERNAME</span>
              <input
                autoFocus
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={usernamePlaceholder}
                className="airbnb-input"
                required
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ash)' }}>PASSWORD</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="airbnb-input"
                required
              />
            </label>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ justifyContent: 'center', marginTop: '6px', padding: '12px 20px', fontWeight: 600, opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={loginOidc}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '14px 20px', fontWeight: 600, fontSize: '0.95rem' }}
          >
            <LogIn size={16} /> Sign in with Microsoft
          </button>
        )}

        <p style={{ color: 'var(--ash)', fontSize: '0.78rem', marginTop: '24px', textAlign: 'center' }}>
          By continuing you agree to your organization's acceptable-use policy.
        </p>
      </div>
    </div>
  );
};
