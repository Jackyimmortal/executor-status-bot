'use strict';

function log(level, msg, meta = '') {
  const time = new Date().toISOString();
  console.log(`[${time}] [${level.toUpperCase()}] ${msg}`, meta);
}

module.exports = {
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta)
};
