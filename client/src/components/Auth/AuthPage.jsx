import React, { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

export function AuthPage({ onSuccess }) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Please fill in all fields'); return; }
    if (tab === 'register') {
      if (!form.username.trim()) { setError('Username is required'); return; }
      if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
      if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    }
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, form, login, register, onSuccess]);

  return (
    <div style={styles.root}>
      <div style={styles.grid} />
      <div style={styles.glow1} />
      <div style={styles.glow2} />

      <div style={styles.container}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M4 8L16 2L28 8V24L16 30L4 24V8Z" stroke="url(#lg)" strokeWidth="1.5" fill="none"/>
              <path d="M10 14L16 11L22 14V20L16 23L10 20V14Z" fill="url(#lg)" opacity="0.8"/>
              <defs>
                <linearGradient id="lg" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00D9FF"/><stop offset="1" stopColor="#7C6FFF"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h1 style={styles.logoText}>CollabIDE</h1>
            <p style={styles.tagline}>Real-time collaborative coding</p>
          </div>
        </div>

        {/* Card */}
        <div style={styles.card}>
          <div style={styles.tabs}>
            {['login', 'register'].map(t => (
              <button
                key={t}
                style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
                onClick={() => { setTab(t); setError(''); }}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            {tab === 'register' && (
              <div style={styles.field}>
                <label style={styles.label}>Username</label>
                <input className="input" value={form.username} onChange={set('username')} placeholder="e.g. alice_dev" maxLength={30} autoFocus />
              </div>
            )}

            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoFocus={tab === 'login'} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input className="input" type="password" value={form.password} onChange={set('password')} placeholder={tab === 'register' ? 'At least 6 characters' : '••••••••'} />
            </div>

            {tab === 'register' && (
              <div style={styles.field}>
                <label style={styles.label}>Confirm Password</label>
                <input className="input" type="password" value={form.confirm} onChange={set('confirm')} placeholder="••••••••" />
              </div>
            )}

            {error && <p style={styles.error}>{error}</p>}

            <button className="btn btn-primary" type="submit" disabled={loading} style={styles.submit}>
              {loading && <span className="spinner" style={{ width: 14, height: 14, borderTopColor: '#080B0F' }} />}
              {tab === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          <div style={styles.switchRow}>
            <span style={styles.switchText}>
              {tab === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </span>
            <button style={styles.switchBtn} onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); setError(''); }}>
              {tab === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>

        <p style={styles.footer}>Your code. Your team. Secured.</p>
      </div>
    </div>
  );
}

const styles = {
  root: { position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'var(--bg-void)' },
  grid: { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)', backgroundSize: '48px 48px', opacity: 0.5 },
  glow1: { position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,217,255,0.06) 0%, transparent 70%)', top: '-10%', left: '-10%', pointerEvents: 'none' },
  glow2: { position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,111,255,0.06) 0%, transparent 70%)', bottom: '-10%', right: '-10%', pointerEvents: 'none' },
  container: { position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 16 },
  logoIcon: { width: 56, height: 56, borderRadius: 16, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 32px rgba(0,217,255,0.1)' },
  logoText: { fontFamily: 'var(--font-ui)', fontSize: 32, fontWeight: 800, background: 'linear-gradient(135deg, #00D9FF, #7C6FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' },
  tagline: { color: 'var(--text-muted)', fontSize: 13, marginTop: 2, fontWeight: 400 },
  card: { width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' },
  tabs: { display: 'flex', borderBottom: '1px solid var(--border-subtle)' },
  tab: { flex: 1, padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.02em' },
  tabActive: { color: 'var(--accent-cyan)', borderBottomColor: 'var(--accent-cyan)', background: 'rgba(0,217,255,0.04)' },
  form: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' },
  error: { color: 'var(--accent-red)', fontSize: 12, padding: '8px 12px', background: 'rgba(255,91,91,0.08)', borderRadius: 6, border: '1px solid rgba(255,91,91,0.2)' },
  submit: { width: '100%', justifyContent: 'center', padding: '12px 24px', fontSize: 14, marginTop: 4 },
  switchRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 24px 20px' },
  switchText: { fontSize: 12, color: 'var(--text-muted)' },
  switchBtn: { fontSize: 12, color: 'var(--accent-cyan)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 },
  footer: { color: 'var(--text-disabled)', fontSize: 11, textAlign: 'center' },
};
