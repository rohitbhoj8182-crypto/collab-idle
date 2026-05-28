import React, { useState, useCallback, useRef, useEffect } from 'react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const RUNNABLE = ['javascript', 'python', 'bash', 'typescript'];

export function RunOutput({ file, token }) {
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const outputRef = useRef(null);

  const canRun = file && RUNNABLE.includes(file.language?.toLowerCase());

  const runCode = useCallback(async () => {
    if (!file || running) return;
    setRunning(true);
    setError('');
    setOutput(null);

    try {
      const res = await fetch(`${SERVER_URL}/api/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code: file.content, language: file.language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Execution failed');
      setOutput(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }, [file, running, token]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  // Ctrl+Enter shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canRun) runCode();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [canRun, runCode]);

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.title}>▶ Output</span>
          {file && <span style={styles.lang}>{file.language}</span>}
        </div>
        <div style={styles.headerRight}>
          {output && (
            <span style={{ ...styles.badge, color: output.success ? '#23D18B' : '#FF5B5B', background: output.success ? 'rgba(35,209,139,0.1)' : 'rgba(255,91,91,0.1)' }}>
              {output.success ? '✓ Success' : '✗ Error'} · {output.elapsed}ms
            </span>
          )}
          <button
            className="btn btn-primary"
            style={{ ...styles.runBtn, opacity: (!canRun || running) ? 0.5 : 1 }}
            onClick={runCode}
            disabled={!canRun || running}
            title={canRun ? 'Run code (Ctrl+Enter)' : `${file?.language || 'No file'} is not supported`}
          >
            {running ? (
              <><span className="spinner" style={{ width: 12, height: 12, borderTopColor: '#080B0F' }} /> Running…</>
            ) : (
              <>▶ Run</>
            )}
          </button>
        </div>
      </div>

      {/* Output area */}
      <div style={styles.outputArea} ref={outputRef}>
        {!file && (
          <p style={styles.hint}>Select a file to run it.</p>
        )}
        {file && !canRun && (
          <p style={styles.hint}>
            <span style={{ color: '#FF9F43' }}>⚠</span> {file.language} execution is not supported.<br/>
            Supported: JavaScript, Python, TypeScript, Bash
          </p>
        )}
        {canRun && !output && !running && !error && (
          <p style={styles.hint}>Press <kbd style={styles.kbd}>Ctrl+Enter</kbd> or click ▶ Run to execute your code.</p>
        )}

        {running && (
          <div style={styles.runningRow}>
            <span className="spinner" style={{ width: 14, height: 14 }} />
            <span style={styles.runningText}>Executing…</span>
          </div>
        )}

        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorIcon}>✗</span>
            <pre style={styles.pre}>{error}</pre>
          </div>
        )}

        {output && (
          <div style={styles.resultWrap}>
            {output.stdout && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>stdout</div>
                <pre style={styles.pre}>{output.stdout}</pre>
              </div>
            )}
            {output.stderr && (
              <div style={styles.section}>
                <div style={{ ...styles.sectionLabel, color: '#FF9F43' }}>stderr</div>
                <pre style={{ ...styles.pre, color: '#FF9F43' }}>{output.stderr}</pre>
              </div>
            )}
            {!output.stdout && !output.stderr && (
              <p style={styles.hint}>(no output)</p>
            )}
            <div style={styles.exitRow}>
              <span style={{ color: output.exitCode === 0 ? '#23D18B' : '#FF5B5B' }}>
                exit code: {output.exitCode}
              </span>
              <span style={{ color: 'var(--text-disabled)' }}>{output.elapsed}ms</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  root: { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-void)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, background: 'var(--bg-surface)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  title: { fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-secondary)', textTransform: 'uppercase' },
  lang: { fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
  badge: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 },
  runBtn: { padding: '5px 14px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  outputArea: { flex: 1, overflow: 'auto', padding: 12, fontFamily: "'JetBrains Mono','Fira Code',monospace" },
  hint: { color: 'var(--text-disabled)', fontSize: 12, lineHeight: 1.8, marginTop: 8 },
  kbd: { display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', fontSize: 11, color: 'var(--text-secondary)' },
  runningRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' },
  runningText: { color: 'var(--text-muted)', fontSize: 12 },
  errorBox: { display: 'flex', gap: 8, background: 'rgba(255,91,91,0.06)', border: '1px solid rgba(255,91,91,0.2)', borderRadius: 8, padding: '10px 12px' },
  errorIcon: { color: '#FF5B5B', flexShrink: 0 },
  resultWrap: { display: 'flex', flexDirection: 'column', gap: 12 },
  section: { display: 'flex', flexDirection: 'column', gap: 4 },
  sectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' },
  pre: { margin: 0, fontSize: 12, lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '10px 12px' },
  exitRow: { display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--font-mono)', padding: '4px 0', borderTop: '1px solid var(--border-subtle)', marginTop: 4 },
};
