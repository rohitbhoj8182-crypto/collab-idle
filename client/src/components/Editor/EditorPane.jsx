import React, { useRef, useCallback, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';

export function EditorPane({ file, peers, myPeerId, onCodeChange, onCursorMove, onCursorSelect, onAddComment, onRequestDiff, onRunCode }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const changeTimeoutRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [commentText, setCommentText] = useState('');

  const handleEditorMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.updateOptions({
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
      fontLigatures: true,
      lineHeight: 22,
      letterSpacing: 0.3,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      scrollBeyondLastLine: false,
      minimap: { enabled: true, scale: 1 },
      renderLineHighlight: 'gutter',
      renderWhitespace: 'selection',
      wordWrap: 'on',
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      formatOnPaste: true,
      formatOnType: true,
      suggestOnTriggerCharacters: true,
      quickSuggestions: { other: true, comments: false, strings: false },
      padding: { top: 12, bottom: 12 },
    });

    editor.onDidChangeCursorPosition(e => {
      onCursorMove(file.id, e.position.lineNumber, e.position.column);
    });

    editor.onDidChangeCursorSelection(e => {
      const sel = e.selection;
      if (!sel.isEmpty()) {
        onCursorSelect(
          file.id,
          sel.startLineNumber,
          sel.startColumn,
          { line: sel.startLineNumber, column: sel.startColumn },
          { line: sel.endLineNumber, column: sel.endColumn }
        );
      }
    });

    editor.onContextMenu(e => {
      const line = editor.getPosition()?.lineNumber;
      if (line) {
        setContextMenu({ x: e.event.posx, y: e.event.posy, line });
        e.event.preventDefault();
      }
    });

    editor.onMouseDown(() => setContextMenu(null));

    // Define custom theme
    monaco.editor.defineTheme('collab-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '4A5E80', fontStyle: 'italic' },
        { token: 'keyword', foreground: '00D9FF' },
        { token: 'string', foreground: '23D18B' },
        { token: 'number', foreground: 'FF9F43' },
        { token: 'type', foreground: '7C6FFF' },
        { token: 'function', foreground: '85C1E9' },
        { token: 'variable', foreground: 'E8F0FE' },
        { token: 'operator', foreground: '8B9FC7' },
        { token: 'delimiter', foreground: '4A5E80' },
      ],
      colors: {
        'editor.background': '#0D1117',
        'editor.foreground': '#E8F0FE',
        'editor.lineHighlightBackground': '#1A2332',
        'editor.selectionBackground': '#2A3850',
        'editor.selectionHighlightBackground': '#1F2D3D',
        'editorCursor.foreground': '#00D9FF',
        'editorWhitespace.foreground': '#2E4060',
        'editorIndentGuide.background': '#1F2D3D',
        'editorIndentGuide.activeBackground': '#2E4060',
        'editorLineNumber.foreground': '#2D3F5C',
        'editorLineNumber.activeForeground': '#4A5E80',
        'editorGutter.background': '#0D1117',
        'editorMinimap.background': '#080B0F',
        'scrollbar.shadow': '#000000',
        'scrollbarSlider.background': '#1F2D3D',
        'scrollbarSlider.hoverBackground': '#253346',
        'scrollbarSlider.activeBackground': '#2E4060',
        'editor.wordHighlightBackground': '#1A2332',
        'editor.findMatchBackground': '#2A3850',
        'editor.findMatchHighlightBackground': '#1A2332',
        'editorBracketHighlight.foreground1': '#00D9FF',
        'editorBracketHighlight.foreground2': '#7C6FFF',
        'editorBracketHighlight.foreground3': '#23D18B',
      },
    });
    monaco.editor.setTheme('collab-dark');
  }, [file.id, onCursorMove, onCursorSelect]);

  // Update peer cursor decorations
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const decorations = peers
      .filter(p => p.id !== myPeerId && p.cursor?.fileId === file.id)
      .flatMap(peer => {
        const decs = [];
        const line = peer.cursor?.line || 1;
        const column = peer.cursor?.column || 1;
        // Safe CSS class name — use only alphanumeric chars from peer id
        const safeId = (peer.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'peer';

        decs.push({
          range: new monaco.Range(line, column, line, column),
          options: {
            className: '',
            beforeContentClassName: `peer-cursor-${safeId}`,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });

        if (peer.cursor?.selectionStart && peer.cursor?.selectionEnd) {
          const ss = peer.cursor.selectionStart;
          const se = peer.cursor.selectionEnd;
          if (ss.line && se.line) {
            decs.push({
              range: new monaco.Range(ss.line, ss.column, se.line, se.column),
              options: {
                className: 'peer-selection',
                inlineClassName: 'peer-selection-inline',
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
              },
            });
          }
        }

        return decs;
      });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);

    // Inject CSS for peer cursors
    peers.forEach(peer => {
      if (!peer.id) return;
      const safeId = peer.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'peer';
      const styleId = `peer-cursor-style-${safeId}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        const safeName = (peer.name || 'Peer').replace(/['"\\<>]/g, '');
        style.textContent = `
          .peer-cursor-${safeId}::before {
            content: '';
            display: inline-block;
            width: 2px;
            height: 18px;
            background: ${peer.color || '#00D9FF'};
            margin-right: -1px;
            vertical-align: text-top;
            border-radius: 1px;
            animation: blink-cursor 1s infinite;
          }
          .peer-cursor-${safeId}::after {
            content: '${safeName}';
            display: inline-block;
            background: ${peer.color || '#00D9FF'};
            color: #080B0F;
            font-size: 9px;
            font-weight: 700;
            font-family: var(--font-ui);
            padding: 1px 5px;
            border-radius: 2px;
            margin-left: 2px;
            white-space: nowrap;
            position: relative;
            top: -16px;
          }
          @keyframes blink-cursor { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        `;
        document.head.appendChild(style);
      }
    });
  }, [peers, file.id, myPeerId]);

  const handleChange = useCallback((value) => {
    clearTimeout(changeTimeoutRef.current);
    changeTimeoutRef.current = setTimeout(() => {
      onCodeChange(file.id, value || '');
    }, 50);
  }, [file.id, onCodeChange]);

  const handleAddComment = useCallback(() => {
    if (contextMenu && commentText.trim()) {
      onAddComment(file.id, contextMenu.line, commentText.trim());
      setCommentText('');
      setContextMenu(null);
    }
  }, [contextMenu, commentText, onAddComment, file.id]);

  return (
    <div style={styles.root}>
      {/* Editor toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <span style={styles.toolbarLabel}>v{file.version || 1}</span>
          <span style={styles.toolbarDot}>·</span>
          <span style={styles.toolbarLabel}>{file.language}</span>
          {peers.length > 0 && (
            <>
              <span style={styles.toolbarDot}>·</span>
              <span style={{ ...styles.toolbarLabel, color: 'var(--accent-green)' }}>
                {peers.length} editing
              </span>
            </>
          )}
        </div>
        <div style={styles.toolbarRight}>
          <button className="btn btn-ghost" style={styles.toolBtn} onClick={() => onRequestDiff(file.id)} title="View diff">
            ⚡ Diff
          </button>
          <button className="btn btn-ghost" style={styles.toolBtn} onClick={() => editorRef.current?.getAction('editor.action.formatDocument')?.run()} title="Format document">
            ⌨ Format
          </button>
          {onRunCode && (
            <button className="btn btn-ghost" style={{ ...styles.toolBtn, color: '#23D18B', borderColor: 'rgba(35,209,139,0.2)' }} onClick={() => onRunCode(file)} title="Run code (Ctrl+Enter)">
              ▶ Run
            </button>
          )}
        </div>
      </div>

      {/* Monaco editor */}
      <div style={styles.editorWrap}>
        <Editor
          language={file.language}
          value={file.content}
          onChange={handleChange}
          onMount={handleEditorMount}
          options={{ automaticLayout: true }}
          theme="collab-dark"
          loading={
            <div style={styles.loading}>
              <span className="spinner" />
              <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 10 }}>Loading editor…</span>
            </div>
          }
        />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div style={{ ...styles.ctxMenu, left: Math.min(contextMenu.x, window.innerWidth - 220), top: contextMenu.y }}>
          <div style={styles.ctxHeader}>Line {contextMenu.line}</div>
          <div style={styles.ctxDivider} />
          <div style={styles.ctxItem}>
            <input
              className="input"
              style={{ fontSize: 11 }}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddComment();
                if (e.key === 'Escape') setContextMenu(null);
              }}
              placeholder="Add review comment…"
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: 6, padding: '6px 10px' }}>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }} onClick={handleAddComment}>Add</button>
            <button className="btn" style={{ fontSize: 11 }} onClick={() => setContextMenu(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' },
  toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px', background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 },
  toolbarLeft: { display: 'flex', alignItems: 'center', gap: 6 },
  toolbarLabel: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' },
  toolbarDot: { color: 'var(--text-disabled)' },
  toolbarRight: { display: 'flex', gap: 4 },
  toolBtn: { padding: '3px 8px', fontSize: 11 },
  editorWrap: { flex: 1, overflow: 'hidden' },
  loading: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D1117' },
  ctxMenu: { position: 'fixed', zIndex: 1000, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', width: 220, overflow: 'hidden' },
  ctxHeader: { padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' },
  ctxDivider: { height: 1, background: 'var(--border-subtle)' },
  ctxItem: { padding: '8px 10px' },
};
