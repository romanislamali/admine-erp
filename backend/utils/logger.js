const fs = require('fs');
const path = require('path');

// Plain, dependency-free logger: timestamped/leveled lines to stdout/stderr (so
// `docker logs` keeps working exactly as before) and mirrored to files on disk so
// history survives past Docker's own log retention. Rotates each file once at 5MB,
// keeping a single previous copy, so disk usage stays bounded.
const LOG_DIR = path.join(__dirname, '..', 'logs');
const COMBINED_LOG = path.join(LOG_DIR, 'combined.log');
const ERROR_LOG = path.join(LOG_DIR, 'error.log');
const MAX_LOG_SIZE = 5 * 1024 * 1024;

try {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
} catch (err) {
  console.error('Logger failed to create log directory:', err.message);
}

const rotateIfNeeded = (filePath) => {
  try {
    if (fs.statSync(filePath).size > MAX_LOG_SIZE) {
      fs.renameSync(filePath, `${filePath}.1`);
    }
  } catch {
    // No existing file yet — nothing to rotate.
  }
};

const writeToFile = (filePath, line) => {
  try {
    rotateIfNeeded(filePath);
    fs.appendFileSync(filePath, line + '\n');
  } catch (err) {
    console.error(`Logger failed to write to ${filePath}:`, err.message);
  }
};

const format = (level, message, meta) => {
  const timestamp = new Date().toISOString();
  let metaStr = '';
  if (meta !== undefined) {
    metaStr = ' ' + (meta instanceof Error ? meta.stack : typeof meta === 'string' ? meta : JSON.stringify(meta));
  }
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
};

const log = (level, consoleMethod, message, meta) => {
  const line = format(level, message, meta);
  consoleMethod(line);
  writeToFile(COMBINED_LOG, line);
  if (level === 'ERROR') writeToFile(ERROR_LOG, line);
};

module.exports = {
  info: (message, meta) => log('INFO', console.log, message, meta),
  warn: (message, meta) => log('WARN', console.warn, message, meta),
  error: (message, meta) => log('ERROR', console.error, message, meta),
};
