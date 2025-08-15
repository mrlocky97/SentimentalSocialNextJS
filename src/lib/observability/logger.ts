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
  name?: string,
): [string, ...unknown[]] {
  const timestamp = new Date().toISOString();
  const namePart = name ? ` [${name}]` : "";
  const baseLog = `${timestamp}${namePart} [${level.toUpperCase()}] ${msg}`;

  if (meta && Object.keys(meta).length > 0) {
    return [baseLog, meta];
  }
  return [baseLog];
}

export const logger = {
  error(msg: string, errOrMeta?: unknown, meta?: LogMeta, name?: string) {
    if (!shouldLog("error")) return;
    let err: Error | undefined;
    let finalMeta: LogMeta | undefined;

    if (errOrMeta instanceof Error) {
      err = errOrMeta;
      finalMeta = meta;
    } else if (typeof errOrMeta === "object" && errOrMeta !== null) {
      finalMeta = errOrMeta as LogMeta;
    } else {
      finalMeta = meta;
    }

    const parts = formatMessage("error", msg, finalMeta, name);
    if (err) {
      console.error(...parts, { error: err.message, stack: err.stack });
    } else {
      console.error(...parts);
    }
  },
  warn(msg: string, errOrMeta?: unknown, meta?: LogMeta, name?: string) {
    if (!shouldLog("warn")) return;
    let finalMeta: LogMeta | undefined;
    if (errOrMeta instanceof Error) finalMeta = { error: errOrMeta.message };
    else if (typeof errOrMeta === "object" && errOrMeta !== null)
      finalMeta = errOrMeta as LogMeta;
    else finalMeta = meta;
    console.warn(...formatMessage("warn", msg, finalMeta, name));
  },
  info(msg: string, errOrMeta?: unknown, meta?: LogMeta, name?: string) {
    if (!shouldLog("info")) return;
    let finalMeta: LogMeta | undefined;
    if (errOrMeta instanceof Error) finalMeta = { error: errOrMeta.message };
    else if (typeof errOrMeta === "object" && errOrMeta !== null)
      finalMeta = errOrMeta as LogMeta;
    else finalMeta = meta;
    console.log(...formatMessage("info", msg, finalMeta, name));
  },
  debug(msg: string, errOrMeta?: unknown, meta?: LogMeta, name?: string) {
    if (!shouldLog("debug")) return;
    let finalMeta: LogMeta | undefined;
    if (errOrMeta instanceof Error) finalMeta = { error: errOrMeta.message };
    else if (typeof errOrMeta === "object" && errOrMeta !== null)
      finalMeta = errOrMeta as LogMeta;
    else finalMeta = meta;
    console.debug(...formatMessage("debug", msg, finalMeta, name));
  },
} as const;

// Backwards-compatible aliases expected by the codebase
export const systemLogger = logger;
export const apiLogger = logger;

// Minimal LoggerFactory for DI compatibility
export type Logger = typeof logger;
export const LoggerFactory = {
  create(name?: string): Logger {
    // Return a wrapper that binds the provided name into logs
    if (!name) return logger;
    return {
      error: (m: string, a?: unknown, b?: LogMeta) =>
        logger.error(m, a, b, name),
      warn: (m: string, a?: unknown, b?: LogMeta) => logger.warn(m, a, b, name),
      info: (m: string, a?: unknown, b?: LogMeta) => logger.info(m, a, b, name),
      debug: (m: string, a?: unknown, b?: LogMeta) =>
        logger.debug(m, a, b, name),
    } as Logger;
  },
  getLogger(name?: string) {
    return this.create(name);
  },
};
