const express = require('express');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const SUPPORTED_LANGUAGES = {
  javascript: { ext: 'js', cmd: 'node', args: [] },
  typescript: { ext: 'ts', cmd: 'npx', args: ['ts-node', '--skip-project'] },
  python: { ext: 'py', cmd: 'python3', args: [] },
  java: null, // compile-then-run, handled separately
  cpp: null,  // compile-then-run, handled separately
  c: null,
  bash: { ext: 'sh', cmd: 'bash', args: [] },
};

const TIMEOUT_MS = 10000; // 10 second limit
const MAX_OUTPUT = 50 * 1024; // 50KB output cap

// POST /api/run
router.post('/', async (req, res) => {
  const { code, language } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'code and language are required' });
  }

  const langKey = language.toLowerCase();
  const langConfig = SUPPORTED_LANGUAGES[langKey];

  if (langConfig === undefined) {
    return res.status(400).json({ error: `Language '${language}' is not supported for execution` });
  }

  if (langConfig === null) {
    return res.status(400).json({ error: `Language '${language}' requires compilation — not supported in sandbox` });
  }

  const tmpDir = os.tmpdir();
  const fileId = uuidv4();
  const filePath = path.join(tmpDir, `collab-run-${fileId}.${langConfig.ext}`);

  try {
    fs.writeFileSync(filePath, code, 'utf8');
  } catch (err) {
    return res.status(500).json({ error: 'Failed to write temp file' });
  }

  const args = [...langConfig.args, filePath];
  let stdout = '';
  let stderr = '';
  let killed = false;
  const startTime = Date.now();

  const child = spawn(langConfig.cmd, args, {
    timeout: TIMEOUT_MS,
    env: { ...process.env, NODE_ENV: 'sandbox' },
    cwd: tmpDir,
  });

  const killTimer = setTimeout(() => {
    killed = true;
    child.kill('SIGKILL');
  }, TIMEOUT_MS);

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
    if (stdout.length > MAX_OUTPUT) {
      stdout = stdout.slice(0, MAX_OUTPUT) + '\n[output truncated]';
      child.kill('SIGKILL');
    }
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
    if (stderr.length > MAX_OUTPUT) {
      stderr = stderr.slice(0, MAX_OUTPUT) + '\n[stderr truncated]';
    }
  });

  child.on('close', (code) => {
    clearTimeout(killTimer);
    try { fs.unlinkSync(filePath); } catch (_) {}

    const elapsed = Date.now() - startTime;

    if (killed) {
      return res.json({
        success: false,
        stdout,
        stderr: `⏱ Execution timed out after ${TIMEOUT_MS / 1000}s`,
        exitCode: -1,
        elapsed,
      });
    }

    res.json({
      success: code === 0,
      stdout,
      stderr,
      exitCode: code,
      elapsed,
    });
  });

  child.on('error', (err) => {
    clearTimeout(killTimer);
    try { fs.unlinkSync(filePath); } catch (_) {}
    res.status(500).json({ error: `Execution failed: ${err.message}` });
  });
});

module.exports = router;
