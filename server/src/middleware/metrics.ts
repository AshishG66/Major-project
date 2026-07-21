import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

// ─── In-Memory Prometheus-Compatible Metrics Registry ───
// Lightweight implementation without prom-client dependency for portability

interface MetricEntry {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram';
  values: Map<string, number>;
  buckets?: number[];
  bucketValues?: Map<string, Map<string, number>>;
}

class MetricsRegistry {
  private metrics = new Map<string, MetricEntry>();
  private startTime = Date.now();

  counter(name: string, help: string): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { name, help, type: 'counter', values: new Map() });
    }
  }

  gauge(name: string, help: string): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { name, help, type: 'gauge', values: new Map() });
    }
  }

  histogram(name: string, help: string, buckets: number[]): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name, help, type: 'histogram',
        values: new Map(),
        buckets,
        bucketValues: new Map(),
      });
    }
  }

  inc(name: string, labels: Record<string, string> = {}, value = 1): void {
    const metric = this.metrics.get(name);
    if (!metric) return;
    const key = this.labelsToKey(labels);
    metric.values.set(key, (metric.values.get(key) || 0) + value);
  }

  set(name: string, labels: Record<string, string>, value: number): void {
    const metric = this.metrics.get(name);
    if (!metric) return;
    const key = this.labelsToKey(labels);
    metric.values.set(key, value);
  }

  observe(name: string, labels: Record<string, string>, value: number): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'histogram') return;
    
    const key = this.labelsToKey(labels);
    // Track sum and count
    const sumKey = `${key}_sum`;
    const countKey = `${key}_count`;
    metric.values.set(sumKey, (metric.values.get(sumKey) || 0) + value);
    metric.values.set(countKey, (metric.values.get(countKey) || 0) + 1);

    // Track buckets
    if (metric.buckets) {
      if (!metric.bucketValues) metric.bucketValues = new Map();
      if (!metric.bucketValues.has(key)) {
        metric.bucketValues.set(key, new Map());
      }
      const bucketMap = metric.bucketValues.get(key)!;
      for (const b of metric.buckets) {
        const bKey = `${b}`;
        if (value <= b) {
          bucketMap.set(bKey, (bucketMap.get(bKey) || 0) + 1);
        }
      }
    }
  }

  /**
   * Serialize all metrics in Prometheus exposition format.
   */
  serialize(): string {
    const lines: string[] = [];
    
    // Add process metrics
    const uptimeSeconds = Math.round((Date.now() - this.startTime) / 1000);
    const memUsage = process.memoryUsage();
    
    lines.push(`# HELP process_uptime_seconds Total uptime in seconds`);
    lines.push(`# TYPE process_uptime_seconds gauge`);
    lines.push(`process_uptime_seconds ${uptimeSeconds}`);
    lines.push('');
    
    lines.push(`# HELP process_resident_memory_bytes Resident memory size in bytes`);
    lines.push(`# TYPE process_resident_memory_bytes gauge`);
    lines.push(`process_resident_memory_bytes ${memUsage.rss}`);
    lines.push('');
    
    lines.push(`# HELP process_heap_used_bytes Heap used in bytes`);
    lines.push(`# TYPE process_heap_used_bytes gauge`);
    lines.push(`process_heap_used_bytes ${memUsage.heapUsed}`);
    lines.push('');

    for (const metric of this.metrics.values()) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);
      
      if (metric.type === 'histogram' && metric.bucketValues) {
        for (const [labelKey, bucketMap] of metric.bucketValues) {
          const labelStr = labelKey ? `{${labelKey}}` : '';
          for (const [bucket, count] of bucketMap) {
            lines.push(`${metric.name}_bucket{le="${bucket}"${labelKey ? ',' + labelKey : ''}} ${count}`);
          }
          lines.push(`${metric.name}_bucket{le="+Inf"${labelKey ? ',' + labelKey : ''}} ${metric.values.get(`${labelKey}_count`) || 0}`);
          lines.push(`${metric.name}_sum{${labelKey}} ${metric.values.get(`${labelKey}_sum`) || 0}`);
          lines.push(`${metric.name}_count{${labelKey}} ${metric.values.get(`${labelKey}_count`) || 0}`);
        }
      } else {
        for (const [labelKey, value] of metric.values) {
          const labelStr = labelKey ? `{${labelKey}}` : '';
          lines.push(`${metric.name}${labelStr} ${value}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private labelsToKey(labels: Record<string, string>): string {
    return Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',');
  }
}

// Global singleton
export const registry = new MetricsRegistry();

// Register standard metrics
registry.counter('http_requests_total', 'Total number of HTTP requests');
registry.histogram('http_request_duration_seconds', 'HTTP request duration in seconds', [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]);
registry.counter('ai_calls_total', 'Total number of AI model calls');
registry.histogram('ai_call_duration_seconds', 'AI call duration in seconds', [0.5, 1, 2, 5, 10, 30]);
registry.gauge('websocket_connections_active', 'Number of active WebSocket connections');

/**
 * Express middleware to track HTTP request metrics.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = performance.now();
  
  res.on('finish', () => {
    const durationMs = performance.now() - start;
    const durationSec = durationMs / 1000;
    
    // Normalize route path (strip IDs for cardinality control)
    const route = normalizeRoute(req.route?.path || req.path);
    const method = req.method;
    const status = res.statusCode.toString();

    registry.inc('http_requests_total', { method, route, status });
    registry.observe('http_request_duration_seconds', { method, route }, durationSec);
  });

  next();
}

function normalizeRoute(path: string): string {
  // Replace UUIDs and numeric IDs with :id placeholder
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+/g, '/:id');
}
