/**
 * Advanced Metrics Collection System
 * Real-time metrics collection, aggregation, and reporting
 * Phase 6.3: Observability and Metrics Implementation
 */

import { EventEmitter } from "events";
import { systemLogger } from "../observability/logger";

export enum MetricType {
  COUNTER = "counter",
  GAUGE = "gauge",
  HISTOGRAM = "histogram",
  SUMMARY = "summary",
}

export interface MetricValue {
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}

export interface MetricDefinition {
  name: string;
  type: MetricType;
  help: string;
  labels?: string[];
}

export interface HistogramBucket {
  le: number; // less than or equal
  count: number;
}

export interface HistogramValue extends MetricValue {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

export interface SummaryQuantile {
  quantile: number;
  value: number;
}

export interface SummaryValue extends MetricValue {
  quantiles: SummaryQuantile[];
  sum: number;
  count: number;
}

export interface MetricSnapshot {
  name: string;
  type: MetricType;
  help: string;
  values: MetricValue[];
  lastUpdated: Date;
}

export interface SystemMetrics {
  timestamp: Date;
  system: {
    memory: {
      used: number;
      free: number;
      total: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
    cpu: {
      loadAverage: number[];
      usage: number;
    };
    process: {
      uptime: number;
      pid: number;
      version: string;
    };
  };
  application: {
    requests: {
      total: number;
      rate: number;
      errors: number;
      errorRate: number;
    };
    cache: {
      hits: number;
      misses: number;
      hitRate: number;
      size: number;
    };
    sentiment: {
      analysisCount: number;
      averageLatency: number;
      errorCount: number;
    };
  };
}

/**
 * Core Metric implementation
 */
export class Metric extends EventEmitter {
  private definition: MetricDefinition;
  private values: Map<string, MetricValue[]> = new Map();
  private logger = systemLogger;

  constructor(definition: MetricDefinition) {
    super();
    this.definition = definition;
  }

  get name(): string {
    return this.definition.name;
  }

  get type(): MetricType {
    return this.definition.type;
  }

  get help(): string {
    return this.definition.help;
  }

  /**
   * Set metric value
   */
  set(value: number, labels?: Record<string, string>): void {
    const labelKey = this.generateLabelKey(labels);
    const metricValue: MetricValue = {
      value,
      timestamp: new Date(),
      labels,
    };

    if (!this.values.has(labelKey)) {
      this.values.set(labelKey, []);
    }

    this.values.get(labelKey)!.push(metricValue);

    // Keep only last 1000 values per label combination
    const values = this.values.get(labelKey)!;
    if (values.length > 1000) {
      values.splice(0, values.length - 1000);
    }

    this.emit("value", metricValue);
    this.logger.debug("Metric value set", {
      metric: this.name,
      value,
      labels,
    });
  }

  /**
   * Increment counter metric
   */
  inc(amount: number = 1, labels?: Record<string, string>): void {
    if (this.type !== MetricType.COUNTER) {
      throw new Error(`Cannot increment ${this.type} metric`);
    }

    const labelKey = this.generateLabelKey(labels);
    const currentValues = this.values.get(labelKey);
    const currentValue =
      currentValues && currentValues.length > 0
        ? currentValues[currentValues.length - 1].value
        : 0;

    this.set(currentValue + amount, labels);
  }

  /**
   * Observe value for histogram/summary metrics
   */
  observe(value: number, labels?: Record<string, string>): void {
    if (
      this.type !== MetricType.HISTOGRAM &&
      this.type !== MetricType.SUMMARY
    ) {
      throw new Error(`Cannot observe ${this.type} metric`);
    }

    this.set(value, labels);
  }

  /**
   * Get current metric value
   */
  getValue(labels?: Record<string, string>): number | undefined {
    const labelKey = this.generateLabelKey(labels);
    const values = this.values.get(labelKey);
    return values && values.length > 0
      ? values[values.length - 1].value
      : undefined;
  }

  /**
   * Get all values for a label combination
   */
  getValues(labels?: Record<string, string>): MetricValue[] {
    const labelKey = this.generateLabelKey(labels);
    return this.values.get(labelKey) || [];
  }

  /**
   * Get metric snapshot
   */
  getSnapshot(): MetricSnapshot {
    const allValues: MetricValue[] = [];
    for (const values of this.values.values()) {
      allValues.push(...values);
    }

    return {
      name: this.name,
      type: this.type,
      help: this.help,
      values: allValues,
      lastUpdated:
        allValues.length > 0
          ? new Date(Math.max(...allValues.map((v) => v.timestamp.getTime())))
          : new Date(),
    };
  }

  /**
   * Clear old values
   */
  clear(olderThan?: Date): void {
    const cutoff = olderThan || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    for (const [labelKey, values] of this.values.entries()) {
      const filteredValues = values.filter((v) => v.timestamp > cutoff);
      if (filteredValues.length === 0) {
        this.values.delete(labelKey);
      } else {
        this.values.set(labelKey, filteredValues);
      }
    }
  }

  /**
   * Reset metric to initial value
   */
  reset(): void {
    this.values.clear();
    this.logger.debug("Metric reset", { metric: this.name });
  }

  private generateLabelKey(labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return "__default__";
    }

    const sortedEntries = Object.entries(labels).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return sortedEntries.map(([key, value]) => `${key}=${value}`).join(",");
  }
}

/**
 * Metrics Registry - Central management of all metrics
 */
export class MetricsRegistry extends EventEmitter {
  private metrics: Map<string, Metric> = new Map();
  private logger = systemLogger;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    super();

    // Cleanup old metrics every hour
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      60 * 60 * 1000,
    );

    this.logger.info("Metrics registry initialized");
  }

  /**
   * Register a new metric
   */
  register(definition: MetricDefinition): Metric {
    if (this.metrics.has(definition.name)) {
      throw new Error(`Metric ${definition.name} already registered`);
    }

    const metric = new Metric(definition);
    this.metrics.set(definition.name, metric);

    // Forward metric events
    metric.on("value", (value) => {
      this.emit("metric_value", definition.name, value);
    });

    this.logger.info("Metric registered", {
      name: definition.name,
      type: definition.type,
    });

    return metric;
  }

  /**
   * Get metric by name
   */
  getMetric(name: string): Metric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get or create metric
   */
  getOrCreateMetric(definition: MetricDefinition): Metric {
    const existing = this.metrics.get(definition.name);
    if (existing) {
      return existing;
    }
    return this.register(definition);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, Metric> {
    return new Map(this.metrics);
  }

  /**
   * Get metrics snapshot
   */
  getSnapshot(): Record<string, MetricSnapshot> {
    const snapshot: Record<string, MetricSnapshot> = {};

    for (const [name, metric] of this.metrics.entries()) {
      snapshot[name] = metric.getSnapshot();
    }

    return snapshot;
  }

  /**
   * Remove metric
   */
  unregister(name: string): boolean {
    const metric = this.metrics.get(name);
    if (metric) {
      metric.removeAllListeners();
      this.metrics.delete(name);
      this.logger.info("Metric unregistered", { name });
      return true;
    }
    return false;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    for (const [name, metric] of this.metrics.entries()) {
      metric.removeAllListeners();
    }
    this.metrics.clear();
    this.logger.info("All metrics cleared");
  }

  /**
   * Reset a metric to its initial value
   */
  resetMetric(name: string): boolean {
    const metric = this.metrics.get(name);
    if (!metric) {
      return false;
    }

    metric.reset();
    this.logger.info("Metric reset", { metricName: name });
    return true;
  }

  /**
   * Reset all metrics
   */
  resetAllMetrics(): void {
    for (const [name, metric] of this.metrics) {
      metric.reset();
    }
    this.logger.info("All metrics reset");
  }

  /**
   * Cleanup old metric values
   */
  cleanup(olderThan?: Date): void {
    let cleanedCount = 0;
    for (const metric of this.metrics.values()) {
      metric.clear(olderThan);
      cleanedCount++;
    }

    this.logger.debug("Metrics cleanup completed", {
      metricsProcessed: cleanedCount,
      cutoff: olderThan || new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const process = require("process");
    const os = require("os");

    const memoryUsage = process.memoryUsage();
    const freeMem = os.freemem();
    const totalMem = os.totalmem();

    // Calculate application metrics from registered metrics
    const requestsTotal =
      this.getMetric("http_requests_total")?.getValue() || 0;
    const requestsErrors =
      this.getMetric("http_requests_errors_total")?.getValue() || 0;
    const cacheHits = this.getMetric("cache_hits_total")?.getValue() || 0;
    const cacheMisses = this.getMetric("cache_misses_total")?.getValue() || 0;
    const sentimentAnalysisCount =
      this.getMetric("sentiment_analysis_total")?.getValue() || 0;
    const sentimentErrors =
      this.getMetric("sentiment_analysis_errors_total")?.getValue() || 0;

    return {
      timestamp: new Date(),
      system: {
        memory: {
          used: totalMem - freeMem,
          free: freeMem,
          total: totalMem,
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
        },
        cpu: {
          loadAverage: os.loadavg(),
          usage: process.cpuUsage().user / 1000000, // Convert to seconds
        },
        process: {
          uptime: process.uptime(),
          pid: process.pid,
          version: process.version,
        },
      },
      application: {
        requests: {
          total: requestsTotal,
          rate: this.calculateRate("http_requests_total"),
          errors: requestsErrors,
          errorRate:
            requestsTotal > 0 ? (requestsErrors / requestsTotal) * 100 : 0,
        },
        cache: {
          hits: cacheHits,
          misses: cacheMisses,
          hitRate:
            cacheHits + cacheMisses > 0
              ? (cacheHits / (cacheHits + cacheMisses)) * 100
              : 0,
          size: this.getMetric("cache_size")?.getValue() || 0,
        },
        sentiment: {
          analysisCount: sentimentAnalysisCount,
          averageLatency: this.calculateAverage(
            "sentiment_analysis_duration_ms",
          ),
          errorCount: sentimentErrors,
        },
      },
    };
  }

  /**
   * Calculate rate per second for a metric
   */
  private calculateRate(metricName: string, windowMs: number = 60000): number {
    const metric = this.getMetric(metricName);
    if (!metric) return 0;

    const values = metric.getValues();
    if (values.length < 2) return 0;

    const now = Date.now();
    const windowStart = now - windowMs;
    const recentValues = values.filter(
      (v) => v.timestamp.getTime() > windowStart,
    );

    if (recentValues.length < 2) return 0;

    const earliest = recentValues[0];
    const latest = recentValues[recentValues.length - 1];
    const timeDiff =
      (latest.timestamp.getTime() - earliest.timestamp.getTime()) / 1000;
    const valueDiff = latest.value - earliest.value;

    return timeDiff > 0 ? valueDiff / timeDiff : 0;
  }

  /**
   * Calculate average value for a metric
   */
  private calculateAverage(
    metricName: string,
    windowMs: number = 300000,
  ): number {
    const metric = this.getMetric(metricName);
    if (!metric) return 0;

    const values = metric.getValues();
    if (values.length === 0) return 0;

    const now = Date.now();
    const windowStart = now - windowMs;
    const recentValues = values.filter(
      (v) => v.timestamp.getTime() > windowStart,
    );

    if (recentValues.length === 0) return 0;

    const sum = recentValues.reduce((acc, v) => acc + v.value, 0);
    return sum / recentValues.length;
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
    this.removeAllListeners();
    this.logger.info("Metrics registry destroyed");
  }
}

// Create global metrics registry
export const metricsRegistry = new MetricsRegistry();

// Register default metrics
export const defaultMetrics = {
  httpRequestsTotal: metricsRegistry.register({
    name: "http_requests_total",
    type: MetricType.COUNTER,
    help: "Total number of HTTP requests",
    labels: ["method", "status_code", "route"],
  }),

  httpRequestDuration: metricsRegistry.register({
    name: "http_request_duration_ms",
    type: MetricType.HISTOGRAM,
    help: "HTTP request duration in milliseconds",
    labels: ["method", "route"],
  }),

  httpRequestsErrors: metricsRegistry.register({
    name: "http_requests_errors_total",
    type: MetricType.COUNTER,
    help: "Total number of HTTP request errors",
    labels: ["method", "status_code", "route"],
  }),

  cacheHits: metricsRegistry.register({
    name: "cache_hits_total",
    type: MetricType.COUNTER,
    help: "Total number of cache hits",
    labels: ["cache_type"],
  }),

  cacheMisses: metricsRegistry.register({
    name: "cache_misses_total",
    type: MetricType.COUNTER,
    help: "Total number of cache misses",
    labels: ["cache_type"],
  }),

  cacheSize: metricsRegistry.register({
    name: "cache_size",
    type: MetricType.GAUGE,
    help: "Current cache size in bytes",
    labels: ["cache_type"],
  }),

  sentimentAnalysisTotal: metricsRegistry.register({
    name: "sentiment_analysis_total",
    type: MetricType.COUNTER,
    help: "Total number of sentiment analyses performed",
    labels: ["sentiment", "language"],
  }),

  sentimentAnalysisDuration: metricsRegistry.register({
    name: "sentiment_analysis_duration_ms",
    type: MetricType.HISTOGRAM,
    help: "Sentiment analysis duration in milliseconds",
    labels: ["language"],
  }),

  sentimentAnalysisErrors: metricsRegistry.register({
    name: "sentiment_analysis_errors_total",
    type: MetricType.COUNTER,
    help: "Total number of sentiment analysis errors",
    labels: ["error_type"],
  }),

  memoryUsage: metricsRegistry.register({
    name: "memory_usage_bytes",
    type: MetricType.GAUGE,
    help: "Memory usage in bytes",
    labels: ["type"],
  }),

  cpuUsage: metricsRegistry.register({
    name: "cpu_usage_percent",
    type: MetricType.GAUGE,
    help: "CPU usage percentage",
  }),
};

// Update system metrics periodically
setInterval(() => {
  const process = require("process");
  const os = require("os");

  const memUsage = process.memoryUsage();
  defaultMetrics.memoryUsage.set(memUsage.heapUsed, { type: "heap_used" });
  defaultMetrics.memoryUsage.set(memUsage.heapTotal, { type: "heap_total" });
  defaultMetrics.memoryUsage.set(memUsage.external, { type: "external" });
  defaultMetrics.memoryUsage.set(os.freemem(), { type: "free" });
  defaultMetrics.memoryUsage.set(os.totalmem(), { type: "total" });

  // Basic CPU usage approximation
  const cpuUsage = process.cpuUsage();
  defaultMetrics.cpuUsage.set(cpuUsage.user / 1000000); // Convert to seconds
}, 10000); // Every 10 seconds
