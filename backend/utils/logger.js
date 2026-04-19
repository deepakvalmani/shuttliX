/**
 * utils/logger.js
 * Lightweight structured logger — drops Winston/Pino dependency.
 * In production, pipe stdout to a log aggregator (Datadog, Papertrail, etc.)
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const COLORS = {
  error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m', debug: '\x1b[90m', reset: '\x1b[0m',
};

const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? (process.env.NODE_ENV === 'development' ? LEVELS.debug : LEVELS.info);

const log = (level, ...args) => {
  if (LEVELS[level] > currentLevel) return;

  const ts = new Date().toISOString();

  if (process.env.NODE_ENV === 'production') {
    // Structured JSON for log aggregators
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
    process.stdout.write(JSON.stringify({ ts, level, msg }) + '\n');
  } else {
    const color = COLORS[level] || '';
    console[level === 'error' ? 'error' : 'log'](
      `${color}[${ts}] [${level.toUpperCase()}]${COLORS.reset}`,
      ...args
    );
  }
};

module.exports = {
  error: (...a) => log('error', ...a),
  warn:  (...a) => log('warn',  ...a),
  info:  (...a) => log('info',  ...a),
  debug: (...a) => log('debug', ...a),
};
