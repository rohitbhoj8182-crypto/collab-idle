import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export function Landing({ onStart, user, onLogout }) {
  const { token } = useAuth();
  const [tab, setTab] = useState('create');
  const [userName, setUserName] = useState(user?.username || '');
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const handleCreate = useCallback(async (e) => {
    e.preventDefault();
    if (!userName.trim()) { setError('Please enter your name'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/create`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: roomName || 'My Room' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room');
      onStart({ roomId: data.roomId, userName: userName.trim() });
    } catch (err) {
      setError(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  }, [userName, roomName, onStart, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoin = useCallback(async (e) => {
    e.preventDefault();
    if (!userName.trim()) { setError('Please enter your name'); return; }
    if (!joinCode.trim()) { setError('Please enter a room code'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/${joinCode.trim().toUpperCase()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Room not found');
      onStart({ roomId: joinCode.trim().toUpperCase(), userName: userName.trim() });
    } catch (err) {
      setError(err.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  }, [userName, joinCode, onStart, token]);

  return (
    <div style={styles.root}>
      <div style={styles.grid} />
      <div style={styles.glow1} />
      <div style={styles.glow2} />

      <div style={styles.container}>
        {/* Logo + user info */}
        <div style={styles.topRow}>
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
          {user && (
            <div style={styles.userChip}>
              <div style={styles.userAvatar}>{(user.username || '?')[0].toUpperCase()}</div>
              <span style={styles.userName}>{user.username}</span>
              <button style={styles.logoutBtn} onClick={onLogout} title="Sign out">⎋</button>
            </div>
          )}
        </div>

        {/* Feature badges */}
        <div style={styles.features}>
          {['Monaco Editor', 'Live Cursors', 'Code Review', 'Version Diff', 'Team Chat', '▶ Run Code'].map(f => (
            <span key={f} style={styles.featureBadge}>{f}</span>
          ))}
        </div>

        {/* Card */}
        <div style={styles.card}>
          <div style={styles.tabs}>
            <button style={{ ...styles.tab, ...(tab === 'create' ? styles.tabActive : {}) }} onClick={() => { setTab('create'); setError(''); }}>
              Create Room
            </button>
            <button style={{ ...styles.tab, ...(tab === 'join' ? styles.tabActive : {}) }} onClick={() => { setTab('join'); setError(''); }}>
              Join Room
            </button>
          </div>

          <form onSubmit={tab === 'create' ? handleCreate : handleJoin} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Display Name</label>
              <input className="input" value={userName} onChange={e => setUserName(e.target.value)} placeholder="e.g. Alice" maxLength={30} autoFocus />
            </div>

            {tab === 'create' && (
              <div style={styles.field}>
                <label style={styles.label}>Room Name <span style={styles.optional}>(optional)</span></label>
                <input className="input" value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="e.g. Sprint Review" maxLength={50} />
              </div>
            )}

            {tab === 'join' && (
              <div style={styles.field}>
                <label style={styles.label}>Room Code</label>
                <input className="input mono" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="Enter room code" maxLength={20} />
              </div>
            )}

            {error && <p style={styles.error}>{error}</p>}

            <button className="btn btn-primary" type="submit" disabled={loading} style={styles.submit}>
              {loading ? <span className="spinner" style={{ width: 14, height: 14, borderTopColor: '#080B0F' }} /> : null}
              {tab === 'create' ? 'Create Room →' : 'Join Room →'}
            </button>
          </form>
        </div>

        <p style={styles.footer}>Rooms auto-expire after 24h of inactivity</p>
      </div>
    </div>
  );
}

const styles = {
  root: { position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'var(--bg-void)' },
  grid: { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)', backgroundSize: '48px 48px', opacity: 0.5 },
  glow1: { position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,217,255,0.06) 0%, transparent 70%)', top: '-10%', left: '-10%', pointerEvents: 'none' },
  glow2: { position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,111,255,0.06) 0%, transparent 70%)', bottom: '-10%', right: '-10%', pointerEvents: 'none' },
  container: { position: 'relative', zIndex: 1, width: '100%', maxWidth: 480, padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 },
  topRow: { width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 16 },
  logoIcon: { width: 56, height: 56, borderRadius: 16, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 32px rgba(0,217,255,0.1)' },
  logoText: { fontFamily: 'var(--font-ui)', fontSize: 32, fontWeight: 800, background: 'linear-gradient(135deg, #00D9FF, #7C6FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' },
  tagline: { color: 'var(--text-muted)', fontSize: 13, marginTop: 2, fontWeight: 400 },
  userChip: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 10, flexShrink: 0 },
  userAvatar: { width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#00D9FF,#7C6FFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#080B0F' },
  userName: { fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' },
  logoutBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 2px', lineHeight: 1 },
  features: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  featureBadge: { padding: '3px 10px', borderRadius: 20, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em' },
  card: { width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' },
  tabs: { display: 'flex', borderBottom: '1px solid var(--border-subtle)' },
  tab: { flex: 1, padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.02em' },
  tabActive: { color: 'var(--accent-cyan)', borderBottomColor: 'var(--accent-cyan)', background: 'rgba(0,217,255,0.04)' },
  form: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' },
  optional: { color: 'var(--text-disabled)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 },
  error: { color: 'var(--accent-red)', fontSize: 12, padding: '8px 12px', background: 'rgba(255,91,91,0.08)', borderRadius: 6, border: '1px solid rgba(255,91,91,0.2)' },
  submit: { width: '100%', justifyContent: 'center', padding: '12px 24px', fontSize: 14, marginTop: 4 },
  footer: { color: 'var(--text-disabled)', fontSize: 11, textAlign: 'center' },
};
