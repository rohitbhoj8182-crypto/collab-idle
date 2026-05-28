import { useReducer, useCallback } from 'react';

const initialState = {
  roomId: null,
  peer: null,         // my own peer info {id, name, color}
  peers: {},          // other peers keyed by peerId
  files: {},          // files keyed by fileId
  activeFileId: null,
  chatMessages: [],
  reviewComments: [],
  isConnected: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ROOM_STATE': {
      const { peer, room } = action.payload;
      const files = {};
      (room.files || []).forEach(f => { files[f.id] = f; });
      const peers = {};
      (room.peers || []).forEach(p => { peers[p.id] = p; });
      return {
        ...state,
        roomId: room.id,
        peer,
        peers,
        files,
        activeFileId: room.activeFileId || (room.files?.[0]?.id ?? null),
        isConnected: true,
      };
    }
    case 'PEER_JOINED': {
      const p = action.payload.peer;
      if (!p || !p.id) return state;
      return { ...state, peers: { ...state.peers, [p.id]: p } };
    }
    case 'PEER_LEFT': {
      const peerId = action.payload.peerId;
      if (!peerId) return state;
      const { [peerId]: _, ...rest } = state.peers;
      return { ...state, peers: rest };
    }
    case 'CODE_UPDATE': {
      const { fileId, content, version } = action.payload;
      const file = state.files[fileId];
      if (!file) return state;
      return { ...state, files: { ...state.files, [fileId]: { ...file, content, version } } };
    }
    case 'CURSOR_UPDATE': {
      // Server sends: { peerId, cursor: { line, column, fileId, selectionStart, selectionEnd } }
      const { peerId, cursor } = action.payload;
      const peer = state.peers[peerId];
      if (!peer) return state;
      return { ...state, peers: { ...state.peers, [peerId]: { ...peer, cursor } } };
    }
    case 'FILE_ADDED': {
      const f = action.payload.file;
      if (!f) return state;
      return { ...state, files: { ...state.files, [f.id]: f }, activeFileId: f.id };
    }
    case 'FILE_DELETED': {
      const { fileId } = action.payload;
      const { [fileId]: removed, ...remainingFiles } = state.files;
      const ids = Object.keys(remainingFiles);
      return {
        ...state,
        files: remainingFiles,
        activeFileId: state.activeFileId === fileId ? (ids[0] || null) : state.activeFileId,
      };
    }
    case 'SWITCH_FILE':
      return { ...state, activeFileId: action.payload.fileId };
    case 'LOCAL_CODE_CHANGE': {
      const { fileId, content, version } = action.payload;
      const file = state.files[fileId];
      if (!file) return state;
      return { ...state, files: { ...state.files, [fileId]: { ...file, content, version } } };
    }
    case 'CHAT_UPDATE': {
      const msg = action.payload.message;
      if (!msg) return state;
      return { ...state, chatMessages: [...state.chatMessages.slice(-200), msg] };
    }
    case 'REVIEW_UPDATE': {
      const comment = action.payload.comment;
      if (!comment) return state;
      return { ...state, reviewComments: [...state.reviewComments, comment] };
    }
    case 'SET_DISCONNECTED':
      return { ...state, isConnected: false };
    default:
      return state;
  }
}

export function useCollabState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleMessage = useCallback((msg) => {
    if (!msg || !msg.type) return;
    switch (msg.type) {
      case 'ROOM_STATE':
        dispatch({ type: 'SET_ROOM_STATE', payload: msg });
        break;
      case 'PEER_JOINED':
        dispatch({ type: 'PEER_JOINED', payload: msg });
        break;
      case 'PEER_LEFT':
        dispatch({ type: 'PEER_LEFT', payload: msg });
        break;
      case 'CODE_UPDATE':
        dispatch({ type: 'CODE_UPDATE', payload: msg });
        break;
      case 'CURSOR_UPDATE':
        dispatch({ type: 'CURSOR_UPDATE', payload: msg });
        break;
      case 'FILE_ADDED':
        dispatch({ type: 'FILE_ADDED', payload: msg });
        break;
      case 'FILE_DELETED':
        dispatch({ type: 'FILE_DELETED', payload: msg });
        break;
      case 'FILE_SWITCHED':
        dispatch({ type: 'SWITCH_FILE', payload: msg });
        break;
      case 'CHAT_UPDATE':
        dispatch({ type: 'CHAT_UPDATE', payload: msg });
        break;
      case 'REVIEW_UPDATE':
        dispatch({ type: 'REVIEW_UPDATE', payload: msg });
        break;
      // ignore PONG, ERROR, etc.
      default:
        break;
    }
  }, []);

  return { state, dispatch, handleMessage };
}
