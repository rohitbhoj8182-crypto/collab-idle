const isDev = process.env.NODE_ENV !== 'production';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const COLORS = {
  error: '\x1b[31m', // red
  warn: '\x1b[33m',  // yellow
  info: '\x1b[36m',  // cyan
  debug: '\x1b[90m', // gray
  reset: '\x1b[0m',
};

function formatLog(level, ...args) {
  const ts = new Date().toISOString();
  const color = COLORS[level] || '';
  const reset = COLORS.reset;
  const prefix = `${color}[${ts}] [${level.toUpperCase()}]${reset}`;
  return `${prefix} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`;
}

const logger = {
  error: (...args) => console.error(formatLog('error', ...args)),
  warn: (...args) => console.warn(formatLog('warn', ...args)),
  info: (...args) => console.log(formatLog('info', ...args)),
  debug: (...args) => { if (isDev) console.log(formatLog('debug', ...args)); },
};

module.exports = { logger };
