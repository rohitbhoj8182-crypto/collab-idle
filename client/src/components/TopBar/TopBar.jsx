import React, { useState, useCallback } from 'react';

const STATUS_CONFIG = {
  connected:    { color: '#23D18B', label: 'Live',         dot: true },
  connecting:   { color: '#FFD93D', label: 'Connecting…',  dot: true },
  disconnected: { color: '#FF5B5B', label: 'Disconnected', dot: false },
  error:        { color: '#FF5B5B', label: 'Error',        dot: false },
};

export function TopBar({ roomId, status, peer, peers, activeFile, rightPanel, onRightPanelChange, onLogout }) {
  const [copied, setCopied] = useState(false);
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;

  const copyRoomId = useCallback(() => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [roomId]);

  return (
    <header style={styles.root}>
      {/* Left: Logo + file */}
      <div style={styles.left}>
        <div style={styles.logo}>
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <path d="M4 8L16 2L28 8V24L16 30L4 24V8Z" stroke="url(#tl)" strokeWidth="1.5" fill="none"/>
            <path d="M10 14L16 11L22 14V20L16 23L10 20V14Z" fill="url(#tl)" opacity="0.9"/>
            <defs><linearGradient id="tl" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse"><stop stopColor="#00D9FF"/><stop offset="1" stopColor="#7C6FFF"/></linearGradient></defs>
          </svg>
          <span style={styles.logoText}>CollabIDE</span>
        </div>

        <div style={styles.sep} />

        {activeFile && (
          <div style={styles.fileChip}>
            <span style={styles.fileName}>{activeFile.name}</span>
            <span style={styles.fileLang}>{activeFile.language}</span>
          </div>
        )}
      </div>

      {/* Center: Room code */}
      <div style={styles.center}>
        <button onClick={copyRoomId} style={styles.roomChip} title="Click to copy room code">
          <span style={styles.roomLabel}>ROOM</span>
          <span style={styles.roomCode}>{roomId}</span>
          <span style={styles.copyIcon}>{copied ? '✓' : '⎘'}</span>
        </button>
      </div>

      {/* Right: Status + peers + panels + logout */}
      <div style={styles.right}>
        <div style={styles.statusChip}>
          <span style={{ ...styles.dot, background: cfg.color, ...(cfg.dot ? {} : { animation: 'none', opacity: 0.6 }) }} />
          <span style={{ color: cfg.color, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>{cfg.label}</span>
        </div>

        <div style={styles.sep} />

        <div style={styles.peers}>
          {(peers || []).slice(0, 5).map((p, i) => (
            <div
              key={p.id || i}
              title={p.name || 'Peer'}
              style={{ ...styles.avatar, background: p.color || '#4ECDC4', marginLeft: i > 0 ? -8 : 0, zIndex: 5 - i }}
            >
              {(p.name || '?')[0].toUpperCase()}
            </div>
          ))}
          {(peers || []).length > 5 && (
            <div style={{ ...styles.avatar, background: 'var(--bg-overlay)', marginLeft: -8, color: 'var(--text-secondary)', fontSize: 9 }}>
              +{peers.length - 5}
            </div>
          )}
          {peer && (
            <div
              title="You"
              style={{ ...styles.avatar, background: peer.color || '#00D9FF', marginLeft: (peers || []).length > 0 ? -8 : 0, border: '2px solid var(--accent-cyan)' }}
            >
              {(peer.name || '?')[0].toUpperCase()}
            </div>
          )}
        </div>

        <div style={styles.sep} />

        <div style={styles.panelBtns}>
          {[
            { id: 'run',    icon: '▶', label: 'Run' },
            { id: 'chat',   icon: '💬', label: 'Chat' },
            { id: 'review', icon: '🔍', label: 'Review' },
            { id: 'diff',   icon: '⚡', label: 'Diff' },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              className="btn btn-ghost"
              style={{ ...styles.panelBtn, ...(rightPanel === id ? styles.panelBtnActive : {}), ...(id === 'run' ? styles.runBtn : {}) }}
              onClick={() => onRightPanelChange(id)}
              title={label}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {onLogout && (
          <>
            <div style={styles.sep} />
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={onLogout} title="Sign out">
              ⎋ Sign out
            </button>
          </>
        )}
      </div>
    </header>
  );
}

const styles = {
  root: { height: 48, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, zIndex: 10 },
  left: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  logo: { display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 },
  logoText: { fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 15, background: 'linear-gradient(135deg, #00D9FF, #7C6FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.01em' },
  sep: { width: 1, height: 20, background: 'var(--border-subtle)' },
  fileChip: { display: 'flex', alignItems: 'center', gap: 8, padding: '3px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, minWidth: 0 },
  fileName: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileLang: { fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' },
  center: { display: 'flex', alignItems: 'center' },
  roomChip: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', outline: 'none' },
  roomLabel: { fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' },
  roomCode: { fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--accent-cyan)', letterSpacing: '0.08em' },
  copyIcon: { fontSize: 12, color: 'var(--text-muted)' },
  right: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' },
  statusChip: { display: 'flex', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: '50%', animation: 'pulse 2s infinite' },
  peers: { display: 'flex', alignItems: 'center' },
  avatar: { width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#080B0F', border: '1.5px solid var(--bg-surface)', cursor: 'default', flexShrink: 0 },
  panelBtns: { display: 'flex', gap: 4 },
  panelBtn: { padding: '4px 10px', fontSize: 11, fontWeight: 600 },
  panelBtnActive: { background: 'var(--bg-active)', color: 'var(--accent-cyan)', borderColor: 'rgba(0,217,255,0.3)' },
  runBtn: { color: '#23D18B', borderColor: 'rgba(35,209,139,0.2)' },
};
