const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getRoom, createRoom, getRoomSnapshot } = require('../utils/roomStore');

const roomRouter = express.Router();

// POST /api/rooms/create
roomRouter.post('/create', (req, res) => {
  const { name } = req.body;
  // Use a short uppercase room code that's easy to share
  const roomId = uuidv4().split('-')[0].toUpperCase();
  const room = createRoom(roomId, name || 'Untitled Room');
  res.json({ roomId: room.id, name: room.name });
});

// GET /api/rooms/:roomId
roomRouter.get('/:roomId', (req, res) => {
  // Accept both upper and lower case
  const roomId = req.params.roomId.toUpperCase();
  const room = getRoom(roomId) || getRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const snapshot = getRoomSnapshot(room.id);
  res.json(snapshot);
});

// GET /api/rooms/:roomId/peers
roomRouter.get('/:roomId/peers', (req, res) => {
  const roomId = req.params.roomId.toUpperCase();
  const room = getRoom(roomId) || getRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const peers = [...room.peers.values()].map(p => ({
    id: p.id, name: p.name, color: p.color,
  }));
  res.json({ peers });
});

module.exports = { roomRouter };
