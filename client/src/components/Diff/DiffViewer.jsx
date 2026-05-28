import React, { useMemo, useState } from 'react';

// Client-side diff computation using Myers diff algorithm
function computeLineDiff(oldText, newText) {
  const oldLines = (oldText || '').split('\n');
  const newLines = (newText || '').split('\n');

  // Simple LCS-based diff
  const result = [];
  let o = 0, n = 0;

  while (o < oldLines.length || n < newLines.length) {
    if (o >= oldLines.length) {
      result.push({ type: 'add', line: newLines[n], lineNo: n + 1 });
      n++;
    } else if (n >= newLines.length) {
      result.push({ type: 'remove', line: oldLines[o], lineNo: o + 1 });
      o++;
    } else if (oldLines[o] === newLines[n]) {
      result.push({ type: 'equal', line: newLines[n], lineNo: n + 1 });
      o++; n++;
    } else {
      // Check if next old line matches current new (deletion)
      if (o + 1 < oldLines.length && oldLines[o + 1] === newLines[n]) {
        result.push({ type: 'remove', line: oldLines[o], lineNo: o + 1 });
        o++;
      } else {
        result.push({ type: 'remove', line: oldLines[o], lineNo: o + 1 });
        result.push({ type: 'add', line: newLines[n], lineNo: n + 1 });
        o++; n++;
      }
    }
  }
  return result;
}

export function DiffViewer({ file }) {
  const [compareMode, setCompareMode] = useState('empty'); // empty | snapshot

  const sampleOld = `// Previous version
function greet(name) {
  console.log("Hello " + name);
}

greet("world");`;

  const diff = useMemo(() => {
    const oldContent = compareMode === 'empty' ? '' : sampleOld;
    return computeLineDiff(oldContent, file?.content || '');
  }, [file?.content, compareMode]);

  const stats = useMemo(() => ({
    added: diff.filter(d => d.type === 'add').length,
    removed: diff.filter(d => d.type === 'remove').length,
    changed: diff.filter(d => d.type !== 'equal').length,
  }), [diff]);

  if (!file) return (
    <div style={styles.empty}>
      <p style={{ color: 'var(--text-muted)' }}>No file selected</p>
    </div>
  );

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.title}>⚡ Diff Viewer</span>
        </div>
        <div style={styles.stats}>
          <span style={styles.statAdded}>+{stats.added}</span>
          <span style={styles.statRemoved}>−{stats.removed}</span>
        </div>
      </div>

      {/* Mode selector */}
      <div style={styles.modeBar}>
        <span style={styles.modeLabel}>Compare with:</span>
        <select style={styles.modeSelect} value={compareMode} onChange={e => setCompareMode(e.target.value)}>
          <option value="empty">Empty (new file)</option>
          <option value="snapshot">Previous snapshot</option>
        </select>
      </div>

      {/* File info */}
      <div style={styles.fileInfo}>
        <span style={styles.fileInfoText}>{file.name} · v{file.version}</span>
        <span style={styles.fileInfoLang}>{file.language}</span>
      </div>

      {/* Diff lines */}
      <div style={styles.diffContent}>
        {diff.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 12, padding: 16 }}>No differences</p>
        ) : (
          diff.map((d, i) => (
            <div
              key={i}
              style={{
                ...styles.diffLine,
                ...(d.type === 'add' ? styles.diffAdd : {}),
                ...(d.type === 'remove' ? styles.diffRemove : {}),
                ...(d.type === 'equal' ? styles.diffEqual : {}),
              }}
            >
              <span style={styles.lineNo}>{d.lineNo}</span>
              <span style={styles.lineSymbol}>
                {d.type === 'add' ? '+' : d.type === 'remove' ? '−' : ' '}
              </span>
              <span style={styles.lineContent}>{d.line || '\u00A0'}</span>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div style={styles.summary}>
        <div style={styles.summaryBar}>
          <div style={{ ...styles.summarySegment, background: 'var(--accent-green)', flex: stats.added || 1 }} />
          <div style={{ ...styles.summarySegment, background: 'var(--accent-red)', flex: stats.removed || 0.1 }} />
        </div>
        <p style={styles.summaryText}>
          {stats.changed} line{stats.changed !== 1 ? 's' : ''} changed · {stats.added} added · {stats.removed} removed
        </p>
      </div>
    </div>
  );
}

const styles = {
  root: { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  empty: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  header: { padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  title: { fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-secondary)', textTransform: 'uppercase' },
  stats: { display: 'flex', gap: 8 },
  statAdded: { fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent-green)' },
  statRemoved: { fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent-red)' },
  modeBar: { padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 },
  modeLabel: { fontSize: 11, color: 'var(--text-muted)' },
  modeSelect: { flex: 1, background: 'var(--bg-base)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: 11, padding: '4px 8px', outline: 'none', fontFamily: 'var(--font-ui)' },
  fileInfo: { padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, background: 'var(--bg-base)' },
  fileInfoText: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' },
  fileInfoLang: { fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginLeft: 'auto' },
  diffContent: { flex: 1, overflow: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: '18px' },
  diffLine: { display: 'flex', alignItems: 'flex-start', minHeight: 18 },
  diffAdd: { background: 'rgba(35,209,139,0.08)', borderLeft: '2px solid var(--accent-green)' },
  diffRemove: { background: 'rgba(255,91,91,0.08)', borderLeft: '2px solid var(--accent-red)' },
  diffEqual: { borderLeft: '2px solid transparent', opacity: 0.5 },
  lineNo: { width: 40, padding: '0 8px', color: 'var(--text-disabled)', fontSize: 10, flexShrink: 0, userSelect: 'none', textAlign: 'right' },
  lineSymbol: { width: 16, color: 'var(--text-muted)', flexShrink: 0, userSelect: 'none', paddingRight: 4 },
  lineContent: { flex: 1, padding: '0 8px 0 4px', color: 'var(--text-primary)', whiteSpace: 'pre', overflow: 'hidden' },
  summary: { padding: '10px 12px', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 },
  summaryBar: { display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', gap: 1, marginBottom: 6 },
  summarySegment: { height: '100%', borderRadius: 1, minWidth: 4 },
  summaryText: { fontSize: 11, color: 'var(--text-muted)' },
};
