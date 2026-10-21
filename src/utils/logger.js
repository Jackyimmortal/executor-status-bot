'use strict';

const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

class Logger {
  constructor(options = {}) {
    this.level = (options.level || process.env.LOG_LEVEL || 'info').toLowerCase();
    this.logDir = options.logDir || path.resolve(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, 'app.log');
    this._ensureLogDir();
  }

  _ensureLogDir() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch {
      // Ignore if dir cannot be created in testing
    }
  }

  _sanitize(message) {
    if (typeof message !== 'string') {
      try {
        message = JSON.stringify(message, null, 2);
      } catch {
        message = String(message);
      }
    }
    // Redact tokens, keys, passwords
    return message
      .replace(/([a-zA-Z0-9_\-]{24}\.[a-zA-Z0-9_\-]{6}\.[a-zA-Z0-9_\-]{27})/g, '[REDACTED_DISCORD_TOKEN]')
      .replace(/(bot\s+token[:=]\s*)([^\s]+)/gi, '$1[REDACTED]')
      .replace(/(key[:=]\s*)([a-zA-Z0-9_\-]{16,})/gi, '$1[REDACTED]')
      .replace(/(bearer\s+)([^\s]+)/gi, '$1[REDACTED]');
  }

  _format(level, message, meta) {
    const timestamp = new Date().toISOString();
    const cleanMsg = this._sanitize(message);
    let output = `[${timestamp}] [${level.toUpperCase()}] ${cleanMsg}`;
    if (meta !== undefined) {
      output += ' ' + this._sanitize(meta);
    }
    return output;
  }

  _write(level, message, meta) {
    const currentWeight = LOG_LEVELS[this.level] || 20;
    const targetWeight = LOG_LEVELS[level] || 20;

    if (targetWeight < currentWeight) {
      return;
    }

    const formatted = this._format(level, message, meta);

    if (level === 'error') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }

    try {
      fs.appendFileSync(this.logFile, formatted + '\n', 'utf8');
    } catch {
      // Ignore file write errors
    }
  }

  debug(message, meta) {
    this._write('debug', message, meta);
  }

  info(message, meta) {
    this._write('info', message, meta);
  }

  warn(message, meta) {
    this._write('warn', message, meta);
  }

  error(message, meta) {
    this._write('error', message, meta);
  }
}

const defaultLogger = new Logger();

module.exports = defaultLogger;
module.exports.Logger = Logger;
