const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const {
  addPeer, removePeer, updateFileContent,
  addFile, deleteFile, getRoomSnapshot,
  getOrCreateRoom, rooms,
} = require('../utils/roomStore');

// ── Message types ──────────────────────────────────────────────────────────────
const MSG = {
  // Client → Server
  JOIN: 'JOIN',
  LEAVE: 'LEAVE',
  CODE_CHANGE: 'CODE_CHANGE',
  CURSOR_MOVE: 'CURSOR_MOVE',
  CURSOR_SELECT: 'CURSOR_SELECT',
  ADD_FILE: 'ADD_FILE',
  DELETE_FILE: 'DELETE_FILE',
  SWITCH_FILE: 'SWITCH_FILE',
  REVIEW_COMMENT: 'REVIEW_COMMENT',
  REQUEST_DIFF: 'REQUEST_DIFF',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  PING: 'PING',
  // Server → Client
  ROOM_STATE: 'ROOM_STATE',
  PEER_JOINED: 'PEER_JOINED',
  PEER_LEFT: 'PEER_LEFT',
  CODE_UPDATE: 'CODE_UPDATE',
  CURSOR_UPDATE: 'CURSOR_UPDATE',
  FILE_ADDED: 'FILE_ADDED',
  FILE_DELETED: 'FILE_DELETED',
  FILE_SWITCHED: 'FILE_SWITCHED',
  REVIEW_UPDATE: 'REVIEW_UPDATE',
  DIFF_RESULT: 'DIFF_RESULT',
  CHAT_UPDATE: 'CHAT_UPDATE',
  ERROR: 'ERROR',
  PONG: 'PONG',
};

const HEARTBEAT_INTERVAL = 30000;
const MAX_PAYLOAD_SIZE = 1024 * 512; // 512 KB

function send(ws, type, payload) {
  if (ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify({ type, ...payload, ts: Date.now() }));
  } catch (e) {
    console.error('[WS] Send error:', e.message);
  }
}

function broadcast(roomId, type, payload, excludePeerId = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  const msg = JSON.stringify({ type, ...payload, ts: Date.now() });
  for (const [peerId, peer] of room.peers.entries()) {
    if (peerId === excludePeerId) continue;
    if (peer.ws && peer.ws.readyState === WebSocket.OPEN) {
      try { peer.ws.send(msg); } catch (_) { /* ignore */ }
    }
  }
}

function setupWebSocketServer(wss) {
  // Heartbeat to detect zombie connections
  const heartbeat = setInterval(() => {
    wss.clients.forEach(ws => {
      if (ws.isAlive === false) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on('close', () => clearInterval(heartbeat));

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.peerId = null;
    ws.roomId = null;

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (raw) => {
      if (raw.length > MAX_PAYLOAD_SIZE) {
        send(ws, MSG.ERROR, { message: 'Payload too large' });
        return;
      }
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        send(ws, MSG.ERROR, { message: 'Invalid JSON' });
        return;
      }
      handleMessage(ws, msg);
    });

    ws.on('close', () => handleDisconnect(ws));
    ws.on('error', (err) => console.error('[WS] Client error:', err.message));
  });

  console.log('[WS] WebSocket server initialized');
}

function handleMessage(ws, msg) {
  const { type, ...data } = msg;

  switch (type) {
    case MSG.PING:
      send(ws, MSG.PONG, {});
      break;
    case MSG.JOIN:
      handleJoin(ws, data);
      break;
    case MSG.CODE_CHANGE:
      handleCodeChange(ws, data);
      break;
    case MSG.CURSOR_MOVE:
    case MSG.CURSOR_SELECT:
      handleCursorUpdate(ws, type, data);
      break;
    case MSG.ADD_FILE:
      handleAddFile(ws, data);
      break;
    case MSG.DELETE_FILE:
      handleDeleteFile(ws, data);
      break;
    case MSG.SWITCH_FILE:
      handleSwitchFile(ws, data);
      break;
    case MSG.REVIEW_COMMENT:
      handleReviewComment(ws, data);
      break;
    case MSG.REQUEST_DIFF:
      handleRequestDiff(ws, data);
      break;
    case MSG.CHAT_MESSAGE:
      handleChatMessage(ws, data);
      break;
    default:
      // silently ignore unknown types (PONG, etc.)
      break;
  }
}

function handleJoin(ws, { roomId, name }) {
  if (!roomId) { send(ws, MSG.ERROR, { message: 'roomId required' }); return; }

  const peerId = uuidv4();
  ws.peerId = peerId;
  ws.roomId = roomId;

  const peer = addPeer(roomId, peerId, name || 'Anonymous', ws);
  const snapshot = getRoomSnapshot(roomId);

  // Send full state to new peer — peer is their own info
  send(ws, MSG.ROOM_STATE, { peer, room: snapshot });

  // Notify others of the new peer (exclude self)
  broadcast(roomId, MSG.PEER_JOINED, {
    peer: { id: peer.id, name: peer.name, color: peer.color, cursor: peer.cursor },
  }, peerId);

  console.log(`[WS] ${peer.name} (${peerId}) joined room ${roomId}`);
}

function handleCodeChange(ws, { fileId, content, version }) {
  if (!ws.roomId || !ws.peerId) return;
  const file = updateFileContent(ws.roomId, fileId, content, version);
  if (!file) return;

  broadcast(ws.roomId, MSG.CODE_UPDATE, {
    fileId,
    content,
    version,
    peerId: ws.peerId,
  }, ws.peerId);
}

function handleCursorUpdate(ws, type, { fileId, line, column, selectionStart, selectionEnd }) {
  if (!ws.roomId || !ws.peerId) return;
  const room = rooms.get(ws.roomId);
  if (!room) return;
  const peer = room.peers.get(ws.peerId);
  if (!peer) return;

  peer.cursor = { line, column, fileId, selectionStart, selectionEnd };

  // Send peerId explicitly so client reducer can look up the peer
  broadcast(ws.roomId, MSG.CURSOR_UPDATE, {
    peerId: ws.peerId,
    cursor: peer.cursor,
  }, ws.peerId);
}

function handleAddFile(ws, { name, language }) {
  if (!ws.roomId) return;
  const file = addFile(ws.roomId, name, language);
  if (!file) return;
  // Broadcast to ALL including sender so their sidebar updates
  broadcast(ws.roomId, MSG.FILE_ADDED, { file }, null);
}

function handleDeleteFile(ws, { fileId }) {
  if (!ws.roomId) return;
  const deleted = deleteFile(ws.roomId, fileId);
  if (deleted) broadcast(ws.roomId, MSG.FILE_DELETED, { fileId }, null);
}

function handleSwitchFile(ws, { fileId }) {
  if (!ws.roomId) return;
  broadcast(ws.roomId, MSG.FILE_SWITCHED, { fileId, peerId: ws.peerId }, ws.peerId);
}

function handleReviewComment(ws, { fileId, lineNumber, comment }) {
  if (!ws.roomId || !ws.peerId) return;
  const room = rooms.get(ws.roomId);
  if (!room) return;
  const peer = room.peers.get(ws.peerId);

  const reviewComment = {
    id: uuidv4(),
    fileId,
    lineNumber,
    comment,
    author: peer ? peer.name : 'Anonymous',
    authorColor: peer ? peer.color : '#fff',
    peerId: ws.peerId,
    timestamp: Date.now(),
  };

  // Broadcast to ALL so author also sees their comment
  broadcast(ws.roomId, MSG.REVIEW_UPDATE, { comment: reviewComment }, null);
}

function handleRequestDiff(ws, { fileId }) {
  if (!ws.roomId) return;
  const room = rooms.get(ws.roomId);
  if (!room) return;
  const file = room.files.get(fileId);
  if (!file) return;

  const historySnapshot = file.history.slice(-10).map(h => ({
    version: h.version,
    timestamp: h.timestamp,
    content: h.content,
  }));

  send(ws, MSG.DIFF_RESULT, {
    fileId,
    currentContent: file.content,
    currentVersion: file.version,
    history: historySnapshot,
  });
}

function handleChatMessage(ws, { text }) {
  if (!ws.roomId || !ws.peerId || !text?.trim()) return;
  const room = rooms.get(ws.roomId);
  if (!room) return;
  const peer = room.peers.get(ws.peerId);

  const chatMsg = {
    id: uuidv4(),
    text: text.trim().slice(0, 500),
    author: peer ? peer.name : 'Anonymous',
    authorColor: peer ? peer.color : '#fff',
    peerId: ws.peerId,
    timestamp: Date.now(),
  };

  // Broadcast to ALL including sender
  broadcast(ws.roomId, MSG.CHAT_UPDATE, { message: chatMsg }, null);
}

function handleDisconnect(ws) {
  if (!ws.roomId || !ws.peerId) return;
  const room = rooms.get(ws.roomId);
  const peer = room?.peers.get(ws.peerId);

  removePeer(ws.roomId, ws.peerId);
  broadcast(ws.roomId, MSG.PEER_LEFT, { peerId: ws.peerId }, ws.peerId);

  if (peer) console.log(`[WS] ${peer.name} (${ws.peerId}) left room ${ws.roomId}`);
}

module.exports = { setupWebSocketServer, MSG };
