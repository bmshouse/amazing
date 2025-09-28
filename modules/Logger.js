// modules/Logger.js - Centralized logging system
export class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.enabled = options.enabled !== false;
    this.prefix = options.prefix || '';

    // Log levels in order of severity
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  shouldLog(level) {
    return this.enabled && this.levels[level] <= this.levels[this.level];
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = this.prefix ? `[${this.prefix}] ` : '';
    return [`[${timestamp}] ${prefix}${level.toUpperCase()}:`, message, ...args];
  }

  error(message, ...args) {
    if (this.shouldLog('error')) {
      console.error(...this.formatMessage('error', message, ...args));
    }
  }

  warn(message, ...args) {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatMessage('warn', message, ...args));
    }
  }

  info(message, ...args) {
    if (this.shouldLog('info')) {
      console.log(...this.formatMessage('info', message, ...args));
    }
  }

  debug(message, ...args) {
    if (this.shouldLog('debug')) {
      console.log(...this.formatMessage('debug', message, ...args));
    }
  }

  // Performance logging
  time(label) {
    if (this.shouldLog('debug')) {
      console.time(this.prefix ? `${this.prefix}:${label}` : label);
    }
  }

  timeEnd(label) {
    if (this.shouldLog('debug')) {
      console.timeEnd(this.prefix ? `${this.prefix}:${label}` : label);
    }
  }

  // Create child logger with different settings
  child(options = {}) {
    return new Logger({
      level: this.level,
      enabled: this.enabled,
      prefix: options.prefix || this.prefix,
      ...options
    });
  }
}

// Default logger instance
export const logger = new Logger({
  level: (typeof window !== 'undefined' && window.location?.hostname === 'localhost') ? 'debug' : 'info',
  prefix: 'CalmMaze'
});