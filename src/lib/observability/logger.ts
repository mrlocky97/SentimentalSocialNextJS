/**
 * Unified Logger
 * Provides a simple, level-based logger that respects LOG_LEVEL.
 */

type LogMeta = Record<string, unknown>;
type Level = "error" | "warn" | "info" | "debug";

const levelOrder: Record<Level, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = (process.env.LOG_LEVEL as Level) || "info";

function shouldLog(level: Level): boolean {
  return levelOrder[level] <= levelOrder[currentLevel];
}

function formatMessage(
  level: Level,
  msg: string,
  meta?: LogMeta,
): [string, ...unknown[]] {
  const timestamp = new Date().toISOString();
  const baseLog = `${timestamp} [${level.toUpperCase()}] ${msg}`;

  if (meta && Object.keys(meta).length > 0) {
    return [baseLog, meta];
  }
  return [baseLog];
}

export const logger = {
  error(msg: string, meta?: LogMeta) {
    if (shouldLog("error")) {
      console.error(...formatMessage("error", msg, meta));
    }
  },
  warn(msg: string, meta?: LogMeta) {
    if (shouldLog("warn")) {
      console.warn(...formatMessage("warn", msg, meta));
    }
  },
  info(msg: string, meta?: LogMeta) {
    if (shouldLog("info")) {
      console.log(...formatMessage("info", msg, meta));
    }
  },
  debug(msg: string, meta?: LogMeta) {
    if (shouldLog("debug")) {
      console.debug(...formatMessage("debug", msg, meta));
    }
  },
} as const;
