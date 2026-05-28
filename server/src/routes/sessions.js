const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Create a new session
router.post('/', (req, res) => {
  const sessionId = uuidv4();
  res.json({ sessionId, shareUrl: `/session/${sessionId}` });
});

// Get session info (lightweight HTTP endpoint)
router.get('/:sessionId', (req, res) => {
  res.json({
    sessionId: req.params.sessionId,
    wsUrl: `${req.protocol === 'https' ? 'wss' : 'ws'}://${req.get('host')}`,
  });
});

module.exports = router;
