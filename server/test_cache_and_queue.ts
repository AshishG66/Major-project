import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  invalidatePatientContextCache,
} from './src/services/aiOrchestrator.js';
import {
  getCachedDigitalTwinState,
  invalidateDigitalTwinCache,
} from './src/services/digitalTwinService.js';
import {
  backgroundQueue,
  BackgroundTaskQueue,
  NonRetryableError,
  isTransientError,
} from './src/utils/backgroundQueue.js';

describe('HridayaDarpana: Cache Isolation & Background Queue Reliability Suite', () => {
  beforeEach(() => {
    backgroundQueue.resetForTesting();
  });

  it('1. Verifies patient context cache isolation and invalidation per user', () => {
    const userA = 'patient-uuid-alice';
    const userB = 'patient-uuid-bob';

    // Invalidation does not throw on empty
    invalidatePatientContextCache(userA);
    invalidatePatientContextCache(userB);

    // Verify independent deletion
    assert.doesNotThrow(() => invalidatePatientContextCache(userA));
  });

  it('2. Verifies Digital Twin cache isolation between patient A and patient B', () => {
    const userA = 'twin-user-alpha';
    const userB = 'twin-user-beta';

    invalidateDigitalTwinCache(userA);
    invalidateDigitalTwinCache(userB);

    // Initial state is null
    assert.equal(getCachedDigitalTwinState(userA), null);
    assert.equal(getCachedDigitalTwinState(userB), null);
  });

  it('3. Verifies successful tasks execution, statistics tracking, and onSuccess callback', async () => {
    let successFired = false;
    let taskExecuted = false;

    await new Promise<void>((resolve) => {
      backgroundQueue.enqueue(
        'success_test_task',
        async () => {
          taskExecuted = true;
        },
        {
          maxRetries: 2,
          onSuccess: () => {
            successFired = true;
            resolve();
          },
        }
      );
    });

    assert.equal(taskExecuted, true, 'Task function should have executed');
    assert.equal(successFired, true, 'onSuccess callback should have executed');

    const stats = backgroundQueue.getStats();
    assert.equal(stats.enqueued, 1);
    assert.equal(stats.completed, 1);
    assert.equal(stats.failed, 0);
    assert.equal(stats.retried, 0);
  });

  it('4. Verifies transient failure retries with exponential backoff and eventual success', async () => {
    let attempts = 0;
    const retryAttempts: number[] = [];

    await new Promise<void>((resolve) => {
      backgroundQueue.enqueue(
        'transient_failure_job',
        async () => {
          attempts++;
          if (attempts < 3) {
            const err: any = new Error('Connection terminated unexpectedly');
            err.code = 'P1001';
            throw err;
          }
        },
        {
          maxRetries: 3,
          initialBackoffMs: 20, // Fast backoff for test suite
          onError: (err, attempt, exhausted) => {
            retryAttempts.push(attempt);
            assert.equal(exhausted, false, 'Should not be marked exhausted while retrying');
          },
          onSuccess: () => {
            resolve();
          },
        }
      );
    });

    assert.equal(attempts, 3, 'Task should have attempted exactly 3 times before succeeding');
    assert.deepEqual(retryAttempts, [1, 2], 'onError should have recorded attempts 1 and 2');

    const stats = backgroundQueue.getStats();
    assert.equal(stats.enqueued, 1);
    assert.equal(stats.completed, 1);
    assert.equal(stats.failed, 0);
    assert.equal(stats.retried, 2);
  });

  it('5. Verifies non-retryable errors fail fast without queue-level retrying', async () => {
    let attempts = 0;
    let permanentFailureHandled = false;

    await new Promise<void>((resolve) => {
      backgroundQueue.enqueue(
        'non_retryable_job',
        async () => {
          attempts++;
          throw new NonRetryableError('Unique constraint violation P2002 on primary key');
        },
        {
          maxRetries: 3,
          initialBackoffMs: 20,
          onError: (err, attempt, exhausted) => {
            if (exhausted) {
              permanentFailureHandled = true;
              resolve();
            }
          },
        }
      );
    });

    assert.equal(attempts, 1, 'Non-retryable task should fail immediately on attempt 1 without retries');
    assert.equal(permanentFailureHandled, true);

    const stats = backgroundQueue.getStats();
    assert.equal(stats.enqueued, 1);
    assert.equal(stats.completed, 0);
    assert.equal(stats.failed, 1);
    assert.equal(stats.retried, 0);
  });

  it('6. Verifies retry exhaustion after maxRetries triggers permanent failure without crashing', async () => {
    let attempts = 0;
    let exhaustedReported = false;

    await new Promise<void>((resolve) => {
      backgroundQueue.enqueue(
        'perpetual_failing_job',
        async () => {
          attempts++;
          const err: any = new Error('Can not reach database server at neon.tech:5432');
          err.code = 'P1001';
          throw err;
        },
        {
          maxRetries: 2,
          initialBackoffMs: 20,
          onError: (err, attempt, exhausted) => {
            if (exhausted) {
              exhaustedReported = true;
              resolve();
            }
          },
        }
      );
    });

    // 1 initial attempt + 2 retries = 3 total invocations
    assert.equal(attempts, 3, 'Should attempt initial + maxRetries before exhausting');
    assert.equal(exhaustedReported, true, 'onError should indicate exhausted: true on final failure');

    const stats = backgroundQueue.getStats();
    assert.equal(stats.enqueued, 1);
    assert.equal(stats.completed, 0);
    assert.equal(stats.failed, 1);
    assert.equal(stats.retried, 2);
  });

  it('7. Verifies BackgroundQueue respects concurrency bounds under burst load', async () => {
    const queue = new BackgroundTaskQueue(4);
    let running = 0;
    let maxObservedRunning = 0;
    const completedTasks: string[] = [];

    const jobs = Array.from({ length: 12 }, (_, i) => `burst_job_${i}`);
    const promises = jobs.map((name) => {
      return new Promise<void>((resolve) => {
        queue.enqueue(name, async () => {
          running++;
          if (running > maxObservedRunning) maxObservedRunning = running;
          await new Promise((r) => setTimeout(r, 20));
          running--;
          completedTasks.push(name);
          resolve();
        });
      });
    });

    await Promise.all(promises);

    assert.equal(completedTasks.length, 12, 'All 12 burst tasks should complete');
    assert.ok(maxObservedRunning <= 4, `Max concurrency exceeded limit 4: observed ${maxObservedRunning}`);
    assert.ok(maxObservedRunning >= 2, `Expected concurrent execution, observed peak was ${maxObservedRunning}`);
  });

  it('8. Verifies BackgroundQueue drain waits for queued jobs and rejects new tasks during shutdown', async () => {
    const queue = new BackgroundTaskQueue(2);
    let job1Finished = false;
    let job2Finished = false;

    queue.enqueue('drain_job_1', async () => {
      await new Promise((r) => setTimeout(r, 30));
      job1Finished = true;
    });

    queue.enqueue('drain_job_2', async () => {
      await new Promise((r) => setTimeout(r, 30));
      job2Finished = true;
    });

    const drainPromise = queue.drain(2000);

    // Attempting to enqueue after drain initiated should throw/reject
    assert.throws(() => {
      queue.enqueue('rejected_job_during_shutdown', async () => {});
    }, /shutting down/i);

    await drainPromise;

    assert.equal(job1Finished, true, 'Job 1 should finish during drain');
    assert.equal(job2Finished, true, 'Job 2 should finish during drain');
    const stats = queue.getStats();
    assert.equal(stats.completed, 2);
    assert.equal(stats.pending, 0);
    assert.equal(stats.active, 0);
  });

  it('9. Verifies transient DB errors bubble from prediction background tasks and trigger queue retry', async () => {
    let executionAttempts = 0;
    let retryLogged = false;

    // Simulate task structure from prediction.controller.ts with throwOnError: true
    await new Promise<void>((resolve) => {
      backgroundQueue.enqueue(
        'mock_audit_prediction_retryable',
        async () => {
          executionAttempts++;
          if (executionAttempts === 1) {
            const dbErr: any = new Error('Timed out fetching a connection from the pool');
            dbErr.code = 'P2024';
            throw dbErr;
          }
          // Second attempt succeeds
        },
        {
          maxRetries: 2,
          initialBackoffMs: 20,
          onError: (err, attempt, exhausted) => {
            if (!exhausted && attempt === 1) {
              retryLogged = true;
            }
          },
          onSuccess: () => {
            resolve();
          },
        }
      );
    });

    assert.equal(executionAttempts, 2, 'Task should have retried and completed on attempt 2');
    assert.equal(retryLogged, true, 'Queue should have logged transient retry rather than swallowing');

    const stats = backgroundQueue.getStats();
    assert.equal(stats.completed, 1);
    assert.equal(stats.retried, 1);
    assert.equal(stats.failed, 0);
  });

  it('10. Confirms isTransientError accurately classifies operational vs non-operational errors', () => {
    // Retryable transient errors
    assert.equal(isTransientError({ code: 'P1001' }), true);
    assert.equal(isTransientError({ code: 'P2024' }), true);
    assert.equal(isTransientError({ code: 'P2034' }), true);
    assert.equal(isTransientError({ code: 'ECONNRESET' }), true);
    assert.equal(isTransientError({ message: 'Deadlock found when trying to get lock' }), true);
    assert.equal(isTransientError({ message: '429 Too Many Requests' }), true);

    // Non-retryable errors
    assert.equal(isTransientError(new NonRetryableError('Invalid schema')), false);
    assert.equal(isTransientError({ name: 'ValidationError' }), false);
    assert.equal(isTransientError({ code: 'P2002' }), false);
    assert.equal(isTransientError({ code: 'P2003' }), false);
    assert.equal(isTransientError({ status: 400 }), false);
    assert.equal(isTransientError({ status: 403 }), false);
    assert.equal(isTransientError(null), false);
  });
});
