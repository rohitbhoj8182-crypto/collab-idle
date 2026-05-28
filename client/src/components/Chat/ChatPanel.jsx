import React, { useState, useRef, useEffect, useCallback } from 'react';

export function ChatPanel({ messages, myPeerId, onSend }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
    inputRef.current?.focus();
  }, [text, onSend]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <span style={styles.headerIcon}>💬</span>
          <span style={styles.headerText}>Team Chat</span>
        </div>
        <span style={styles.msgCount}>{messages.length}</span>
      </div>

      {/* Messages */}
      <div style={styles.messages}>
        {messages.length === 0 && (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>💬</div>
            <p style={styles.emptyText}>No messages yet</p>
            <p style={styles.emptySubtext}>Start the conversation!</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.peerId === myPeerId;
          const showAuthor = i === 0 || messages[i-1]?.peerId !== msg.peerId;

          return (
            <div key={msg.id} style={{ ...styles.msgGroup, ...(isMe ? styles.msgGroupMe : {}) }}>
              {!isMe && showAuthor && (
                <div style={styles.msgMeta}>
                  <span style={{ ...styles.msgDot, background: msg.authorColor }} />
                  <span style={styles.msgAuthor}>{msg.author}</span>
                  <span style={styles.msgTime}>{formatTime(msg.timestamp)}</span>
                </div>
              )}
              <div style={{ ...styles.msgBubble, ...(isMe ? styles.msgBubbleMe : styles.msgBubbleOther) }}>
                <p style={styles.msgText}>{msg.text}</p>
              </div>
              {isMe && (
                <div style={{ ...styles.msgMeta, justifyContent: 'flex-end' }}>
                  <span style={styles.msgTime}>{formatTime(msg.timestamp)}</span>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={styles.inputArea}>
        <textarea
          ref={inputRef}
          style={styles.textarea}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          maxLength={500}
          rows={1}
        />
        <button
          className="btn btn-primary"
          style={styles.sendBtn}
          onClick={handleSend}
          disabled={!text.trim()}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

const styles = {
  root: { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  headerTitle: { display: 'flex', alignItems: 'center', gap: 8 },
  headerIcon: { fontSize: 14 },
  headerText: { fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-secondary)', textTransform: 'uppercase' },
  msgCount: { fontSize: 10, fontWeight: 700, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '1px 7px', color: 'var(--text-muted)' },
  messages: { flex: 1, overflow: 'auto', padding: '12px 12px 8px', display: 'flex', flexDirection: 'column', gap: 2 },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 8 },
  emptyIcon: { fontSize: 32 },
  emptyText: { color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 },
  emptySubtext: { color: 'var(--text-disabled)', fontSize: 11 },
  msgGroup: { display: 'flex', flexDirection: 'column', gap: 2, maxWidth: '90%', alignSelf: 'flex-start' },
  msgGroupMe: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  msgMeta: { display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 4, paddingRight: 4 },
  msgDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  msgAuthor: { fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em' },
  msgTime: { fontSize: 10, color: 'var(--text-disabled)', marginLeft: 'auto' },
  msgBubble: { padding: '8px 12px', borderRadius: 10, maxWidth: '100%', wordBreak: 'break-word' },
  msgBubbleOther: { background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderTopLeftRadius: 3 },
  msgBubbleMe: { background: 'linear-gradient(135deg, rgba(0,217,255,0.15), rgba(124,111,255,0.15))', border: '1px solid rgba(0,217,255,0.2)', borderTopRightRadius: 3 },
  msgText: { fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  inputArea: { padding: '10px 12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 },
  textarea: { flex: 1, background: 'var(--bg-base)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: 12, padding: '8px 10px', resize: 'none', outline: 'none', minHeight: 36, maxHeight: 100, overflowY: 'auto', lineHeight: 1.5, transition: 'border-color 0.15s' },
  sendBtn: { width: 36, height: 36, padding: 0, justifyContent: 'center', fontSize: 16, borderRadius: 8, flexShrink: 0 },
};
