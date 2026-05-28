/**
 * In-memory room store with optimized operations
 * In production, replace with Redis for horizontal scaling
 */

const rooms = new Map();

/**
 * @typedef {Object} Room
 * @property {string} id
 * @property {string} name
 * @property {Map<string, Peer>} peers
 * @property {Map<string, FileEntry>} files
 * @property {string} activeFileId
 * @property {number} createdAt
 * @property {number} lastActivity
 */

/**
 * @typedef {Object} Peer
 * @property {string} id
 * @property {string} name
 * @property {string} color
 * @property {WebSocket} ws
 * @property {Object} cursor
 * @property {number} joinedAt
 */

/**
 * @typedef {Object} FileEntry
 * @property {string} id
 * @property {string} name
 * @property {string} language
 * @property {string} content
 * @property {Array} history
 * @property {number} version
 * @property {number} updatedAt
 */

const PEER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#82E0AA', '#F0B27A',
];

const CLEANUP_INTERVAL = 1000 * 60 * 30; // 30 minutes
const ROOM_TTL = 1000 * 60 * 60 * 24; // 24 hours

function createRoom(id, name = 'Untitled Room') {
  const room = {
    id,
    name,
    peers: new Map(),
    files: new Map(),
    activeFileId: null,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };

  // Create default file
  const defaultFileId = 'file_' + Math.random().toString(36).substr(2, 9);
  room.files.set(defaultFileId, {
    id: defaultFileId,
    name: 'main.js',
    language: 'javascript',
    content: '// Welcome to CollabIDE!\n// Start coding together in real-time.\n\nfunction greet(name) {\n  return `Hello, ${name}! Welcome to CollabIDE.`;\n}\n\nconsole.log(greet("World"));\n',
    history: [],
    version: 1,
    updatedAt: Date.now(),
  });
  room.activeFileId = defaultFileId;

  rooms.set(id, room);
  return room;
}

function getRoom(id) {
  return rooms.get(id) || null;
}

function getOrCreateRoom(id) {
  return getRoom(id) || createRoom(id);
}

function addPeer(roomId, peerId, name, ws) {
  const room = getOrCreateRoom(roomId);
  const usedColors = new Set([...room.peers.values()].map(p => p.color));
  const color = PEER_COLORS.find(c => !usedColors.has(c)) || PEER_COLORS[room.peers.size % PEER_COLORS.length];

  const peer = {
    id: peerId,
    name: name || `User ${room.peers.size + 1}`,
    color,
    ws,
    cursor: { line: 0, column: 0, fileId: null },
    joinedAt: Date.now(),
  };

  room.peers.set(peerId, peer);
  room.lastActivity = Date.now();
  return peer;
}

function removePeer(roomId, peerId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.peers.delete(peerId);
  if (room.peers.size === 0) {
    // Keep room alive for reconnects (cleanup via TTL)
    room.lastActivity = Date.now();
  }
}

function updateFileContent(roomId, fileId, content, version) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const file = room.files.get(fileId);
  if (!file) return null;

  // Store history snapshot every 10 versions
  if (version % 10 === 0 && file.content !== content) {
    file.history.push({ content: file.content, version: file.version, timestamp: Date.now() });
    if (file.history.length > 50) file.history.shift(); // Keep last 50 snapshots
  }

  file.content = content;
  file.version = version;
  file.updatedAt = Date.now();
  room.lastActivity = Date.now();
  return file;
}

function addFile(roomId, name, language = 'javascript') {
  const room = rooms.get(roomId);
  if (!room) return null;
  const fileId = 'file_' + Math.random().toString(36).substr(2, 9);
  const file = {
    id: fileId,
    name,
    language,
    content: getLanguageTemplate(language),
    history: [],
    version: 1,
    updatedAt: Date.now(),
  };
  room.files.set(fileId, file);
  room.lastActivity = Date.now();
  return file;
}

function deleteFile(roomId, fileId) {
  const room = rooms.get(roomId);
  if (!room || room.files.size <= 1) return false;
  const deleted = room.files.delete(fileId);
  if (deleted && room.activeFileId === fileId) {
    room.activeFileId = [...room.files.keys()][0];
  }
  return deleted;
}

function getRoomSnapshot(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return {
    id: room.id,
    name: room.name,
    activeFileId: room.activeFileId,
    files: [...room.files.values()].map(f => ({
      id: f.id, name: f.name, language: f.language,
      content: f.content, version: f.version,
    })),
    peers: [...room.peers.values()].map(p => ({
      id: p.id, name: p.name, color: p.color, cursor: p.cursor,
    })),
  };
}

function getLanguageTemplate(lang) {
  const templates = {
    javascript: '// JavaScript file\n\n',
    typescript: '// TypeScript file\n\n',
    python: '# Python file\n\n',
    html: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>\n',
    css: '/* CSS file */\n\n',
    json: '{\n  \n}\n',
    markdown: '# Title\n\n',
    rust: '// Rust file\n\nfn main() {\n    println!("Hello, world!");\n}\n',
    go: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, World!")\n}\n',
    java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
  };
  return templates[lang] || `// ${lang} file\n\n`;
}

// Periodic cleanup of stale rooms
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms.entries()) {
    if (room.peers.size === 0 && now - room.lastActivity > ROOM_TTL) {
      rooms.delete(id);
      console.log(`[RoomStore] Cleaned up stale room: ${id}`);
    }
  }
}, CLEANUP_INTERVAL);

module.exports = {
  createRoom, getRoom, getOrCreateRoom,
  addPeer, removePeer, updateFileContent,
  addFile, deleteFile, getRoomSnapshot,
  rooms,
};
