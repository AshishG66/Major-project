import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';

export interface AITelemetryParams {
  userId?: string;
  agentType: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  ragChunksUsed?: number;
  status: 'SUCCESS' | 'FAILED' | 'HALLUCINATION_FLAGGED';
  errorMessage?: string;
}

/**
 * Log an AI call to the telemetry table for observability tracking.
 * Runs asynchronously — does not block the main request pipeline.
 */
export async function trackAICall(params: AITelemetryParams): Promise<void> {
  try {
    await prisma.aITelemetryLog.create({
      data: {
        userId: params.userId || null,
        agentType: params.agentType,
        model: params.model,
        inputTokens: params.inputTokens || 0,
        outputTokens: params.outputTokens || 0,
        totalTokens: params.totalTokens || (params.inputTokens || 0) + (params.outputTokens || 0),
        latencyMs: params.latencyMs,
        ragChunksUsed: params.ragChunksUsed || 0,
        status: params.status,
        errorMessage: params.errorMessage || null,
      },
    });
    logger.debug(`[AITelemetry] Logged ${params.status} call: agent=${params.agentType}, model=${params.model}, latency=${params.latencyMs}ms, tokens=${params.totalTokens || 0}`);
  } catch (err: any) {
    // Telemetry should never crash the main pipeline
    logger.warn(`[AITelemetry] Failed to log telemetry: ${err.message}`);
  }
}

/**
 * Get aggregated AI telemetry stats for the admin dashboard.
 */
export async function getAITelemetryStats() {
  const [totalCalls, recentLogs, agentDistribution, dailyStats] = await Promise.all([
    // Total call count
    prisma.aITelemetryLog.count(),

    // Last 50 log entries
    prisma.aITelemetryLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        agentType: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        latencyMs: true,
        ragChunksUsed: true,
        status: true,
        errorMessage: true,
        createdAt: true,
      },
    }),

    // Agent type distribution
    prisma.aITelemetryLog.groupBy({
      by: ['agentType'],
      _count: { id: true },
    }),

    // Daily aggregated stats (last 14 days)
    prisma.$queryRaw<{ date: string; calls: bigint; avg_latency: number; total_tokens: bigint; failures: bigint }[]>`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*) as calls,
        AVG("latencyMs") as avg_latency,
        SUM("totalTokens") as total_tokens,
        COUNT(*) FILTER (WHERE status != 'SUCCESS') as failures
      FROM ai_telemetry_logs
      WHERE "createdAt" > NOW() - INTERVAL '14 days'
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `,
  ]);

  // Compute summary metrics
  const avgLatency = recentLogs.length > 0
    ? Math.round(recentLogs.reduce((s, l) => s + l.latencyMs, 0) / recentLogs.length)
    : 0;
  const totalTokensBurned = recentLogs.reduce((s, l) => s + l.totalTokens, 0);
  const failureRate = recentLogs.length > 0
    ? ((recentLogs.filter(l => l.status !== 'SUCCESS').length / recentLogs.length) * 100).toFixed(1)
    : '0';
  const avgRagQuality = recentLogs.length > 0
    ? (recentLogs.reduce((s, l) => s + l.ragChunksUsed, 0) / recentLogs.length).toFixed(1)
    : '0';

  return {
    totalCalls,
    avgLatencyMs: avgLatency,
    totalTokensBurned,
    failureRate: `${failureRate}%`,
    avgRagChunksPerCall: avgRagQuality,
    agentDistribution: agentDistribution.map(d => ({
      agent: d.agentType,
      count: d._count.id,
    })),
    dailyStats: dailyStats.map(d => ({
      date: d.date,
      calls: Number(d.calls),
      avgLatency: Math.round(d.avg_latency),
      totalTokens: Number(d.total_tokens),
      failures: Number(d.failures),
    })),
    recentLogs,
  };
}
