/**
 * Advanced Structured Logger
 * Provides structured logging with correlation IDs and performance tracking
 * Phase 6.1: Observability and Metrics Implementation
 */

import { correlationService } from './correlation';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  correlationId?: string;
  requestId?: string;
  userId?: string;
  component: string;
  operation?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata: Record<string, any>;
}

export interface LoggerConfig {
  level: LogLevel;
  component: string;
  enableConsoleOutput: boolean;
  enableFileOutput: boolean;
  enablePerformanceTracking: boolean;
  formatters: {
    console: (entry: LogEntry) => string;
    file: (entry: LogEntry) => string;
  };
}

/**
 * Advanced structured logger with correlation tracking
 */
export class StructuredLogger {
  private config: LoggerConfig;
  private performanceMarks = new Map<string, number>();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      component: 'app',
      enableConsoleOutput: true,
      enableFileOutput: false,
      enablePerformanceTracking: true,
      formatters: {
        console: this.formatForConsole.bind(this),
        file: this.formatForFile.bind(this),
      },
      ...config,
    };
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, metadata: Record<string, any> = {}): void {
    this.log(LogLevel.ERROR, message, {
      ...metadata,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: (error as any).code,
          }
        : undefined,
    });
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata: Record<string, any> = {}): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Log info message
   */
  info(message: string, metadata: Record<string, any> = {}): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata: Record<string, any> = {}): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Log trace message
   */
  trace(message: string, metadata: Record<string, any> = {}): void {
    this.log(LogLevel.TRACE, message, metadata);
  }

  /**
   * Start performance tracking for an operation
   */
  startPerformanceTracking(operation: string): void {
    if (!this.config.enablePerformanceTracking) return;

    const key = `${operation}_${Date.now()}_${Math.random()}`;
    this.performanceMarks.set(operation, performance.now());

    this.debug(`Started operation: ${operation}`, {
      operation,
      trackingKey: key,
    });
  }

  /**
   * End performance tracking and log duration
   */
  endPerformanceTracking(operation: string, metadata: Record<string, any> = {}): number {
    if (!this.config.enablePerformanceTracking) return 0;

    const startTime = this.performanceMarks.get(operation);
    if (!startTime) {
      this.warn(`No start time found for operation: ${operation}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.performanceMarks.delete(operation);

    this.info(`Completed operation: ${operation}`, {
      operation,
      duration: Math.round(duration * 100) / 100,
      ...metadata,
    });

    return duration;
  }

  /**
   * Log with performance tracking (decorator pattern)
   */
  withPerformanceTracking<T>(
    operation: string,
    fn: () => T | Promise<T>,
    metadata: Record<string, any> = {}
  ): T | Promise<T> {
    this.startPerformanceTracking(operation);

    try {
      const result = fn();

      if (result instanceof Promise) {
        return result
          .then((value) => {
            this.endPerformanceTracking(operation, {
              ...metadata,
              success: true,
            });
            return value;
          })
          .catch((error) => {
            this.endPerformanceTracking(operation, {
              ...metadata,
              success: false,
            });
            this.error(`Operation failed: ${operation}`, error, metadata);
            throw error;
          });
      } else {
        this.endPerformanceTracking(operation, { ...metadata, success: true });
        return result;
      }
    } catch (error) {
      this.endPerformanceTracking(operation, { ...metadata, success: false });
      this.error(`Operation failed: ${operation}`, error as Error, metadata);
      throw error;
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, metadata: Record<string, any> = {}): void {
    if (level > this.config.level) return;

    const context = correlationService.getCurrentContext();
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      correlationId: context?.correlationId,
      requestId: context?.requestId,
      userId: context?.userId,
      component: this.config.component,
      operation: metadata.operation,
      duration: metadata.duration,
      error: metadata.error,
      metadata: { ...metadata },
    };

    // Remove processed fields from metadata
    delete entry.metadata.operation;
    delete entry.metadata.duration;
    delete entry.metadata.error;

    this.output(entry);
  }

  /**
   * Output log entry to configured destinations
   */
  private output(entry: LogEntry): void {
    if (this.config.enableConsoleOutput) {
      console.log(this.config.formatters.console(entry));
    }

    if (this.config.enableFileOutput) {
      // File output implementation would go here
      // For now, we'll skip this as it requires additional setup
    }
  }

  /**
   * Format log entry for console output
   */
  private formatForConsole(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level].padEnd(5);
    const correlation = entry.correlationId ? `[${entry.correlationId.substring(0, 8)}]` : '';
    const component = `[${entry.component}]`;
    const operation = entry.operation ? `[${entry.operation}]` : '';
    const duration = entry.duration !== undefined ? `(${entry.duration}ms)` : '';

    let logLine = `${timestamp} ${level} ${correlation}${component}${operation} ${entry.message} ${duration}`;

    if (Object.keys(entry.metadata).length > 0) {
      logLine += ` ${JSON.stringify(entry.metadata)}`;
    }

    if (entry.error) {
      logLine += `\nError: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        logLine += `\n${entry.error.stack}`;
      }
    }

    return logLine;
  }

  /**
   * Format log entry for file output (JSON)
   */
  private formatForFile(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  /**
   * Create child logger with additional context
   */
  child(additionalConfig: Partial<LoggerConfig> = {}): StructuredLogger {
    return new StructuredLogger({
      ...this.config,
      ...additionalConfig,
    });
  }
}

/**
 * Create logger instances for different components
 */
export class LoggerFactory {
  private static loggers = new Map<string, StructuredLogger>();

  static getLogger(component: string, config: Partial<LoggerConfig> = {}): StructuredLogger {
    const key = `${component}_${JSON.stringify(config)}`;

    if (!this.loggers.has(key)) {
      this.loggers.set(
        key,
        new StructuredLogger({
          component,
          ...config,
        })
      );
    }

    return this.loggers.get(key)!;
  }

  static setGlobalLogLevel(level: LogLevel): void {
    this.loggers.forEach((logger) => {
      (logger as any).config.level = level;
    });
  }
}

// Export default logger instances
export const systemLogger = LoggerFactory.getLogger('system');
export const apiLogger = LoggerFactory.getLogger('api');
export const cacheLogger = LoggerFactory.getLogger('cache');
export const sentimentLogger = LoggerFactory.getLogger('sentiment');
export const performanceLogger = LoggerFactory.getLogger('performance');
