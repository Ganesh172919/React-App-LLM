const { getConfig } = require("../config");
const fs = require("fs");
const path = require("path");

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

class Logger {
  constructor() {
    const config = getConfig();
    this.level = config.logging.level;
    this.enableConsole = config.logging.enableConsole;
    this.enableFile = config.logging.enableFile;
    this.filePath = config.logging.filePath;
    this.contextData = {};

    if (this.enableFile) {
      this._ensureLogDirectory();
    }
  }

  _ensureLogDirectory() {
    if (!fs.existsSync(this.filePath)) {
      fs.mkdirSync(this.filePath, { recursive: true });
    }
  }

  _shouldLog(level) {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
  }

  _formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const context = { ...this.contextData, ...meta };
    return {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...context,
      ...(meta.error && {
        error: {
          message: meta.error.message,
          stack: meta.error.stack,
          code: meta.error.code,
        },
      }),
    };
  }

  _writeToConsole(level, formatted) {
    if (!this.enableConsole) return;

    const colorMap = {
      error: "\x1b[31m",
      warn: "\x1b[33m",
      info: "\x1b[36m",
      http: "\x1b[35m",
      debug: "\x1b[90m",
    };
    const reset = "\x1b[0m";
    const color = colorMap[level] || reset;

    const logLine = `${color}[${formatted.timestamp}] [${formatted.level}]${reset} ${formatted.message}`;

    const metaKeys = Object.keys(formatted).filter(
      (k) => !["timestamp", "level", "message"].includes(k)
    );

    if (metaKeys.length > 0) {
      const metaObj = {};
      metaKeys.forEach((k) => (metaObj[k] = formatted[k]));
      console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
        logLine,
        JSON.stringify(metaObj)
      );
    } else {
      console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
        logLine
      );
    }
  }

  _writeToFile(formatted) {
    if (!this.enableFile) return;
    try {
      const date = new Date().toISOString().split("T")[0];
      const filePath = path.join(this.filePath, `app-${date}.log`);
      const line = JSON.stringify(formatted) + "\n";
      fs.appendFileSync(filePath, line);
    } catch (err) {
      console.error("Failed to write log to file:", err.message);
    }
  }

  _log(level, message, meta = {}) {
    if (!this._shouldLog(level)) return;
    const formatted = this._formatMessage(level, message, meta);
    this._writeToConsole(level, formatted);
    this._writeToFile(formatted);
    return formatted;
  }

  error(message, meta = {}) {
    return this._log("error", message, meta);
  }
  warn(message, meta = {}) {
    return this._log("warn", message, meta);
  }
  info(message, meta = {}) {
    return this._log("info", message, meta);
  }
  http(message, meta = {}) {
    return this._log("http", message, meta);
  }
  debug(message, meta = {}) {
    return this._log("debug", message, meta);
  }

  child(context) {
    const childLogger = new Logger();
    childLogger.contextData = { ...this.contextData, ...context };
    return childLogger;
  }

  startTimer(label) {
    const start = process.hrtime.bigint();
    return {
      end: (meta = {}) => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1e6;
        this.info(`${label} completed`, { ...meta, durationMs });
        return durationMs;
      },
    };
  }
}

const logger = new Logger();

function httpLoggerMiddleware(req, res, next) {
  const start = Date.now();
  const originalEnd = res.end;

  res.end = function (...args) {
    const duration = Date.now() - start;
    logger.http("HTTP Request", {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      userId: req.user?.id,
    });
    originalEnd.apply(res, args);
  };

  next();
}

module.exports = { logger, httpLoggerMiddleware };
