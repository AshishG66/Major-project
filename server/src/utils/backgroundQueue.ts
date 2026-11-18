import { logger } from '../config/logger.js';

export class NonRetryableError extends Error {
  public readonly isNonRetryable = true;
  constructor(message: string, public readonly cause?: any) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

export function isTransientError(err: any): boolean {
  if (!err) return false;
  if (err.isNonRetryable === true || err.name === 'NonRetryableError') return false;

  // Validation / bad request / schema errors are non-retryable
  if (err.name === 'ZodError' || err.name === 'ValidationError') return false;
  if (typeof err.status === 'number' && err.status >= 400 && err.status < 500 && err.status !== 429) return false;

  const message = String(err.message || '').toLowerCase();
  const code = String(err.code || '').toUpperCase();

  // Explicit non-retryable Prisma errors (e.g. unique constraint violation, foreign key violation, record not found)
  if (['P2002', 'P2003', 'P2025'].includes(code)) return false;

  // Transient Prisma codes:
  // P1001: Can't reach database server
  // P1002: The database server was reached but timed out
  // P1008: Operations timed out
  // P1017: Server has closed the connection
  // P2024: Timed out fetching a connection from the pool
  // P2034: Transaction failed due to a write conflict or a deadlock
  if (['P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'P2034'].includes(code)) return true;

  // Network & system socket codes
  if (['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT', 'ENETUNREACH'].includes(code)) return true;

  if (
    message.includes('timeout') ||
    message.includes('connection pool') ||
    message.includes("can't reach database") ||
    message.includes('connection terminated') ||
    message.includes('connection closed') ||
    message.includes('socket hung up') ||
    message.includes('deadlock') ||
    message.includes('lock wait timeout') ||
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('503') ||
    message.includes('temporarily unavailable')
  ) {
    return true;
  }

  // By default, unknown unexpected operational errors are treated as retryable up to bounded limit
  return true;
}

export interface BackgroundTaskOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
  isRetryable?: (err: any) => boolean;
  onError?: (err: any, attempt: number, exhausted: boolean) => void | Promise<void>;
  onSuccess?: () => void | Promise<void>;
}

export interface BackgroundTask {
  id: string;
  name: string;
  fn: () => Promise<void>;
  retries: number;
  maxRetries: number;
  initialBackoffMs: number;
  isRetryable?: (err: any) => boolean;
  onError?: (err: any, attempt: number, exhausted: boolean) => void | Promise<void>;
  onSuccess?: () => void | Promise<void>;
  createdAt: number;
}

export class BackgroundTaskQueue {
  private queue: BackgroundTask[] = [];
  private activeCount: number = 0;
  private maxConcurrency: number = 4;
  private isShuttingDown: boolean = false;
  private stats = {
    enqueued: 0,
    completed: 0,
    failed: 0,
    retried: 0,
  };

  constructor(maxConcurrency = 4) {
    this.maxConcurrency = maxConcurrency;
    // Graceful drain listener
    if (typeof process !== 'undefined') {
      const shutdown = async (signal: string) => {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        logger.info(`[BackgroundQueue] Graceful shutdown initiated on ${signal}. Draining ${this.queue.length} pending jobs...`);
        await this.drain(5000);
      };

      process.once('SIGTERM', () => shutdown('SIGTERM'));
      process.once('SIGINT', () => shutdown('SIGINT'));
    }
  }

  public enqueue(
    name: string,
    fn: () => Promise<void>,
    options?: BackgroundTaskOptions | number
  ): string {
    if (this.isShuttingDown) {
      const msg = `[BackgroundQueue] Task "${name}" rejected: queue is shutting down`;
      logger.warn(msg);
      throw new Error(msg);
    }

    const maxRetries = typeof options === 'number' ? options : (options?.maxRetries ?? 2);
    const initialBackoffMs = typeof options === 'object' ? (options.initialBackoffMs ?? 500) : 500;
    const isRetryable = typeof options === 'object' ? options.isRetryable : undefined;
    const onError = typeof options === 'object' ? options.onError : undefined;
    const onSuccess = typeof options === 'object' ? options.onSuccess : undefined;

    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const task: BackgroundTask = {
      id,
      name,
      fn,
      retries: 0,
      maxRetries,
      initialBackoffMs,
      isRetryable,
      onError,
      onSuccess,
      createdAt: Date.now(),
    };

    this.queue.push(task);
    this.stats.enqueued++;
    this.processNext();
    return id;
  }

  private processNext() {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.activeCount++;

    (async () => {
      try {
        await task.fn();
        this.stats.completed++;
        if (task.onSuccess) {
          try {
            await task.onSuccess();
          } catch (callbackErr: any) {
            logger.warn(`[BackgroundQueue] Task "${task.name}" (${task.id}) onSuccess callback failed: ${callbackErr.message}`);
          }
        }
      } catch (err: any) {
        const canRetry = task.retries < task.maxRetries;
        const retryable = task.isRetryable ? task.isRetryable(err) : isTransientError(err);

        if (canRetry && retryable) {
          task.retries++;
          this.stats.retried++;
          logger.warn(`[BackgroundQueue] Task "${task.name}" (${task.id}) transient failure (attempt ${task.retries}/${task.maxRetries}): ${err.message}. Retrying with backoff.`);
          if (task.onError) {
            try {
              await task.onError(err, task.retries, false);
            } catch (callbackErr: any) {
              logger.warn(`[BackgroundQueue] Task "${task.name}" (${task.id}) onError callback failed: ${callbackErr.message}`);
            }
          }
          const backoffDelay = task.initialBackoffMs * Math.pow(2, task.retries - 1);
          setTimeout(() => {
            this.queue.push(task);
            this.processNext();
          }, backoffDelay);
        } else {
          this.stats.failed++;
          const reason = !retryable ? 'non-retryable error' : `retry exhaustion after ${task.retries} retries`;
          logger.error(`[BackgroundQueue] Task "${task.name}" (${task.id}) permanently failed (${reason}): ${err.message}`);
          if (task.onError) {
            try {
              await task.onError(err, task.retries, true);
            } catch (callbackErr: any) {
              logger.warn(`[BackgroundQueue] Task "${task.name}" (${task.id}) onError callback failed: ${callbackErr.message}`);
            }
          }
        }
      } finally {
        this.activeCount--;
        this.processNext();
      }
    })();
  }

  public async drain(timeoutMs = 5000): Promise<void> {
    this.isShuttingDown = true;
    this.processNext();
    const start = Date.now();
    while ((this.activeCount > 0 || this.queue.length > 0) && (Date.now() - start) < timeoutMs) {
      await new Promise(r => setTimeout(r, 25));
    }
  }

  public getStats() {
    return {
      ...this.stats,
      pending: this.queue.length,
      active: this.activeCount,
      isShuttingDown: this.isShuttingDown,
    };
  }

  public resetForTesting(): void {
    this.queue = [];
    this.activeCount = 0;
    this.isShuttingDown = false;
    this.stats = {
      enqueued: 0,
      completed: 0,
      failed: 0,
      retried: 0,
    };
  }
}

export const backgroundQueue = new BackgroundTaskQueue();
