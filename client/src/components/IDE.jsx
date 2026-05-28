import React, { useState, useCallback, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { useCollabState } from '../hooks/useCollabState.js';
import { TopBar } from './TopBar/TopBar.jsx';
import { Sidebar } from './Sidebar/Sidebar.jsx';
import { EditorPane } from './Editor/EditorPane.jsx';
import { ChatPanel } from './Chat/ChatPanel.jsx';
import { DiffViewer } from './Diff/DiffViewer.jsx';
import { RunOutput } from './Run/RunOutput.jsx';

export function IDE({ roomId, userName, token, onLogout }) {
  const { state, dispatch, handleMessage } = useCollabState();
  const [rightPanel, setRightPanel] = useState('run');
  const versionRef = useRef({});

  const { send, status } = useWebSocket({ roomId, userName, onMessage: handleMessage });

  const handleCodeChange = useCallback((fileId, content) => {
    if (!versionRef.current[fileId]) versionRef.current[fileId] = 1;
    versionRef.current[fileId]++;
    const version = versionRef.current[fileId];
    dispatch({ type: 'LOCAL_CODE_CHANGE', payload: { fileId, content, version } });
    send('CODE_CHANGE', { fileId, content, version });
  }, [send, dispatch]);

  const handleCursorMove = useCallback((fileId, line, column) => {
    send('CURSOR_MOVE', { fileId, line, column });
  }, [send]);

  const handleCursorSelect = useCallback((fileId, line, column, selectionStart, selectionEnd) => {
    send('CURSOR_SELECT', { fileId, line, column, selectionStart, selectionEnd });
  }, [send]);

  const handleAddFile = useCallback((name, language) => {
    send('ADD_FILE', { name, language });
  }, [send]);

  const handleDeleteFile = useCallback((fileId) => {
    send('DELETE_FILE', { fileId });
  }, [send]);

  const handleSwitchFile = useCallback((fileId) => {
    dispatch({ type: 'SWITCH_FILE', payload: { fileId } });
    send('SWITCH_FILE', { fileId });
  }, [send, dispatch]);

  const handleSendChat = useCallback((text) => {
    send('CHAT_MESSAGE', { text });
  }, [send]);

  const handleAddComment = useCallback((fileId, lineNumber, comment) => {
    send('REVIEW_COMMENT', { fileId, lineNumber, comment });
  }, [send]);

  const handleRequestDiff = useCallback((fileId) => {
    send('REQUEST_DIFF', { fileId });
    setRightPanel('diff');
  }, [send]);

  const activeFile = state.activeFileId ? state.files[state.activeFileId] : null;
  // peers is a dict keyed by peerId; filter those editing the active file
  const peersArray = Object.values(state.peers);
  const peersInFile = peersArray.filter(p => p.cursor?.fileId === state.activeFileId);

  return (
    <div style={styles.root}>
      <TopBar
        roomId={roomId}
        status={status}
        peer={state.peer}
        peers={peersArray}
        activeFile={activeFile}
        rightPanel={rightPanel}
        onRightPanelChange={setRightPanel}
        onLogout={onLogout}
      />
      <div style={styles.workspace}>
        <Sidebar
          files={Object.values(state.files)}
          activeFileId={state.activeFileId}
          peers={peersArray}
          width={220}
          onFileSelect={handleSwitchFile}
          onAddFile={handleAddFile}
          onDeleteFile={handleDeleteFile}
        />
        <div style={styles.editorArea}>
          {activeFile ? (
            <EditorPane
              file={activeFile}
              peers={peersInFile}
              myPeerId={state.peer?.id}
              onCodeChange={handleCodeChange}
              onCursorMove={handleCursorMove}
              onCursorSelect={handleCursorSelect}
              onAddComment={handleAddComment}
              onRequestDiff={handleRequestDiff}
              onRunCode={() => setRightPanel('run')}
            />
          ) : (
            <div style={styles.empty}>
              <p style={{ color: 'var(--text-muted)' }}>No file selected</p>
            </div>
          )}
        </div>
        <div style={styles.rightPanel}>
          {rightPanel === 'run' && (
            <RunOutput file={activeFile} token={token} />
          )}
          {rightPanel === 'chat' && (
            <ChatPanel
              messages={state.chatMessages}
              myPeerId={state.peer?.id}
              onSend={handleSendChat}
            />
          )}
          {rightPanel === 'diff' && (
            <DiffViewer file={activeFile} />
          )}
          {rightPanel === 'review' && (
            <ReviewPanel
              comments={state.reviewComments}
              activeFileId={state.activeFileId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewPanel({ comments, activeFileId }) {
  const filtered = (comments || []).filter(c => c.fileId === activeFileId);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
        Code Review · {filtered.length} comment{filtered.length !== 1 ? 's' : ''}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginTop: 32 }}>No comments yet.<br/>Right-click a line in the editor to add one.</p>
        )}
        {filtered.map(c => (
          <div key={c.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.authorColor, flexShrink: 0 }} />
              <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{c.author}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent-cyan)', marginLeft: 'auto' }}>L{c.lineNumber}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  root: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-void)', overflow: 'hidden' },
  workspace: { flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 },
  editorArea: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },
  rightPanel: { width: 320, borderLeft: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  empty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
};
