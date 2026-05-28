const { v4: uuidv4 } = require('uuid');
const { OperationalTransform } = require('../utils/ot');
const { logger } = require('../utils/logger');

class Session {
  constructor(id) {
    this.id = id;
    this.createdAt = Date.now();
    this.peers = new Map(); // clientId -> peer info
    this.files = this._defaultFiles();
    this.activeFile = null;
    this.cursors = new Map(); // clientId -> cursor info
    this.comments = [];
    this.snapshots = [];
    this.chat = [];
    this.revisions = new Map(); // fileId -> revision number
    this.history = new Map(); // fileId -> operation history
  }

  _defaultFiles() {
    const rootId = uuidv4();
    const indexId = uuidv4();
    const styleId = uuidv4();
    const readmeId = uuidv4();

    return {
      [rootId]: {
        id: rootId,
        name: 'project',
        type: 'folder',
        parentId: null,
        children: [indexId, styleId, readmeId],
        createdAt: Date.now(),
      },
      [indexId]: {
        id: indexId,
        name: 'index.js',
        type: 'file',
        parentId: rootId,
        language: 'javascript',
        content: `// Welcome to CollabIDE!\n// Start collaborating in real-time\n\nfunction greet(name) {\n  return \`Hello, \${name}! Let's code together.\`;\n}\n\nconsole.log(greet('World'));\n`,
        createdAt: Date.now(),
      },
      [styleId]: {
        id: styleId,
        name: 'styles.css',
        type: 'file',
        parentId: rootId,
        language: 'css',
        content: `/* CollabIDE Styles */\n\n:root {\n  --primary: #6366f1;\n  --bg: #0f0f1a;\n}\n\nbody {\n  background: var(--bg);\n  color: white;\n  font-family: 'JetBrains Mono', monospace;\n}\n`,
        createdAt: Date.now(),
      },
      [readmeId]: {
        id: readmeId,
        name: 'README.md',
        type: 'file',
        parentId: rootId,
        language: 'markdown',
        content: `# CollabIDE Project\n\nA collaborative coding session.\n\n## Getting Started\n\nEdit any file and see changes sync in real-time!\n`,
        createdAt: Date.now(),
      },
    };
  }

  joinSession(clientId, peerInfo) {
    this.peers.set(clientId, {
      ...peerInfo,
      joinedAt: Date.now(),
      activeFileId: null,
    });
    return this;
  }

  removePeer(clientId) {
    this.peers.delete(clientId);
    this.cursors.delete(clientId);
  }

  getPeers(excludeClientId = null) {
    const peers = [];
    this.peers.forEach((peer, clientId) => {
      if (clientId !== excludeClientId) {
        peers.push({ ...peer, clientId });
      }
    });
    return peers;
  }

  updatePresence(clientId, update) {
    const peer = this.peers.get(clientId);
    if (peer) {
      Object.assign(peer, update);
    }
  }

  applyOperation(fileId, operation, clientRevision, clientId) {
    const file = this.files[fileId];
    if (!file || file.type === 'folder') {
      throw new Error(`File not found: ${fileId}`);
    }

    const currentRevision = this.revisions.get(fileId) || 0;
    const fileHistory = this.history.get(fileId) || [];

    // Get ops since client revision for OT
    const concurrentOps = fileHistory.slice(clientRevision);
    let transformedOp = operation;

    for (const histOp of concurrentOps) {
      transformedOp = OperationalTransform.transform(transformedOp, histOp);
    }

    // Apply to document
    file.content = OperationalTransform.apply(file.content, transformedOp);
    file.updatedAt = Date.now();

    const newRevision = currentRevision + 1;
    this.revisions.set(fileId, newRevision);
    fileHistory.push(transformedOp);
    this.history.set(fileId, fileHistory);

    return { revision: newRevision, transformedOp };
  }

  updateCursor(clientId, cursorData) {
    this.cursors.set(clientId, {
      ...cursorData,
      clientId,
      username: this.peers.get(clientId)?.username,
      color: this.peers.get(clientId)?.color,
      ts: Date.now(),
    });
  }

  getCursors() {
    const cursors = {};
    this.cursors.forEach((cursor, clientId) => {
      cursors[clientId] = cursor;
    });
    return cursors;
  }

  createFile(name, parentId, content = '') {
    const id = uuidv4();
    const isFolder = !name.includes('.');
    const language = this._detectLanguage(name);

    const file = {
      id,
      name,
      type: isFolder ? 'folder' : 'file',
      parentId: parentId || this._getRootId(),
      language,
      content: isFolder ? undefined : content,
      children: isFolder ? [] : undefined,
      createdAt: Date.now(),
    };

    this.files[id] = file;

    // Add to parent's children
    const parent = this.files[file.parentId];
    if (parent && parent.children) {
      parent.children.push(id);
    }

    return file;
  }

  deleteFile(fileId) {
    const file = this.files[fileId];
    if (!file) return;

    // Remove from parent
    if (file.parentId && this.files[file.parentId]) {
      const parent = this.files[file.parentId];
      parent.children = parent.children.filter(id => id !== fileId);
    }

    // Recursively delete children
    if (file.children) {
      file.children.forEach(childId => this.deleteFile(childId));
    }

    delete this.files[fileId];
  }

  renameFile(fileId, newName) {
    const file = this.files[fileId];
    if (file) {
      file.name = newName;
      if (file.type === 'file') {
        file.language = this._detectLanguage(newName);
      }
    }
  }

  addComment({ fileId, lineNumber, text, author, authorId, color }) {
    const comment = {
      id: uuidv4(),
      fileId,
      lineNumber,
      text,
      author,
      authorId,
      color,
      resolved: false,
      createdAt: Date.now(),
      replies: [],
    };
    this.comments.push(comment);
    return comment;
  }

  resolveComment(commentId) {
    const comment = this.comments.find(c => c.id === commentId);
    if (comment) comment.resolved = true;
  }

  deleteComment(commentId, requesterId) {
    const idx = this.comments.findIndex(c => c.id === commentId && c.authorId === requesterId);
    if (idx !== -1) this.comments.splice(idx, 1);
  }

  createSnapshot(label) {
    const snapshot = {
      id: uuidv4(),
      label,
      ts: Date.now(),
      files: JSON.parse(JSON.stringify(this.files)),
    };
    this.snapshots.push(snapshot);
    if (this.snapshots.length > 50) this.snapshots.shift();
    return snapshot;
  }

  restoreSnapshot(snapshotId) {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) return null;
    this.files = JSON.parse(JSON.stringify(snapshot.files));
    this.revisions.clear();
    this.history.clear();
    return snapshot;
  }

  _getRootId() {
    return Object.values(this.files).find(f => f.parentId === null)?.id;
  }

  _detectLanguage(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    const map = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', rb: 'ruby', java: 'java', go: 'go', rs: 'rust',
      cpp: 'cpp', c: 'c', cs: 'csharp', php: 'php', swift: 'swift',
      kt: 'kotlin', css: 'css', scss: 'scss', html: 'html', xml: 'xml',
      json: 'json', md: 'markdown', yaml: 'yaml', yml: 'yaml',
      sh: 'shell', bash: 'shell', sql: 'sql', graphql: 'graphql',
    };
    return map[ext] || 'plaintext';
  }
}

class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  getOrCreateSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new Session(sessionId));
      logger.info(`Session created: ${sessionId}`);
    }
    return this.sessions.get(sessionId);
  }

  joinSession(sessionId, peerInfo) {
    const session = this.getOrCreateSession(sessionId);
    session.joinSession(peerInfo.clientId, peerInfo);
    return session;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  deleteSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  getStats() {
    return {
      totalSessions: this.sessions.size,
      totalPeers: Array.from(this.sessions.values()).reduce((acc, s) => acc + s.peers.size, 0),
    };
  }
}

module.exports = { SessionManager, Session };
