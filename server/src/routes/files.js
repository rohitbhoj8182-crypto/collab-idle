const express = require('express');
const router = express.Router();

// Placeholder for REST file operations (primary interaction is via WebSocket)
router.get('/languages', (req, res) => {
  res.json({
    languages: [
      'javascript', 'typescript', 'python', 'java', 'go', 'rust',
      'cpp', 'c', 'csharp', 'php', 'swift', 'kotlin', 'ruby',
      'css', 'scss', 'html', 'xml', 'json', 'markdown', 'yaml',
      'shell', 'sql', 'graphql', 'plaintext',
    ],
  });
});

module.exports = router;
