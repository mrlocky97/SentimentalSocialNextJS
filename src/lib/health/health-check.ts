/**
 * Health Check System
 * Comprehensive health monitoring for all system dependencies
 * Phase 6.2: Observability and Metrics Implementation
 */

import { systemLogger } from "../observability/logger";
import { container, TOKENS } from "../dependency-injection/container";
import { AdvancedCacheSystem } from "../cache/advanced-cache";
import { SentimentAnalysisEngine } from "../sentiment/engine";

export enum HealthStatus {
  HEALTHY = "healthy",
  DEGRADED = "degraded",
  UNHEALTHY = "unhealthy",
  UNKNOWN = "unknown",
}

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message: string;
  duration: number; // milliseconds
  timestamp: Date;
  details?: Record<string, any>;
  dependencies?: HealthCheckResult[];
}

export interface HealthCheck {
  name: string;
  check(): Promise<HealthCheckResult>;
  timeout?: number; // milliseconds
  retries?: number;
  critical?: boolean; // if true, failure affects overall system health
}

/**
 * Individual health check implementations
 */
export class HealthChecks {
  /**
   * Check IoC Container health
   */
  static iocContainer(): HealthCheck {
    return {
      name: "ioc-container",
      critical: true,
      timeout: 1000,
      async check(): Promise<HealthCheckResult> {
        const startTime = performance.now();

        try {
          // Check if container has required services
          const requiredTokens = [
            TOKENS.SENTIMENT_ENGINE,
            TOKENS.SENTIMENT_ORCHESTRATOR,
            TOKENS.CACHE_SERVICE,
          ];

          const registrations = container.getRegistrations();
          const missingServices: string[] = [];

          for (const token of requiredTokens) {
            if (!registrations.includes(token)) {
              missingServices.push(String(token));
            } else {
              // Try to resolve the service
              container.resolve(token);
            }
          }

          const duration = performance.now() - startTime;

          if (missingServices.length > 0) {
            return {
              name: "ioc-container",
              status: HealthStatus.UNHEALTHY,
              message: `Missing required services: ${missingServices.join(", ")}`,
              duration,
              timestamp: new Date(),
              details: {
                missingServices,
                totalRegistrations: registrations.length,
                requiredServices: requiredTokens.length,
              },
            };
          }

          return {
            name: "ioc-container",
            status: HealthStatus.HEALTHY,
            message: "IoC container is healthy",
            duration,
            timestamp: new Date(),
            details: {
              totalRegistrations: registrations.length,
              requiredServices: requiredTokens.length,
            },
          };
        } catch (error) {
          const duration = performance.now() - startTime;
          return {
            name: "ioc-container",
            status: HealthStatus.UNHEALTHY,
            message: `IoC container error: ${(error as Error).message}`,
            duration,
            timestamp: new Date(),
            details: {
              error: (error as Error).name,
              stack: (error as Error).stack,
            },
          };
        }
      },
    };
  }

  /**
   * Check Advanced Cache System health
   */
  static advancedCache(): HealthCheck {
    return {
      name: "advanced-cache",
      critical: true,
      timeout: 2000,
      async check(): Promise<HealthCheckResult> {
        const startTime = performance.now();

        try {
          const cacheService = container.resolve<AdvancedCacheSystem>(TOKENS.CACHE_SERVICE);
          
          // Test cache operations
          const testKey = `health-check-${Date.now()}`;
          const testValue = { test: true, timestamp: Date.now() };
          
          // Test set operation
          await cacheService.set(testKey, testValue, {
            ttl: 5000,
            tags: ['health-check'],
          });
          
          // Test get operation
          const retrieved = await cacheService.get<typeof testValue>(testKey);
          
          // Test delete operation
          await cacheService.invalidateByTags(['health-check']);

          const duration = performance.now() - startTime;

          if (!retrieved || retrieved.test !== testValue.test) {
            return {
              name: "advanced-cache",
              status: HealthStatus.DEGRADED,
              message: "Cache operations partially working",
              duration,
              timestamp: new Date(),
              details: {
                setOperation: "success",
                getOperation: retrieved ? "partial" : "failed",
                deleteOperation: "success",
              },
            };
          }

          const metrics = cacheService.getMetrics();

          return {
            name: "advanced-cache",
            status: HealthStatus.HEALTHY,
            message: "Advanced cache is healthy",
            duration,
            timestamp: new Date(),
            details: {
              operations: "all successful",
              metrics: {
                hitRate: metrics.hitRate,
                keyCount: metrics.keyCount,
                memoryUsage: metrics.memoryUsage,
              },
            },
          };
        } catch (error) {
          const duration = performance.now() - startTime;
          return {
            name: "advanced-cache",
            status: HealthStatus.UNHEALTHY,
            message: `Cache system error: ${(error as Error).message}`,
            duration,
            timestamp: new Date(),
            details: {
              error: (error as Error).name,
              stack: (error as Error).stack,
            },
          };
        }
      },
    };
  }

  /**
   * Check Sentiment Analysis Engine health
   */
  static sentimentEngine(): HealthCheck {
    return {
      name: "sentiment-engine",
      critical: true,
      timeout: 5000,
      async check(): Promise<HealthCheckResult> {
        const startTime = performance.now();

        try {
          const sentimentEngine = container.resolve<SentimentAnalysisEngine>(TOKENS.SENTIMENT_ENGINE);

          // Test sentiment analysis with simple text
          const testResult = await sentimentEngine.analyze({
            text: "This is a simple test message for health check",
            language: "en",
          });

          const duration = performance.now() - startTime;

          if (!testResult || !testResult.sentiment) {
            return {
              name: "sentiment-engine",
              status: HealthStatus.DEGRADED,
              message: "Sentiment engine returned invalid result",
              duration,
              timestamp: new Date(),
              details: {
                result: testResult,
              },
            };
          }

          return {
            name: "sentiment-engine",
            status: HealthStatus.HEALTHY,
            message: "Sentiment engine is healthy",
            duration,
            timestamp: new Date(),
            details: {
              testAnalysis: {
                label: testResult.sentiment.label,
                confidence: testResult.sentiment.confidence,
                language: testResult.language,
              },
            },
          };
        } catch (error) {
          const duration = performance.now() - startTime;
          return {
            name: "sentiment-engine",
            status: HealthStatus.UNHEALTHY,
            message: `Sentiment engine error: ${(error as Error).message}`,
            duration,
            timestamp: new Date(),
            details: {
              error: (error as Error).name,
              stack: (error as Error).stack,
            },
          };
        }
      },
    };
  }

  /**
   * Check system memory usage
   */
  static memoryUsage(): HealthCheck {
    return {
      name: "memory-usage",
      critical: false,
      timeout: 1000,
      async check(): Promise<HealthCheckResult> {
        const startTime = performance.now();

        try {
          const memUsage = process.memoryUsage();
          const duration = performance.now() - startTime;

          // Convert bytes to MB
          const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
          const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
          const rssMB = Math.round(memUsage.rss / 1024 / 1024);

          // Memory thresholds
          const warningThreshold = 512; // 512 MB
          const criticalThreshold = 1024; // 1 GB

          let status = HealthStatus.HEALTHY;
          let message = "Memory usage is normal";

          if (heapUsedMB > criticalThreshold) {
            status = HealthStatus.UNHEALTHY;
            message = `High memory usage: ${heapUsedMB}MB`;
          } else if (heapUsedMB > warningThreshold) {
            status = HealthStatus.DEGRADED;
            message = `Elevated memory usage: ${heapUsedMB}MB`;
          }

          return {
            name: "memory-usage",
            status,
            message,
            duration,
            timestamp: new Date(),
            details: {
              heapUsed: `${heapUsedMB}MB`,
              heapTotal: `${heapTotalMB}MB`,
              rss: `${rssMB}MB`,
              external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
              thresholds: {
                warning: `${warningThreshold}MB`,
                critical: `${criticalThreshold}MB`,
              },
            },
          };
        } catch (error) {
          const duration = performance.now() - startTime;
          return {
            name: "memory-usage",
            status: HealthStatus.UNKNOWN,
            message: `Memory check error: ${(error as Error).message}`,
            duration,
            timestamp: new Date(),
            details: {
              error: (error as Error).name,
            },
          };
        }
      },
    };
  }

  /**
   * Check disk space (simplified)
   */
  static diskSpace(): HealthCheck {
    return {
      name: "disk-space",
      critical: false,
      timeout: 2000,
      async check(): Promise<HealthCheckResult> {
        const startTime = performance.now();

        try {
          // Simplified disk check - just verify we can write to temp
          const fs = await import("fs/promises");
          const path = await import("path");
          const tmpFile = path.join(
            process.cwd(),
            "temp",
            `health-${Date.now()}.tmp`,
          );

          await fs.writeFile(tmpFile, "health check");
          await fs.unlink(tmpFile);

          const duration = performance.now() - startTime;

          return {
            name: "disk-space",
            status: HealthStatus.HEALTHY,
            message: "Disk space is available",
            duration,
            timestamp: new Date(),
            details: {
              operation: "write/delete test successful",
              workingDirectory: process.cwd(),
            },
          };
        } catch (error) {
          const duration = performance.now() - startTime;
          return {
            name: "disk-space",
            status: HealthStatus.DEGRADED,
            message: `Disk access issue: ${(error as Error).message}`,
            duration,
            timestamp: new Date(),
            details: {
              error: (error as Error).name,
              workingDirectory: process.cwd(),
            },
          };
        }
      },
    };
  }
}

/**
 * Health Check Manager - orchestrates all health checks
 */
export class HealthCheckManager {
  private checks: HealthCheck[] = [];
  private lastResults: Map<string, HealthCheckResult> = new Map();

  constructor() {
    this.registerDefaultChecks();
  }

  /**
   * Register default health checks
   */
  private registerDefaultChecks(): void {
    this.checks = [
      HealthChecks.iocContainer(),
      HealthChecks.advancedCache(),
      HealthChecks.sentimentEngine(),
      HealthChecks.memoryUsage(),
      HealthChecks.diskSpace(),
    ];
  }

  /**
   * Add custom health check
   */
  addCheck(check: HealthCheck): void {
    this.checks.push(check);
  }

  /**
   * Run single health check with timeout and retries
   */
  private async runHealthCheck(check: HealthCheck): Promise<HealthCheckResult> {
    const maxRetries = check.retries || 1;
    const timeout = check.timeout || 5000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Health check timeout")), timeout);
        });

        const result = await Promise.race([check.check(), timeoutPromise]);

        // Cache successful result
        this.lastResults.set(check.name, result);
        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          const failureResult: HealthCheckResult = {
            name: check.name,
            status: HealthStatus.UNHEALTHY,
            message: `Health check failed after ${maxRetries} attempts: ${(error as Error).message}`,
            duration: timeout,
            timestamp: new Date(),
            details: {
              attempts: maxRetries,
              lastError: (error as Error).name,
            },
          };

          this.lastResults.set(check.name, failureResult);
          return failureResult;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
      }
    }

    // This should never be reached due to the loop logic above
    throw new Error("Unexpected health check state");
  }

  /**
   * Run all health checks
   */
  async runAllChecks(): Promise<{
    status: HealthStatus;
    message: string;
    timestamp: Date;
    duration: number;
    checks: HealthCheckResult[];
    summary: {
      total: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
      critical: number;
    };
  }> {
    const startTime = performance.now();

    systemLogger.info("Starting comprehensive health check", {
      totalChecks: this.checks.length,
      criticalChecks: this.checks.filter((c) => c.critical).length,
    });

    // Run all checks in parallel
    const results = await Promise.all(
      this.checks.map((check) => this.runHealthCheck(check)),
    );

    const duration = performance.now() - startTime;

    // Calculate summary
    const summary = {
      total: results.length,
      healthy: results.filter((r) => r.status === HealthStatus.HEALTHY).length,
      degraded: results.filter((r) => r.status === HealthStatus.DEGRADED)
        .length,
      unhealthy: results.filter((r) => r.status === HealthStatus.UNHEALTHY)
        .length,
      critical: results.filter(
        (r) =>
          r.status === HealthStatus.UNHEALTHY &&
          this.checks.find((c) => c.name === r.name)?.critical,
      ).length,
    };

    // Determine overall status
    let overallStatus = HealthStatus.HEALTHY;
    let message = "All systems healthy";

    if (summary.critical > 0) {
      overallStatus = HealthStatus.UNHEALTHY;
      message = `${summary.critical} critical system(s) unhealthy`;
    } else if (summary.unhealthy > 0) {
      overallStatus = HealthStatus.DEGRADED;
      message = `${summary.unhealthy} system(s) unhealthy`;
    } else if (summary.degraded > 0) {
      overallStatus = HealthStatus.DEGRADED;
      message = `${summary.degraded} system(s) degraded`;
    }

    const result = {
      status: overallStatus,
      message,
      timestamp: new Date(),
      duration,
      checks: results,
      summary,
    };

    systemLogger.info("Health check completed", {
      status: overallStatus,
      duration: Math.round(duration),
      summary,
    });

    return result;
  }

  /**
   * Get cached health check results
   */
  getLastResults(): HealthCheckResult[] {
    return Array.from(this.lastResults.values());
  }

  /**
   * Get specific health check result
   */
  getLastResult(checkName: string): HealthCheckResult | undefined {
    return this.lastResults.get(checkName);
  }
}

// Export singleton instance
export const healthCheckManager = new HealthCheckManager();
