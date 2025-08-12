/**
 * Request Correlation System
 * Manages correlation IDs for distributed tracing and request tracking
 * Phase 6.1: Observability and Metrics Implementation
 */

import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";

export interface RequestContext {
  correlationId: string;
  requestId: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

/**
 * Correlation service for tracking requests across the application
 */
export class CorrelationService {
  private static instance: CorrelationService;
  private asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

  static getInstance(): CorrelationService {
    if (!CorrelationService.instance) {
      CorrelationService.instance = new CorrelationService();
    }
    return CorrelationService.instance;
  }

  /**
   * Initialize correlation context for a request
   */
  initializeContext(req: any): RequestContext {
    const context: RequestContext = {
      correlationId:
        req.headers["x-correlation-id"] || this.generateCorrelationId(),
      requestId: this.generateRequestId(),
      userId: req.user?.id,
      sessionId: req.sessionID,
      userAgent: req.headers["user-agent"],
      ipAddress: this.extractIpAddress(req),
      timestamp: new Date(),
      metadata: {},
    };

    return context;
  }

  /**
   * Run code within a correlation context
   */
  runWithContext<T>(context: RequestContext, callback: () => T): T {
    return this.asyncLocalStorage.run(context, callback);
  }

  /**
   * Get current correlation context
   */
  getCurrentContext(): RequestContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Get current correlation ID
   */
  getCurrentCorrelationId(): string | undefined {
    const context = this.getCurrentContext();
    return context?.correlationId;
  }

  /**
   * Get current request ID
   */
  getCurrentRequestId(): string | undefined {
    const context = this.getCurrentContext();
    return context?.requestId;
  }

  /**
   * Add metadata to current context
   */
  addMetadata(key: string, value: any): void {
    const context = this.getCurrentContext();
    if (context) {
      context.metadata[key] = value;
    }
  }

  /**
   * Get metadata from current context
   */
  getMetadata(key: string): any {
    const context = this.getCurrentContext();
    return context?.metadata[key];
  }

  /**
   * Generate unique correlation ID
   */
  private generateCorrelationId(): string {
    return `corr_${randomUUID()}`;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${randomUUID()}`;
  }

  /**
   * Extract IP address from request
   */
  private extractIpAddress(req: any): string {
    return (
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.headers["x-real-ip"] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      "unknown"
    );
  }

  /**
   * Create child context with additional metadata
   */
  createChildContext(
    additionalMetadata: Record<string, any> = {},
  ): RequestContext | undefined {
    const currentContext = this.getCurrentContext();
    if (!currentContext) return undefined;

    return {
      ...currentContext,
      requestId: this.generateRequestId(),
      metadata: {
        ...currentContext.metadata,
        ...additionalMetadata,
        parentRequestId: currentContext.requestId,
      },
    };
  }
}

// Export singleton instance
export const correlationService = CorrelationService.getInstance();
