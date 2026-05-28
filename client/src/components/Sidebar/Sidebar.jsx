import React, { useState, useCallback } from 'react';
import { detectLanguage, LANG_ICONS, LANG_COLORS, LANGUAGE_OPTIONS } from '../../utils/languageMap.js';

export function Sidebar({ files, activeFileId, peers, width, onFileSelect, onAddFile, onDeleteFile }) {
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newLang, setNewLang] = useState('javascript');

  const safeFiles = files || [];
  const safePeers = peers || [];

  const handleCreate = useCallback(() => {
    if (!newFileName.trim()) return;
    const trimmed = newFileName.trim();
    const name = trimmed.includes('.')
      ? trimmed
      : `${trimmed}.${newLang === 'javascript' ? 'js' : newLang === 'typescript' ? 'ts' : newLang === 'python' ? 'py' : newLang}`;
    onAddFile(name, newLang);
    setNewFileName('');
    setShowNewFile(false);
  }, [newFileName, newLang, onAddFile]);

  return (
    <aside style={{ ...styles.root, width }}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.sectionLabel}>EXPLORER</span>
        <button
          className="btn btn-ghost"
          style={styles.addBtn}
          onClick={() => setShowNewFile(v => !v)}
          title="New File"
        >
          {showNewFile ? '✕' : '+'}
        </button>
      </div>

      {/* New file form */}
      {showNewFile && (
        <div style={styles.newFileForm}>
          <input
            className="input"
            style={{ fontSize: 12 }}
            value={newFileName}
            onChange={e => setNewFileName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNewFile(false); }}
            placeholder="filename.js"
            autoFocus
          />
          <select
            style={styles.select}
            value={newLang}
            onChange={e => setNewLang(e.target.value)}
          >
            {LANGUAGE_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <button className="btn btn-primary" style={{ fontSize: 11, padding: '6px 12px' }} onClick={handleCreate}>
            Create
          </button>
        </div>
      )}

      <div style={styles.divider} />

      {/* File list */}
      <div style={styles.fileList}>
        <div style={styles.sectionLabel2}>FILES</div>
        {safeFiles.map(file => {
          const isActive = file.id === activeFileId;
          const icon = LANG_ICONS[file.language] || '📄';
          const color = LANG_COLORS[file.language];
          const filePeers = safePeers.filter(p => p.cursor?.fileId === file.id);

          return (
            <div
              key={file.id}
              style={{ ...styles.fileItem, ...(isActive ? styles.fileItemActive : {}) }}
              onClick={() => onFileSelect(file.id)}
            >
              <span style={styles.fileIcon}>{icon}</span>
              <span style={{ ...styles.fileName, ...(color && isActive ? { color } : {}) }}>
                {file.name}
              </span>
              {filePeers.length > 0 && (
                <div style={styles.presenceDots}>
                  {filePeers.slice(0, 3).map(p => (
                    <span key={p.id} style={{ ...styles.presenceDot, background: p.color }} title={p.name} />
                  ))}
                </div>
              )}
              {safeFiles.length > 1 && (
                <button
                  style={styles.deleteBtn}
                  onClick={e => { e.stopPropagation(); onDeleteFile(file.id); }}
                  title="Delete file"
                >×</button>
              )}
            </div>
          );
        })}
      </div>

      <div style={styles.divider} />

      {/* Online users */}
      <div style={styles.usersSection}>
        <div style={styles.sectionLabel2}>COLLABORATORS · {safePeers.length}</div>
        {safePeers.map(p => (
          <div key={p.id} style={styles.userItem}>
            <span style={{ ...styles.userDot, background: p.color }} />
            <span style={styles.userName}>{p.name}</span>
            {p.cursor?.fileId && (
              <span style={styles.userFile}>
                {safeFiles.find(f => f.id === p.cursor.fileId)?.name?.split('.')[0]}
              </span>
            )}
          </div>
        ))}
        {safePeers.length === 0 && (
          <p style={{ color: 'var(--text-disabled)', fontSize: 11, padding: '4px 12px' }}>No collaborators yet</p>
        )}
      </div>
    </aside>
  );
}

const styles = {
  root: { background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 6px' },
  sectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' },
  sectionLabel2: { fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-disabled)', textTransform: 'uppercase', padding: '6px 12px 4px' },
  addBtn: { width: 22, height: 22, padding: 0, justifyContent: 'center', fontSize: 16, fontWeight: 300 },
  newFileForm: { padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' },
  select: { background: 'var(--bg-base)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: 11, padding: '4px 8px', outline: 'none', fontFamily: 'var(--font-ui)' },
  divider: { height: 1, background: 'var(--border-subtle)', margin: '4px 0' },
  fileList: { flex: 1, overflow: 'auto' },
  fileItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', transition: 'background 0.1s', borderLeft: '2px solid transparent', userSelect: 'none' },
  fileItemActive: { background: 'var(--bg-active)', borderLeftColor: 'var(--accent-cyan)' },
  fileIcon: { fontSize: 13, flexShrink: 0 },
  fileName: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  presenceDots: { display: 'flex', gap: 2 },
  presenceDot: { width: 5, height: 5, borderRadius: '50%' },
  deleteBtn: { opacity: 0, background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 },
  usersSection: { padding: '0 0 12px', minHeight: 80 },
  userItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px' },
  userDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  userName: { fontSize: 12, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userFile: { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
};
